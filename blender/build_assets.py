"""Build crystal and hand-tool models for the game and export them as GLB.

Run headless:
  blender -b --factory-startup --python blender/build_assets.py -- <out_dir> [preview_dir]

Conventions (Blender, Z up; the glTF exporter converts to Y up):
  - Crystals: base at the origin, growing up +Z, prism radius ~1, total height 1.
    The game scales them per crystal and assigns its own materials.
  - Hand tools: real size in metres, grip at the origin, tool extending along +Y
    (which becomes -Z, "away from the camera", in three.js), up is +Z.
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/models")
PREVIEW = os.path.abspath(argv[1]) if len(argv) > 1 else None
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mesh_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def shade_flat(ob):
    for p in ob.data.polygons:
        p.use_smooth = False


def shade_smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def material(name, color, metallic=0.0, roughness=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*color, 1.0)  # what Workbench previews show
    m.metallic = metallic
    m.roughness = roughness
    return m


def export(objs, filename):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, filename),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


# ---------------------------------------------------------------- crystals

def quartz_point(name, seed, habit):
    """Hexagonal prism with a rhombohedral termination and a broken base.

    Real quartz is rarely a perfect hexagon: faces have different widths, the
    termination is often off-centre, sometimes it ends in a chisel edge, and
    Tessin-habit crystals taper steeply toward the tip.
    """
    rnd = random.Random(seed)
    bm = bmesh.new()
    n = 6
    prism_top = {"point": 0.72, "offset": 0.7, "chisel": 0.74, "tessin": 0.55}[habit]
    taper = {"point": 0.96, "offset": 0.95, "chisel": 0.97, "tessin": 0.62}[habit]
    radii = [1.0 + rnd.uniform(-0.18, 0.18) for _ in range(n)]
    rings = []
    # Broken base: an uneven ring, then the prism with faint steps (growth striations).
    levels = [0.0, 0.03, prism_top * 0.5, prism_top]
    for li, z in enumerate(levels):
        ring = []
        k = 1.0 + (taper - 1.0) * (z / prism_top)
        for i in range(n):
            a = math.tau * i / n
            r = radii[i] * k * (0.985 if li == 2 else 1.0)
            zz = z + (rnd.uniform(-0.04, 0.03) if li == 0 else 0.0)
            ring.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, zz)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    top = rings[-1]
    if habit == "chisel":
        # Two termination faces grow large and meet in a ridge.
        t0 = bm.verts.new((0.28, 0.12, 1.0))
        t1 = bm.verts.new((-0.28, -0.12, 0.97))
        bm.faces.new((top[0], top[1], t0))
        bm.faces.new((top[1], top[2], t1, t0))
        bm.faces.new((top[2], top[3], t1))
        bm.faces.new((top[3], top[4], t1))
        bm.faces.new((top[4], top[5], t0, t1))
        bm.faces.new((top[5], top[0], t0))
    else:
        off = {"point": 0.06, "offset": 0.3, "tessin": 0.05}[habit]
        a = rnd.uniform(0, math.tau)
        tip = bm.verts.new((math.cos(a) * off, math.sin(a) * off, 1.0))
        for i in range(n):
            bm.faces.new((top[i], top[(i + 1) % n], tip))
    # Rough broken base: a fan to an off-centre low point.
    base = bm.verts.new((rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), -0.05))
    b = rings[0]
    for i in range(n):
        bm.faces.new((b[(i + 1) % n], b[i], base))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_object(name, bm)
    shade_flat(ob)
    return ob


def feldspar(name, seed):
    """Microcline: a blocky monoclinic prism with sloping terminal faces."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    sk = 0.35  # parallelogram cross-section
    w, d = 0.8, 0.55
    sec = [(-w - sk * d, -d), (w - sk * d, -d), (w + sk * d, d), (-w + sk * d, d)]
    lo = [bm.verts.new((x, y, rnd.uniform(-0.03, 0.02))) for x, y in sec]
    mid = [bm.verts.new((x, y, 0.62)) for x, y in sec]
    # Sloped top: one end higher than the other, plus a small cross face.
    hi = [
        bm.verts.new((sec[0][0] * 0.9, sec[0][1] * 0.9, 0.82)),
        bm.verts.new((sec[1][0] * 0.9, sec[1][1] * 0.9, 1.0)),
        bm.verts.new((sec[2][0] * 0.9, sec[2][1] * 0.9, 1.0)),
        bm.verts.new((sec[3][0] * 0.9, sec[3][1] * 0.9, 0.82)),
    ]
    for ring0, ring1 in ((lo, mid), (mid, hi)):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i]))
    bm.faces.new(hi)
    bm.faces.new(list(reversed(lo)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_object(name, bm)
    shade_flat(ob)
    return ob


def calcite(name):
    """Rhombohedron: a cube sheared along its body diagonal, standing on a corner edge."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    # Stretch along (1,1,1) to make the rhombohedral angles.
    d = Vector((1, 1, 1)).normalized()
    m = Matrix.Identity(3) + (1.6 - 1.0) * Matrix([[d.x * d.x, d.x * d.y, d.x * d.z],
                                                    [d.y * d.x, d.y * d.y, d.y * d.z],
                                                    [d.z * d.x, d.z * d.y, d.z * d.z]])
    bmesh.ops.transform(bm, matrix=m.to_4x4(), verts=bm.verts)
    # Stand it with the long diagonal near vertical.
    rot = d.rotation_difference(Vector((0, 0, 1))).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=rot @ Matrix.Rotation(0.35, 4, "X"), verts=bm.verts)
    ob = mesh_object(name, bm)
    normalise(ob)
    shade_flat(ob)
    return ob


def fluorite(name):
    """Cube with small octahedral faces on the corners."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.bevel(bm, geom=list(bm.verts), offset=0.14, segments=1, affect="VERTICES")
    ob = mesh_object(name, bm)
    normalise(ob)
    shade_flat(ob)
    return ob


def topaz(name):
    """Orthorhombic prism (lozenge section, eight sides) with a wedge termination."""
    bm = bmesh.new()
    n = 8
    rad = [1.0 if i % 2 == 0 else 0.82 for i in range(n)]
    ring = lambda z, k: [bm.verts.new((math.cos(math.tau * i / n + 0.39) * rad[i] * k * 1.0,
                                       math.sin(math.tau * i / n + 0.39) * rad[i] * k * 0.7, z)) for i in range(n)]
    r0, r1 = ring(0.0, 1.0), ring(0.72, 1.0)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    e0 = bm.verts.new((0.35, 0.0, 1.0))
    e1 = bm.verts.new((-0.35, 0.0, 1.0))
    for i in range(n):
        j = (i + 1) % n
        x = (r1[i].co.x + r1[j].co.x) / 2
        tip = e0 if x >= 0 else e1
        bm.faces.new((r1[i], r1[j], tip))
    # Fill the wedge sides between the two ridge points.
    for i in range(n):
        j = (i + 1) % n
        if (r1[i].co.x >= 0) != (r1[j].co.x >= 0):
            v = r1[j] if r1[j].co.x * r1[i].co.x <= 0 else r1[i]
            try:
                bm.faces.new((e0, e1, v) if r1[i].co.x >= 0 else (e1, e0, v))
            except ValueError:
                pass
    bm.faces.new(list(reversed(r0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_object(name, bm)
    shade_flat(ob)
    return ob


def normalise(ob):
    """Base at z=0, height 1, centred on the z axis."""
    me = ob.data
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    zs = [v.co.z for v in me.vertices]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    h = max(zs) - min(zs)
    for v in me.vertices:
        v.co.x = (v.co.x - cx) / h
        v.co.y = (v.co.y - cy) / h
        v.co.z = (v.co.z - min(zs)) / h


def build_crystals():
    reset()
    objs = []
    for i, habit in enumerate(["point", "offset", "chisel", "tessin"]):
        objs.append(quartz_point(f"quartz_{habit}", 11 + i, habit))
    objs.append(feldspar("feldspar", 5))
    objs.append(calcite("calcite"))
    objs.append(fluorite("fluorite"))
    objs.append(topaz("topaz"))
    # One file, one named mesh per shape; the game picks them by name.
    cols = [(0.35, 0.27, 0.2), (0.85, 0.88, 0.9), (0.48, 0.25, 0.66), (0.88, 0.6, 0.18),
            (0.85, 0.62, 0.5), (0.9, 0.78, 0.5), (0.55, 0.36, 0.78), (0.8, 0.88, 0.93)]
    for k, o in enumerate(objs):
        # Only for the preview: lay them out with the in-game proportions.
        o.location.x = k * 0.55
        thin = 0.17 if o.name.startswith("quartz") else (0.2 if o.name == "topaz" else 0.45)
        o.scale = (thin, thin, 1.0)
        o.color = (*cols[k], 1.0)
    preview(objs, "crystals", (1.9, -3.2, 1.6), (1.9, 0, 0.45), lens=40)
    for o in objs:
        o.location.x = 0
        o.scale = (1, 1, 1)
    export(objs, "crystals.glb")


# ---------------------------------------------------------------- hand tools

def cylinder(name, r1, r2, length, verts=16, y0=0.0, axis="Y"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r1, radius2=r2, depth=length)
    ob = mesh_object(name, bm)
    if axis == "Y":
        ob.rotation_euler = (-math.pi / 2, 0, 0)
        ob.location = (0, y0 + length / 2, 0)
    return ob


def apply_all(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def join(objs, name):
    apply_all(objs)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    return ob


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


def rock_pick():
    """Estwing-style geologist's pick: steel shank, blue grip, square face, long point."""
    steel = material("steel", (0.55, 0.56, 0.58), metallic=1.0, roughness=0.32)
    grip = material("grip", (0.09, 0.22, 0.5), roughness=0.75)
    parts = []
    g = cylinder("grip", 0.016, 0.0145, 0.15, 20, y0=0.0)
    g.scale = (1.0, 0.78, 1.0)  # oval grip
    flare = cylinder("grip_end", 0.019, 0.016, 0.018, 20, y0=-0.012)
    flare.scale = (1.0, 0.8, 1.0)
    for o in (g, flare):
        assign(o, grip)
    shank = cylinder("shank", 0.012, 0.011, 0.16, 12, y0=0.15)
    shank.scale = (0.8, 1.1, 1.0)
    assign(shank, steel)
    # Head runs up/down at the end of the shank: square face up, pick point down.
    bm = bmesh.new()
    face_top = 0.075
    pts = []
    def sq(z, s, y=0.31):
        return [bm.verts.new((x * s, y + yy * s, z)) for x, yy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    rings = [sq(face_top, 0.0135), sq(face_top - 0.012, 0.0125), sq(0.02, 0.0115), sq(-0.02, 0.011),
             sq(-0.08, 0.008, 0.315), sq(-0.14, 0.0045, 0.325)]
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    tip = bm.verts.new((0, 0.335, -0.185))
    last = rings[-1]
    for i in range(4):
        bm.faces.new((last[i], last[(i + 1) % 4], tip))
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    head = mesh_object("head", bm)
    assign(head, steel)
    shade_flat(head)
    for o in (g, flare, shank):
        shade_smooth(o)
    parts = [g, flare, shank, head]
    return parts


def trowel():
    """Pointing trowel: turned wooden handle, brass ferrule, offset tang, leaf blade."""
    wood = material("wood", (0.45, 0.24, 0.12), roughness=0.55)
    brass = material("brass", (0.75, 0.58, 0.28), metallic=1.0, roughness=0.35)
    steel = material("blade", (0.58, 0.6, 0.62), metallic=1.0, roughness=0.4)
    # Turned handle: a lathe profile.
    prof = [(0.0, 0.0), (0.012, 0.0), (0.016, 0.02), (0.017, 0.06), (0.014, 0.1), (0.011, 0.11)]
    bm = bmesh.new()
    n = 18
    rings = []
    for r, y in prof:
        rings.append([bm.verts.new((math.cos(math.tau * i / n) * r, y, math.sin(math.tau * i / n) * r)) for i in range(n)])
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    handle = mesh_object("handle", bm)
    assign(handle, wood)
    shade_smooth(handle)
    ferrule = cylinder("ferrule", 0.0115, 0.0105, 0.014, 18, y0=0.108)
    assign(ferrule, brass)
    shade_smooth(ferrule)
    # Tang: up and forward, so your knuckles clear the ground.
    bm = bmesh.new()
    path = [(0.122, 0.0), (0.13, 0.012), (0.142, 0.02), (0.15, 0.012)]
    for (y0, z0), (y1, z1) in zip(path, path[1:]):
        a = Vector((0, y0, z0)); b = Vector((0, y1, z1))
        w = 0.0035
        v = [bm.verts.new(a + Vector((-w, 0, -w))), bm.verts.new(a + Vector((w, 0, -w))),
             bm.verts.new(a + Vector((w, 0, w))), bm.verts.new(a + Vector((-w, 0, w))),
             bm.verts.new(b + Vector((-w, 0, -w))), bm.verts.new(b + Vector((w, 0, -w))),
             bm.verts.new(b + Vector((w, 0, w))), bm.verts.new(b + Vector((-w, 0, w)))]
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((v[i], v[j], v[4 + j], v[4 + i]))
    tang = mesh_object("tang", bm)
    assign(tang, steel)
    # Leaf-shaped blade, thin, flat, slightly dished.
    bm = bmesh.new()
    outline = [(0.0, 0.0), (0.03, 0.012), (0.038, 0.035), (0.03, 0.07), (0.016, 0.1), (0.0, 0.125),
               (-0.016, 0.1), (-0.03, 0.07), (-0.038, 0.035), (-0.03, 0.012)]
    t = 0.0012
    top = [bm.verts.new((x, 0.148 + y, 0.012 + t - 0.004 * (1 - abs(x) / 0.04))) for x, y in outline]
    bot = [bm.verts.new((x, 0.148 + y, 0.012 - t - 0.004 * (1 - abs(x) / 0.04))) for x, y in outline]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    k = len(outline)
    for i in range(k):
        j = (i + 1) % k
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    blade = mesh_object("blade", bm)
    assign(blade, steel)
    shade_flat(blade)
    return [handle, ferrule, tang, blade]


def brush():
    """Dusting brush: round wooden handle, crimped tin ferrule, splayed bristles."""
    wood = material("wood", (0.62, 0.42, 0.24), roughness=0.5)
    tin = material("tin", (0.7, 0.7, 0.68), metallic=1.0, roughness=0.3)
    hair = material("bristle", (0.12, 0.08, 0.05), roughness=1.0)
    handle = cylinder("handle", 0.008, 0.011, 0.15, 16, y0=0.0)
    knob = cylinder("knob", 0.0095, 0.008, 0.012, 16, y0=-0.012)
    for o in (handle, knob):
        assign(o, wood)
        shade_smooth(o)
    # Flattened ferrule.
    fer = cylinder("ferrule", 0.013, 0.016, 0.03, 20, y0=0.148)
    fer.scale = (1.6, 0.55, 1.0)
    assign(fer, tin)
    shade_smooth(fer)
    # Bristles: a fan of thin slabs, splaying slightly at the tips.
    tufts = []
    rnd = random.Random(3)
    for i in range(9):
        x = -0.021 + i * 0.00525
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        tuft = mesh_object(f"tuft{i}", bm)
        tuft.scale = (0.0045, 0.035 + rnd.uniform(-0.002, 0.002), 0.009)
        tuft.location = (x * (1.0 + 0.0), 0.178 + 0.0175, 0)
        tuft.rotation_euler = (0, 0, -x * 4.0)
        assign(tuft, hair)
        tufts.append(tuft)
    return [handle, knob, fer] + tufts


def glove():
    """Leather work glove, right hand, palm down, fingers forward along +Y, relaxed curl.

    A skeleton of edges with the Skin modifier (per-joint radii) and subdivision,
    so palm, fingers and thumb come out as one smooth mesh.
    """
    leather = material("leather", (0.62, 0.45, 0.27), roughness=0.85)
    cuff_mat = material("cuff", (0.3, 0.34, 0.4), roughness=0.9)
    verts, edges, radii = [], [], []

    def v(co, rx, ry):
        verts.append(co)
        radii.append((rx, ry))
        return len(verts) - 1

    wrist = v((0.0, -0.065, 0.002), 0.034, 0.016)
    palm = v((0.0, -0.01, 0.0), 0.04, 0.015)
    edges.append((wrist, palm))
    for f in range(4):
        x = -0.027 + f * 0.018
        L = [0.05, 0.056, 0.053, 0.042][f]
        k = v((x, 0.035, 0.0), 0.0095, 0.0085)
        edges.append((palm, k))
        p1 = v((x * 1.06, 0.035 + L * 0.48, -L * 0.12), 0.0082, 0.0074)
        p2 = v((x * 1.09, 0.035 + L * 0.8, -L * 0.34), 0.0074, 0.0068)
        p3 = v((x * 1.1, 0.035 + L * 0.97, -L * 0.58), 0.0066, 0.006)
        edges += [(k, p1), (p1, p2), (p2, p3)]
    t0 = v((-0.032, -0.022, -0.004), 0.012, 0.011)
    t1 = v((-0.052, 0.008, -0.01), 0.0098, 0.009)
    t2 = v((-0.06, 0.035, -0.02), 0.0086, 0.008)
    edges += [(palm, t0), (t0, t1), (t1, t2)]

    me = bpy.data.meshes.new("glove")
    me.from_pydata(verts, edges, [])
    ob = bpy.data.objects.new("glove", me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    skin = ob.modifiers.new("skin", "SKIN")
    skin.branch_smoothing = 0.6
    for sv, (rx, ry) in zip(me.skin_vertices[0].data, radii):
        sv.radius = (rx, ry)
    me.skin_vertices[0].data[wrist].use_root = True
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    bpy.ops.object.modifier_apply(modifier="skin")
    bpy.ops.object.modifier_apply(modifier="sub")
    assign(ob, leather)
    shade_smooth(ob)
    # Knitted cuff.
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=0.03)
    cf = bpy.context.active_object
    cf.rotation_euler = (-math.pi / 2, 0, 0)
    cf.scale = (0.037, 0.019, 1)
    cf.location = (0, -0.074, 0.002)
    assign(cf, cuff_mat)
    shade_smooth(cf)
    return [ob, cf]


def build_tools():
    for name, fn in (("rock_pick", rock_pick), ("trowel", trowel), ("brush", brush), ("glove", glove)):
        reset()
        parts = fn()
        ob = join(parts, name)
        preview([ob], name, (0.35, -0.05, 0.25), ob_center(ob), lens=50)
        export([ob], f"{name}.glb")


def ob_center(ob):
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    return tuple(sum(c[i] for c in vs) / len(vs) for i in range(3))


# ---------------------------------------------------------------- previews

def preview(objs, name, cam_pos, target, lens=50):
    if not PREVIEW:
        return
    os.makedirs(PREVIEW, exist_ok=True)
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = cam_pos
    direction = Vector(target) - Vector(cam_pos)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    sun_data = bpy.data.lights.new("sun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = (0.8, 0.2, 0.6)
    scene.collection.objects.link(sun)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL" if name not in ("crystals",) else "OBJECT"
    scene.display.shading.show_cavity = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 500
    scene.render.filepath = os.path.join(PREVIEW, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    bpy.data.objects.remove(sun)


build_crystals()
build_tools()
print("ASSETS DONE ->", OUT)
