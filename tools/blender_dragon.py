# blender -b dragon-2_80.blend --disable-autoexec --python tools/blender_dragon.py -- <black texture png> <out.glb> <preview.png>
# Keeps the dragon and its armature, swaps in the black texture (Onyxia), renames the actions to the names the
# yard's dragon code looks for (Stand, Walk, AttackUnarmed, Death) and writes a GLB plus a side-view preview.
import sys

import bpy
from mathutils import Vector

tex, out, preview = sys.argv[sys.argv.index('--') + 1:]
keep = {'Armature', 'dragon'}
for o in list(bpy.data.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)

img = bpy.data.images.load(tex)
img.pack()
for m in bpy.data.materials:
    if m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and n.image.name.startswith('dragon'):
                n.image = img

for a in bpy.data.actions:
    a.name = {'Idle': 'Stand', 'Walk': 'Walk', 'Attack': 'AttackUnarmed', 'Die': 'Death'}.get(a.name, a.name)
    a.use_fake_user = True
print('actions', [a.name for a in bpy.data.actions])

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS',
                          export_yup=True, export_apply=False, export_cameras=False, export_lights=False)

# A preview from the side (+X), so the facing can be checked: Blender -Y becomes glTF +Z, the yard's forward.
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.color_type = 'TEXTURE'
scene.display.shading.light = 'FLAT'
scene.render.resolution_x = scene.render.resolution_y = 384
scene.render.film_transparent = True
mesh = bpy.data.objects['dragon']
corners = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
center = sum(corners, Vector()) / 8
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = max(mesh.dimensions) * 1.3
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.location = center + Vector((3, 0, 0))
cam.rotation_euler = (1.5708, 0, 1.5708)
scene.camera = cam
scene.render.filepath = preview
bpy.ops.render.render(write_still=True)
print('min y', min(c.y for c in corners), 'max y', max(c.y for c in corners))
