"""Build the wildlife models (red kangaroo) as GLB.

Run headless:
  blender -b --factory-startup --python blender/build_wildlife.py -- <out_dir> [preview_dir]

Same trick as the glove: a skeleton of edges with per-joint radii, the Skin
modifier to wrap it, and subdivision to smooth it. Facing +Y (three.js -Z),
standing on the ground at z = 0, origin under the hips.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/models")
PREVIEW = os.path.abspath(argv[1]) if len(argv) > 1 else None
os.makedirs(OUT, exist_ok=True)


def mat(name, color, roughness=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*color, 1.0)
    return m


def skinned(name, joints, edges, root, subdiv=1):
    verts = [j[0] for j in joints]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, edges, [])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    skin = ob.modifiers.new("skin", "SKIN")
    skin.branch_smoothing = 0.7
    for sv, (_, rx, ry) in zip(me.skin_vertices[0].data, joints):
        sv.radius = (rx, ry)
    me.skin_vertices[0].data[root].use_root = True
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = subdiv
    sub.render_levels = subdiv
    bpy.ops.object.modifier_apply(modifier="skin")
    bpy.ops.object.modifier_apply(modifier="sub")
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def kangaroo():
    """Red kangaroo standing alert: big hind legs and long feet, thick tail, small arms."""
    J = []

    def j(co, rx, ry=None):
        J.append((co, rx, ry if ry is not None else rx))
        return len(J) - 1

    E = []
    pelvis = j((0, 0.0, 0.5), 0.27, 0.23)
    tb = j((0, -0.17, 0.4), 0.14)
    tm = j((0, -0.6, 0.15), 0.085)
    tt = j((0, -1.05, 0.03), 0.022)
    E += [(pelvis, tb), (tb, tm), (tm, tt)]
    belly = j((0, 0.1, 0.72), 0.22, 0.2)
    chest = j((0, 0.19, 0.94), 0.16, 0.15)
    neck = j((0, 0.23, 1.1), 0.085)
    head = j((0, 0.28, 1.22), 0.095, 0.085)
    snout = j((0, 0.44, 1.19), 0.05, 0.045)
    E += [(pelvis, belly), (belly, chest), (chest, neck), (neck, head), (head, snout)]
    for s in (1, -1):
        e0 = j((s * 0.045, 0.25, 1.29), 0.032, 0.02)
        e1 = j((s * 0.07, 0.21, 1.44), 0.012, 0.006)
        E += [(head, e0), (e0, e1)]
        a0 = j((s * 0.09, 0.25, 0.92), 0.035)
        a1 = j((s * 0.1, 0.35, 0.8), 0.028)
        a2 = j((s * 0.08, 0.39, 0.7), 0.02)
        E += [(chest, a0), (a0, a1), (a1, a2)]
        hip = j((s * 0.14, 0.03, 0.47), 0.15, 0.16)
        knee = j((s * 0.16, 0.26, 0.3), 0.075)
        heel = j((s * 0.12, -0.12, 0.07), 0.035)
        toe = j((s * 0.12, 0.24, 0.025), 0.03, 0.022)
        E += [(pelvis, hip), (hip, knee), (knee, heel), (heel, toe)]
    body = skinned("kangaroo", J, E, pelvis, subdiv=1)
    fur = mat("roo_fur", (0.58, 0.32, 0.19))
    body.data.materials.append(fur)
    # Eyes and nose.
    dark = mat("roo_dark", (0.03, 0.025, 0.02), 0.4)
    parts = [body]
    for s in (1, -1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.014, location=(s * 0.055, 0.34, 1.25))
        e = bpy.context.active_object
        e.data.materials.append(dark)
        parts.append(e)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.02, location=(0, 0.45, 1.198))
    n = bpy.context.active_object
    n.data.materials.append(dark)
    parts.append(n)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def preview(name, cam_pos, target):
    if not PREVIEW:
        return
    os.makedirs(PREVIEW, exist_ok=True)
    scene = bpy.context.scene
    cd = bpy.data.cameras.new("cam")
    cd.lens = 45
    cam = bpy.data.objects.new("cam", cd)
    scene.collection.objects.link(cam)
    cam.location = cam_pos
    cam.rotation_euler = (Vector(target) - Vector(cam_pos)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_cavity = True
    scene.render.resolution_x = 800
    scene.render.resolution_y = 600
    scene.render.filepath = os.path.join(PREVIEW, f"{name}.png")
    bpy.ops.render.render(write_still=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
roo = kangaroo()
preview("kangaroo", (2.6, 1.2, 1.1), (0, 0, 0.65))
bpy.ops.object.select_all(action="DESELECT")
roo.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "kangaroo.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
print("WILDLIFE DONE ->", OUT)
