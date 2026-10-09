"""Build the gear and camp props (detector, pan, sieve, sluice, ute, tent) as GLB.

Run headless:
  blender -b --factory-startup --python blender/build_props.py -- <out_dir> [preview_dir]

Blender is Z up; the glTF exporter converts to three.js Y up, so a Blender
point (x, y, z) lands at three.js (x, z, -y). Each model is built in the same
local frame as the procedural shape it replaces in the game, noted per model.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/models")
PREVIEW = os.path.abspath(argv[1]) if len(argv) > 1 else None
os.makedirs(OUT, exist_ok=True)

MATS = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()


def mat(name, color, metallic=0.0, roughness=0.5):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*color, 1.0)
    m.metallic = metallic
    m.roughness = roughness
    MATS[name] = m
    return m


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def from_bm(name, bm, material=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    if material:
        ob.data.materials.append(material)
    for p in ob.data.polygons:
        p.use_smooth = smooth
    return ob


def box(name, size, loc, material, rot=(0, 0, 0), bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, affect="EDGES")
    ob = from_bm(name, bm, material, smooth=False)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def tube(name, a, b, r1, r2=None, material=None, verts=16, smooth=True):
    """Cylinder from point a to point b."""
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r1, radius2=r2 if r2 is not None else r1, depth=(b - a).length)
    ob = from_bm(name, bm, material, smooth=smooth)
    ob.location = (a + b) / 2
    ob.rotation_euler = Vector((0, 0, 1)).rotation_difference((b - a).normalized()).to_euler()
    return ob


def lathe(name, profile, material, segments=48, smooth=True):
    """Revolve (radius, z) points around Z."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r == 0:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((math.cos(math.tau * i / segments) * r, math.sin(math.tau * i / segments) * r, z)) for i in range(segments)])
    for r0, r1 in zip(rings, rings[1:]):
        if len(r0) == 1:
            for i in range(segments):
                bm.faces.new((r0[0], r1[i], r1[(i + 1) % segments]))
        elif len(r1) == 1:
            for i in range(segments):
                bm.faces.new((r0[i], r1[0], r0[(i + 1) % segments]))
        else:
            for i in range(segments):
                j = (i + 1) % segments
                bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return from_bm(name, bm, material, smooth=smooth)


def torus(name, R, r, loc, material, scale=(1, 1, 1), rot=(0, 0, 0), major=48, minor=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=major, minor_segments=minor, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.scale = scale
    ob.data.materials.append(material)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def cyl(name, r, depth, loc, material, rot=(0, 0, 0), verts=24, scale=(1, 1, 1), smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    ob.data.materials.append(material)
    for p in ob.data.polygons:
        p.use_smooth = smooth
    return ob


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    return ob


def set_origin(ob, p):
    """Move an object's origin to p without moving its geometry."""
    bpy.context.scene.cursor.location = p
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")


def export(objs, filename):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, filename), export_format="GLB",
                              use_selection=True, export_apply=True, export_yup=True)


