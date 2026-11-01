# blender -b "handpainted weapons 2-80.blend" --disable-autoexec --python tools/blender_weapons.py -- <out.glb> <preview dir>
# Normalizes every sword and shield and writes them as named nodes in one GLB:
#   swords: grip at the origin, blade along +Z (glTF +Y), cross-guard along X, 1 unit long;
#   shields: centred, face toward -Y (glTF +Z), top along +Z (glTF +Y), 1 unit tall.
# Also renders a front preview of each, to check the orientation.
import os
import sys

import bpy
from mathutils import Matrix, Vector

out, preview_dir = sys.argv[sys.argv.index('--') + 1:]
objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.split('_')[0] in ('sword', 'shield')]
for o in list(bpy.data.objects):
    if o not in objs:
        bpy.data.objects.remove(o, do_unlink=True)


def axes(verts):
    lo = [min(v[i] for v in verts) for i in range(3)]
    hi = [max(v[i] for v in verts) for i in range(3)]
    ext = [hi[i] - lo[i] for i in range(3)]
    order = sorted(range(3), key=lambda i: -ext[i])
    return lo, hi, ext, order


for o in objs:
    o.animation_data_clear()
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)
    verts = [v.co.copy() for v in o.data.vertices]
    lo, hi, ext, (a, b, c) = axes(verts)
    if o.name.startswith('sword'):
        # The cross-guard is the widest slice along the length; the handle is the shorter side of it.
        bins = 48
        width = [[float('inf'), float('-inf')] for _ in range(bins)]
        for v in verts:
            k = min(bins - 1, int((v[a] - lo[a]) / ext[a] * bins))
            width[k][0] = min(width[k][0], v[b])
            width[k][1] = max(width[k][1], v[b])
        k = max(range(bins), key=lambda i: width[i][1] - width[i][0] if width[i][1] > width[i][0] else 0)
        guard = lo[a] + (k + 0.5) / bins * ext[a]
        handle_low = guard - lo[a] < hi[a] - guard
        end = lo[a] if handle_low else hi[a]
        grip = end + (guard - end) * 0.6
        sign = 1 if handle_low else -1
        mid_b = (lo[b] + hi[b]) / 2
        mid_c = (lo[c] + hi[c]) / 2
        scale = 1 / ext[a]
        def f(v):
            p = Vector((0, 0, 0))
            p.z = (v[a] - grip) * sign * scale
            p.x = (v[b] - mid_b) * scale
            p.y = (v[c] - mid_c) * scale * sign
            return p
    else:
        # The face is across the thinnest axis; the front is the side the boss bulges toward (away from the rim plane).
        cs = sorted(v[c] for v in verts)
        median = cs[len(cs) // 2]
        front = 1 if hi[c] - median > median - lo[c] else -1
        up = 1  # the original +Y (or +X) is taken as the top; the preview shows it
        center = [(lo[i] + hi[i]) / 2 for i in range(3)]
        scale = 1 / max(ext[a], ext[b])
        top_axis = 1 if c != 1 else 0
        side_axis = 0 if top_axis != 0 else 2
        if side_axis == c:
            side_axis = 3 - top_axis - c
        def f(v):
            return Vector(((v[side_axis] - center[side_axis]) * scale,
                           -(v[c] - center[c]) * front * scale,
                           (v[top_axis] - center[top_axis]) * scale * up))
    turn = Matrix.Rotation(1.5708, 3, 'Y') if o.name in ('shield_b', 'shield_c', 'shield_d') else Matrix.Identity(3)
    for v in o.data.vertices:
        v.co = turn @ f(v.co)
    # A mirror flips the winding: recompute normals outward.
    o.data.update()
    bpy.context.view_layer.objects.active = o
    for x in objs:
        x.select_set(x is o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    print(o.name, 'dims', tuple(round(d, 3) for d in o.dimensions))

for x in objs:
    x.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_animations=False, export_cameras=False, export_lights=False)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.color_type = 'TEXTURE'
scene.display.shading.light = 'FLAT'
scene.render.resolution_x = scene.render.resolution_y = 256
scene.render.film_transparent = True
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 1.15
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.rotation_euler = (1.5708, 0, 0)  # looking along +Y, from -Y
scene.camera = cam
for o in objs:
    for x in objs:
        x.hide_render = x is not o
    z = 0.4 if o.name.startswith('sword') else 0
    cam.location = Vector((0, -3, z))
    scene.render.filepath = os.path.join(preview_dir, o.name + '.png')
    bpy.ops.render.render(write_still=True)
