"""Build only rough finds. Blender Z up -> glTF Y up; centred mesh data.
Usage: blender -b --factory-startup --python build_finds.py -- ABS_OUTPUT_DIR
No tools, crystal points, or shared Blender scene are touched.
"""
import bpy
import bmesh
import math
import os
import random
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
out = os.path.abspath(args[0])
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)


def hull(name, points):
    bm = bmesh.new()
    for p in points:
        bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=list(bm.verts))
    bmesh.ops.dissolve_limit(bm, angle_limit=0.012, verts=list(bm.verts), edges=list(bm.edges))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def rings(outline, profile, rng):
    # Slightly unequal crystal faces and an offset termination, not random
    # per-triangle noise. The large faces remain readable under moving light.
    widths = [rng.uniform(0.94, 1.06) for _ in outline]
    skew = rng.uniform(-0.065, 0.065)
    return [(x * r * w + skew * z, y * r * w, z)
            for z, r in profile for (x, y), w in zip(outline, widths)]


def make_find(kind, variant):
    rng = random.Random(3107 + variant * 127 + sum(ord(c) for c in kind))
    sides = 6 if kind == 'sapphire' else 4
    outline = [(math.cos(i * math.tau / sides), math.sin(i * math.tau / sides)) for i in range(sides)]
    if kind == 'sapphire':
        points = rings(outline, [(-0.5, .24), (-.32, .47), (.14, .46), (.38, .34), (.5, .18)], rng)
    elif kind == 'zircon':
        points = rings(outline, [(-.62, .08), (-.29, .39), (.28, .39), (.59, .09)], rng)
    elif kind == 'topaz':
        outline = [(-.29, -.27), (.29, -.27), (.4, -.16), (.4, .16), (.29, .27), (-.29, .27), (-.4, .16), (-.4, -.16)]
        points = rings(outline, [(-.56, .85), (-.43, 1), (.29, 1), (.53, .57)], rng)
    elif kind in ('spinel', 'scheelite'):
        radius = .59 if kind == 'spinel' else .64
        points = [(radius, 0, 0), (-radius, 0, .03), (0, radius, 0), (0, -radius, -.04), (.04, 0, radius), (-.03, .02, -radius)]
        if kind == 'scheelite':
            points = [(x, y, z * 1.3) for x, y, z in points]
    elif kind == 'garnet':
        points = [(x * .32, y * .32, z * .32) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
        points += [(x * .64, y * .64, z * .64) for x, y, z in [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]]
    else:  # Conchoidal, broad opal chip; colour is provided by the game.
        outline = [(math.cos(i * math.tau / 7), math.sin(i * math.tau / 7) * .75) for i in range(7)]
        points = rings(outline, [(-.28, .45), (-.08, .65), (.19, .57), (.32, .26)], rng)
    stretch = (1 + variant * .05, 1 - variant * .055, 1 + (variant - 1) * .13)
    points = [(x * stretch[0], y * stretch[1], z * stretch[2]) for x, y, z in points]
    obj = hull(f'{kind}_{variant}', points)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    # A couple of old fractures truncate corners; the rest keep their habit.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for _ in range(1 + variant):
        n = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized()
        support = max(v.co.dot(n) for v in bm.verts)
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=0.00001,
                              plane_co=n * support * rng.uniform(.83, .93), plane_no=n, clear_outer=True)
        boundary = [e for e in bm.edges if e.is_boundary]
        if boundary:
            bmesh.ops.holes_fill(bm, edges=boundary, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    bevel = obj.modifiers.new('Creek-worn edges', 'BEVEL')
    bevel.width = .018 + variant * .011 if kind != 'opal' else .045
    bevel.segments = 3
    bevel.affect = 'EDGES'
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    # Smooth the small bevels; weighted corner normals preserve broad faces.
    for poly in obj.data.polygons:
        poly.use_smooth = True
    normals = obj.modifiers.new('Broad crystal faces', 'WEIGHTED_NORMAL')
    normals.weight = 35
    bpy.ops.object.modifier_apply(modifier=normals.name)
    obj.select_set(False)
    return obj

objects = [make_find(kind, variant) for kind in ('sapphire', 'zircon', 'spinel', 'garnet', 'topaz', 'scheelite', 'opal') for variant in range(3)]
for obj in objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'finds.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_materials='NONE')
for obj in objects:
    print(f'{obj.name}: {len(obj.data.vertices)} vertices, {len(obj.data.polygons)} faces')
print('Exported', os.path.join(out, 'finds.glb'))