def preview(name, cam_pos, target, lens=50):
    if not PREVIEW:
        return
    os.makedirs(PREVIEW, exist_ok=True)
    scene = bpy.context.scene
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cam = link(bpy.data.objects.new("cam", cd))
    cam.location = cam_pos
    cam.rotation_euler = (Vector(target) - Vector(cam_pos)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_cavity = True
    scene.display.shading.show_shadows = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 560
    scene.render.filepath = os.path.join(PREVIEW, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


# ---------------------------------------------------------------- detector
# Viewmodel frame: origin = control box. The game draws the coil centre at
# three (-0.16, -0.5, -1.05), i.e. Blender (-0.16, 1.05, -0.5).
# Objects named "coil_ring" and "screen" get live materials in the game.

def detector():
    yellow = mat("det_yellow", (0.85, 0.6, 0.08), roughness=0.45)
    black = mat("det_black", (0.04, 0.04, 0.045), roughness=0.55)
    carbon = mat("carbon", (0.07, 0.07, 0.08), metallic=0.3, roughness=0.3)
    alloy = mat("alloy", (0.62, 0.64, 0.66), metallic=1.0, roughness=0.3)
    foam = mat("foam", (0.08, 0.08, 0.08), roughness=0.95)
    lcd = mat("lcd", (0.05, 0.16, 0.08), roughness=0.2)
    glow = mat("glow", (0.2, 0.2, 0.2), roughness=0.4)
    parts = []
    # Control box with a sloped display face.
    parts.append(box("box", (0.075, 0.15, 0.055), (0, 0.0, 0.0), yellow, bevel=0.008))
    parts.append(box("lid", (0.068, 0.07, 0.012), (0, -0.02, 0.033), black, rot=(0.35, 0, 0), bevel=0.003))
    for i, x in enumerate((-0.018, 0.0, 0.018)):
        parts.append(cyl(f"knob{i}", 0.006, 0.01, (x, 0.05, 0.03), black, verts=12))
    # Grip under the box, and the armrest stub heading back toward you.
    parts.append(tube("grip", (0, -0.03, -0.035), (0, -0.16, -0.03), 0.018, 0.016, foam))
    parts.append(tube("arm", (0, -0.16, -0.03), (0, -0.3, 0.0), 0.012, 0.012, carbon))
    # Shafts: carbon upper, alloy lower, a cam-lock collar between.
    coil = Vector((-0.16, 1.05, -0.5))
    start = Vector((0, 0.07, -0.015))
    mid = start + (coil - start) * 0.52
    attach = coil + Vector((0.0, -0.04, 0.06))
    parts.append(tube("upper", start, mid, 0.013, 0.012, carbon))
    parts.append(tube("collar", mid - (coil - start).normalized() * 0.02, mid + (coil - start).normalized() * 0.02, 0.016, 0.016, black))
    parts.append(tube("lower", mid, attach, 0.0105, 0.0105, alloy))
    # Coil cable spiralling down the shaft.
    axis = (attach - start)
    d = axis.normalized()
    side = d.cross(Vector((0, 0, 1))).normalized()
    up = side.cross(d).normalized()
    pts = []
    turns = 9
    for k in range(200):
        t = k / 199
        a = t * turns * math.tau
        pts.append(start + axis * t + (side * math.cos(a) + up * math.sin(a)) * 0.019)
    cd = bpy.data.curves.new("cable", "CURVE")
    cd.dimensions = "3D"
    cd.bevel_depth = 0.0025
    sp = cd.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (v.x, v.y, v.z, 1)
    cable = link(bpy.data.objects.new("cable", cd))
    cable.data.materials.append(black)
    bpy.context.view_layer.objects.active = cable
    cable.select_set(True)
    bpy.ops.object.convert(target="MESH")
    parts.append(bpy.context.view_layer.objects.active)
    # Yoke bracket onto the coil.
    for x in (-0.018, 0.018):
        parts.append(box(f"yoke{x}", (0.006, 0.05, 0.05), (coil.x + x, coil.y - 0.03, coil.z + 0.035), black))
    parts.append(tube("bolt", (coil.x - 0.026, coil.y - 0.03, coil.z + 0.045), (coil.x + 0.026, coil.y - 0.03, coil.z + 0.045), 0.006, 0.006, alloy))
    # Elliptical DD coil with an open centre and a skid plate.
    housing = torus("coil_housing", 1.0, 0.16, (coil.x, coil.y, coil.z), black, scale=(0.15, 0.115, 0.1), major=48, minor=10)
    spine = box("spine", (0.02, 0.22, 0.02), (coil.x, coil.y, coil.z), black)
    skid = cyl("skid", 1.0, 0.006, (coil.x, coil.y, coil.z - 0.014), black, scale=(0.16, 0.125, 1), verts=40)
    body = join(parts, "detector")
    # The coil is its own part, pivoting on the yoke bolt like the real thing,
    # so the game can keep it flat to the ground whichever way you look.
    head = join([housing, spine, skid], "coil")
    # Live parts stay separate so the game can drive them.
    ring = torus("coil_ring", 1.0, 0.06, (coil.x, coil.y, coil.z + 0.016), glow, scale=(0.15, 0.115, 0.1), major=48, minor=6)
    pivot = Vector((coil.x, coil.y - 0.03, coil.z + 0.045))
    set_origin(head, pivot)
    set_origin(ring, pivot)
    screen = box("screen", (0.052, 0.034, 0.002), (0, -0.02, 0.04), lcd, rot=(0.35, 0, 0))
    return [body, head, ring, screen]


# ---------------------------------------------------------------- gold pan
# Lathe frame matches the game's pan: bottom centre at the origin, rim radius 0.24.

def gold_pan():
    green = mat("pan_green", (0.13, 0.27, 0.14), roughness=0.5)
    prof = [(0.0, 0.0), (0.12, 0.0), (0.135, 0.004), (0.15, 0.012), (0.2, 0.043), (0.225, 0.058),
            (0.238, 0.062), (0.244, 0.058), (0.24, 0.054), (0.222, 0.052), (0.198, 0.038), (0.148, 0.008), (0.122, 0.003), (0.0, 0.003)]
    pan = lathe("pan", prof, green, segments=64)
    # Three riffle ridges on one side of the wall, where you trap the gold.
    riffles = []
    for k, (r, z) in enumerate(((0.165, 0.023), (0.18, 0.031), (0.195, 0.04))):
        bm = bmesh.new()
        segs = 24
        a0, a1 = math.radians(-70), math.radians(70)
        ring_in, ring_out = [], []
        for i in range(segs + 1):
            a = a0 + (a1 - a0) * i / segs
            ring_in.append(bm.verts.new((math.cos(a) * (r - 0.004), math.sin(a) * (r - 0.004), z + 0.006)))
            ring_out.append(bm.verts.new((math.cos(a) * (r + 0.003), math.sin(a) * (r + 0.003), z + 0.001)))
        for i in range(segs):
            bm.faces.new((ring_in[i], ring_in[i + 1], ring_out[i + 1], ring_out[i]))
        riffles.append(from_bm(f"riffle{k}", bm, green, smooth=True))
    return [join([pan] + riffles, "gold_pan")]


# ---------------------------------------------------------------- gem sieve
# Matches the game's sieve: hoop radius 0.21, 0.07 tall, centred at the origin.

def gem_sieve():
    wood = mat("sieve_wood", (0.5, 0.36, 0.22), roughness=0.7)
    band = mat("sieve_band", (0.55, 0.57, 0.58), metallic=1.0, roughness=0.35)
    rope = mat("sieve_rope", (0.6, 0.52, 0.36), roughness=0.95)
    prof = [(0.214, -0.035), (0.214, 0.035), (0.2, 0.035), (0.2, -0.035), (0.214, -0.035)]
    hoop = lathe("hoop", prof, wood, segments=64, smooth=False)
    b1 = lathe("band_top", [(0.2155, 0.022), (0.2155, 0.033), (0.213, 0.033), (0.213, 0.022), (0.2155, 0.022)], band, segments=64)
    b2 = lathe("band_bot", [(0.2155, -0.033), (0.2155, -0.022), (0.213, -0.022), (0.213, -0.033), (0.2155, -0.033)], band, segments=64)
    handles = []
    for s in (1, -1):
        handles.append(torus(f"handle{s}", 0.03, 0.006, (s * 0.24, 0, 0), rope, rot=(math.pi / 2, 0, math.pi / 2)))
    return [join([hoop, b1, b2] + handles, "gem_sieve")]


# ---------------------------------------------------------------- sluice
# Matches the game's sluice: trough 0.34 wide, 1.6 long along three.js z with
# the head at -z (Blender +y), floor at the origin.

def sluice():
    alu = mat("alu", (0.72, 0.74, 0.76), metallic=1.0, roughness=0.38)
    matting = mat("matting", (0.12, 0.22, 0.14), roughness=0.95)
    expanded = mat("expanded", (0.4, 0.42, 0.44), metallic=1.0, roughness=0.5)
    parts = [box("floor", (0.34, 1.6, 0.006), (0, 0, 0.003), alu)]
    for x in (-0.17, 0.17):
        parts.append(box(f"side{x}", (0.006, 1.6, 0.15), (x, 0, 0.075), alu))
        parts.append(box(f"lip{x}", (0.025, 1.6, 0.004), (x + (0.01 if x > 0 else -0.01), 0, 0.15), alu))
    # Flared head catches more water.
    for s in (1, -1):
        parts.append(box(f"flare{s}", (0.006, 0.38, 0.15), (s * 0.255, 0.95, 0.075), alu, rot=(0, 0, s * 0.5)))
    parts.append(box("headfloor", (0.52, 0.32, 0.006), (0, 0.95, 0.003), alu))
    # Matting under expanded metal, then angle-iron (Hungarian) riffles.
    parts.append(box("matting", (0.32, 1.32, 0.01), (0, -0.08, 0.011), matting))
    parts.append(box("expanded", (0.32, 1.32, 0.004), (0, -0.08, 0.019), expanded))
    for i in range(9):
        y = 0.52 - i * 0.15
        parts.append(box(f"rifA{i}", (0.32, 0.004, 0.032), (0, y, 0.035), alu, rot=(0.45, 0, 0)))
        parts.append(box(f"rifB{i}", (0.32, 0.022, 0.004), (0, y - 0.008, 0.05), alu, rot=(0.45, 0, 0)))
    # Adjustable legs at the tail.
    for x in (-0.15, 0.15):
        parts.append(tube(f"leg{x}", (x, -0.72, 0.0), (x, -0.72, -0.12), 0.008, 0.008, alu, verts=10))
    return [join(parts, "sluice")]


# ---------------------------------------------------------------- ute
# Matches the game's ute group: length along x (front/cab at +x), width along
# three.js z (Blender y), ground at z = 0, centred like the old boxes.

def ute():
    paint = mat("ute_paint", (0.86, 0.84, 0.8), metallic=0.3, roughness=0.35)
    glass = mat("ute_glass", (0.08, 0.12, 0.15), metallic=0.6, roughness=0.08)
    black = mat("ute_black", (0.05, 0.05, 0.05), roughness=0.8)
    tyre = mat("tyre", (0.04, 0.04, 0.04), roughness=0.95)
    steel = mat("ute_steel", (0.5, 0.52, 0.54), metallic=1.0, roughness=0.35)
    chrome = mat("chrome", (0.8, 0.8, 0.82), metallic=1.0, roughness=0.15)
    red = mat("taillight", (0.7, 0.05, 0.03), roughness=0.3)
    amber = mat("jerry", (0.15, 0.3, 0.12), roughness=0.6)
    canvas = mat("swag", (0.4, 0.38, 0.26), roughness=0.95)
    parts = []
    # Chassis and lower body with wheel-arch cut-ins approximated by fender blocks.
    parts.append(box("chassis", (4.4, 1.2, 0.18), (0.0, 0, 0.55), black))
    parts.append(box("front_body", (1.5, 1.8, 0.55), (1.45, 0, 0.88), paint, bevel=0.04))
    parts.append(box("bonnet", (1.05, 1.72, 0.08), (1.7, 0, 1.18), paint, rot=(0, -0.07, 0), bevel=0.02))
    # Cab with a raked windscreen.
    parts.append(box("cab_lower", (1.2, 1.78, 0.5), (0.35, 0, 0.95), paint, bevel=0.04))
    bm = bmesh.new()
    x0, x1, z0, z1, w = -0.25, 0.95, 1.2, 1.85, 0.86
    v = [bm.verts.new(p) for p in [
        (x0, -w, z0), (x1, -w, z0), (x1, w, z0), (x0, w, z0),
        (x0 + 0.03, -w * 0.94, z1), (x1 - 0.42, -w * 0.94, z1), (x1 - 0.42, w * 0.94, z1), (x0 + 0.03, w * 0.94, z1)]]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    parts.append(from_bm("cab_top", bm, paint))
    # Glass: windscreen, side windows, rear window (thin slabs just proud of the cab).
    parts.append(box("windscreen", (0.02, 1.5, 0.55), (0.76, 0, 1.53), glass, rot=(0, -0.58, 0)))
    for s in (1, -1):
        parts.append(box(f"sidewin{s}", (0.7, 0.02, 0.45), (0.3, s * 0.875, 1.55), glass))
    parts.append(box("rearwin", (0.02, 1.3, 0.38), (-0.235, 0, 1.56), glass))
    # Steel tray with drop sides and a headboard rack.
    parts.append(box("tray_floor", (2.3, 1.9, 0.06), (-1.2, 0, 1.0), steel))
    for s in (1, -1):
        parts.append(box(f"tray_side{s}", (2.3, 0.04, 0.3), (-1.2, s * 0.93, 1.18), steel))
    parts.append(box("tailgate", (0.04, 1.9, 0.3), (-2.33, 0, 1.18), steel))
    parts.append(box("headboard", (0.05, 1.9, 0.75), (-0.08, 0, 1.4), steel))
    for z in (1.55, 1.7):
        parts.append(tube(f"rack{z}", (-0.07, -0.95, z), (-0.07, 0.95, z), 0.015, 0.015, steel, verts=8))
    # Gear in the tray: spare wheel, jerry cans, a rolled swag.
    parts.append(cyl("spare", 0.36, 0.25, (-0.6, 0.2, 1.16), tyre, verts=24))
    for i in range(2):
        parts.append(box(f"jerry{i}", (0.18, 0.35, 0.45), (-2.05, -0.6 + i * 0.22, 1.25), amber, bevel=0.02))
    parts.append(cyl("swag", 0.2, 1.4, (-1.5, 0.35, 1.23), canvas, rot=(math.pi / 2, 0, 0), verts=16))
    # Bull bar, spotlights, snorkel.
    for s in (1, -1):
        parts.append(tube(f"bar_up{s}", (2.25, s * 0.55, 0.5), (2.25, s * 0.55, 1.15), 0.035, 0.035, steel, verts=10))
    parts.append(tube("bar_top", (2.25, -0.85, 1.12), (2.25, 0.85, 1.12), 0.035, 0.035, steel, verts=10))
    parts.append(tube("bar_low", (2.25, -0.85, 0.7), (2.25, 0.85, 0.7), 0.035, 0.035, steel, verts=10))
    for s in (1, -1):
        parts.append(cyl(f"spot{s}", 0.09, 0.08, (2.3, s * 0.35, 1.25), chrome, rot=(0, math.pi / 2, 0)))
    parts.append(tube("snorkel", (1.1, 0.9, 0.95), (1.0, 0.9, 1.95), 0.045, 0.045, black, verts=10))
    parts.append(box("snorkel_head", (0.22, 0.1, 0.1), (1.06, 0.9, 1.98), black))
    # Lights and bumpers.
    for s in (1, -1):
        parts.append(box(f"head{s}", (0.03, 0.3, 0.12), (2.2, s * 0.6, 1.0), chrome))
        parts.append(box(f"tail{s}", (0.03, 0.12, 0.22), (-2.36, s * 0.85, 1.05), red))
    parts.append(box("rear_bumper", (0.12, 1.85, 0.12), (-2.35, 0, 0.62), black))
    body = join(parts, "ute_body")
    wheels = []
    for wx, wy in ((1.5, 0.92), (1.5, -0.92), (-1.4, 0.92), (-1.4, -0.92)):
        t = cyl("tyre", 0.42, 0.3, (wx, wy, 0.42), tyre, rot=(math.pi / 2, 0, 0), verts=28)
        h = cyl("hub", 0.24, 0.31, (wx, wy, 0.42), steel, rot=(math.pi / 2, 0, 0), verts=10)
        wheels += [t, h]
    wheels_ob = join(wheels, "ute_wheels")
    return [body, wheels_ob]


# ---------------------------------------------------------------- tent
# Canvas ridge tent, door facing -x, centred at the origin on the ground.

def tent():
    canvas = mat("canvas", (0.24, 0.26, 0.14), roughness=0.95)
    dark = mat("door_dark", (0.08, 0.07, 0.05), roughness=1.0)
    wood = mat("pole", (0.45, 0.32, 0.2), roughness=0.7)
    rope = mat("rope", (0.75, 0.7, 0.55), roughness=0.9)
    L, W, H = 2.6, 2.1, 1.8
    bm = bmesh.new()
    # Two sloping roof panels with slight sag, plus low side walls.
    wall = 0.35
    pts = {
        "rl": (-L / 2, -W / 2, wall), "rr": (L / 2, -W / 2, wall),
        "ll": (-L / 2, W / 2, wall), "lr": (L / 2, W / 2, wall),
        "tl": (-L / 2, 0, H), "tr": (L / 2, 0, H),
        "gl0": (-L / 2, -W / 2, 0), "gr0": (L / 2, -W / 2, 0), "gl1": (-L / 2, W / 2, 0), "gr1": (L / 2, W / 2, 0),
    }
    v = {k: bm.verts.new(p) for k, p in pts.items()}
    for f in (("rl", "rr", "tr", "tl"), ("lr", "ll", "tl", "tr"), ("gl0", "gr0", "rr", "rl"), ("gr1", "gl1", "ll", "lr"),
              ("gr0", "gr1", "lr", "rr"), ("rr", "lr", "tr")):
        bm.faces.new([v[k] for k in f])
    # Front (door end): two flaps leaving a dark doorway.
    bm.faces.new([v["gl1"], v["gl0"], v["rl"], v["tl"], v["ll"]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1.0], cuts=3)
    body = from_bm("tent_body", bm, canvas)
    door = box("door", (0.02, 0.8, 1.2), (-L / 2 - 0.01, 0, 0.6), dark)
    parts = [body, door]
    for x in (-L / 2 - 0.05, L / 2 + 0.05):
        parts.append(tube(f"pole{x}", (x, 0, 0), (x, 0, H + 0.12), 0.025, 0.025, wood, verts=8))
    parts.append(tube("ridge", (-L / 2 - 0.05, 0, H + 0.03), (L / 2 + 0.05, 0, H + 0.03), 0.02, 0.02, wood, verts=8))
    # Guy ropes from the pole tops and the eaves out to pegs.
    for x in (-L / 2 - 0.05, L / 2 + 0.05):
        s = -1 if x < 0 else 1
        parts.append(tube(f"guy{x}", (x, 0, H + 0.1), (x + s * 1.2, 0, 0.02), 0.006, 0.006, rope, verts=6))
        parts.append(tube(f"peg{x}", (x + s * 1.2, 0, 0.06), (x + s * 1.2, 0, -0.1), 0.012, 0.008, wood, verts=6))
    for xx in (-L / 2, 0, L / 2):
        for s in (1, -1):
            parts.append(tube(f"eave{xx}{s}", (xx, s * W / 2, wall), (xx, s * (W / 2 + 0.7), 0.02), 0.005, 0.005, rope, verts=6))
    return [join(parts, "tent")]


def build(name, fn, cam, target, lens=50):
    reset()
    objs = fn()
    preview(name, cam, target, lens)
    export(objs, f"{name}.glb")


build("detector", detector, (0.9, 0.2, 0.5), (-0.08, 0.5, -0.25), 40)
build("gold_pan", gold_pan, (0.45, -0.45, 0.4), (0, 0, 0.02), 50)
build("gem_sieve", gem_sieve, (0.5, -0.5, 0.4), (0, 0, 0), 50)
build("sluice", sluice, (1.6, -1.6, 1.2), (0, 0.1, 0.05), 45)
build("ute", ute, (6.5, -6.0, 3.0), (0, 0, 0.9), 40)
build("tent", tent, (4.5, -4.5, 2.5), (0, 0, 0.8), 40)
print("PROPS DONE ->", OUT)
