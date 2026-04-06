"""
Mafia Game - Village Map Generator
Creates a low-poly village map with:
- Circular town square (cobblestone)
- 6 houses around the perimeter
- A gallows/potence in the center
- Lantern posts
- Ground plane with grass
Exports to public/models/village.glb
"""
import bpy
import bmesh
import math
import os

OUTPUT_PATH = "C:/Users/artof/Documents/mafia/mafia/public/models/village.glb"

# ============================================================
# UTILITIES
# ============================================================

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    # Remove orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)

def create_material(name, color, roughness=0.8, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat

def assign_material(obj, mat):
    obj.data.materials.append(mat)

# ============================================================
# MATERIALS
# ============================================================

def create_materials():
    mats = {}
    mats['grass'] = create_material('Grass', (0.15, 0.35, 0.1, 1.0), roughness=0.95)
    mats['cobblestone'] = create_material('Cobblestone', (0.35, 0.32, 0.28, 1.0), roughness=0.9)
    mats['wall'] = create_material('Wall', (0.55, 0.50, 0.42, 1.0), roughness=0.85)
    mats['roof'] = create_material('Roof', (0.45, 0.18, 0.12, 1.0), roughness=0.7)
    mats['wood'] = create_material('Wood', (0.35, 0.22, 0.12, 1.0), roughness=0.8)
    mats['wood_dark'] = create_material('WoodDark', (0.2, 0.12, 0.06, 1.0), roughness=0.85)
    mats['door'] = create_material('Door', (0.28, 0.18, 0.1, 1.0), roughness=0.75)
    mats['window'] = create_material('Window', (0.4, 0.55, 0.7, 1.0), roughness=0.3, metallic=0.1)
    mats['metal'] = create_material('Metal', (0.25, 0.25, 0.28, 1.0), roughness=0.4, metallic=0.8)
    mats['rope'] = create_material('Rope', (0.5, 0.4, 0.25, 1.0), roughness=0.95)
    mats['stone'] = create_material('Stone', (0.4, 0.38, 0.35, 1.0), roughness=0.9)
    mats['lantern_glass'] = create_material('LanternGlass', (1.0, 0.85, 0.4, 1.0), roughness=0.2)
    return mats

# ============================================================
# GROUND
# ============================================================

def create_ground(mats):
    # Grass ground
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = 'Ground'
    assign_material(ground, mats['grass'])

    # Cobblestone town square (circle)
    bpy.ops.mesh.primitive_cylinder_add(radius=8, depth=0.05, location=(0, 0, 0.025), vertices=32)
    square = bpy.context.active_object
    square.name = 'TownSquare'
    assign_material(square, mats['cobblestone'])

    # Paths from square (4 directions)
    for angle in [0, math.pi/2, math.pi, 3*math.pi/2]:
        x = math.cos(angle) * 12
        y = math.sin(angle) * 12
        bpy.ops.mesh.primitive_cube_add(size=1, location=(math.cos(angle)*10, math.sin(angle)*10, 0.025))
        path = bpy.context.active_object
        path.name = f'Path_{int(math.degrees(angle))}'
        path.scale = (1.5, 5, 0.025)
        path.rotation_euler.z = angle
        assign_material(path, mats['cobblestone'])

# ============================================================
# HOUSES
# ============================================================

def create_house(mats, location, rotation=0, scale=1.0):
    x, y, z = location

    # Main body
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 1.2 * scale))
    body = bpy.context.active_object
    body.name = f'House_{int(x)}_{int(y)}'
    body.scale = (2.0 * scale, 1.8 * scale, 1.2 * scale)
    body.rotation_euler.z = rotation
    assign_material(body, mats['wall'])

    # Roof (wedge shape using a scaled cube rotated)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1.8*scale, depth=1.2*scale,
                                     location=(x, y, z + 2.8 * scale))
    roof = bpy.context.active_object
    roof.name = f'Roof_{int(x)}_{int(y)}'
    roof.rotation_euler = (0, 0, rotation + math.pi/4)
    roof.scale.z = 0.5
    roof.scale.x = 1.15
    roof.scale.y = 1.05
    assign_material(roof, mats['roof'])

    # Door
    bpy.ops.mesh.primitive_cube_add(size=1, location=(
        x + math.cos(rotation) * 1.0 * scale,
        y + math.sin(rotation) * 1.0 * scale,
        z + 0.6 * scale
    ))
    door = bpy.context.active_object
    door.name = f'Door_{int(x)}_{int(y)}'
    door.scale = (0.35 * scale, 0.05 * scale, 0.6 * scale)
    door.rotation_euler.z = rotation
    assign_material(door, mats['door'])

    # Windows (2)
    for side in [-0.7, 0.7]:
        wx = x + math.cos(rotation) * 1.0 * scale + math.cos(rotation + math.pi/2) * side * scale
        wy = y + math.sin(rotation) * 1.0 * scale + math.sin(rotation + math.pi/2) * side * scale
        bpy.ops.mesh.primitive_cube_add(size=1, location=(wx, wy, z + 1.5 * scale))
        window = bpy.context.active_object
        window.name = f'Window_{int(x)}_{int(y)}_{side}'
        window.scale = (0.3 * scale, 0.05 * scale, 0.3 * scale)
        window.rotation_euler.z = rotation
        assign_material(window, mats['window'])

def create_houses(mats):
    radius = 12
    num_houses = 6
    for i in range(num_houses):
        angle = (i / num_houses) * 2 * math.pi + math.pi/6
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        # Houses face toward center
        face_angle = angle + math.pi
        scale = 0.9 + (i % 3) * 0.15  # Slight size variation
        create_house(mats, (x, y, 0), rotation=face_angle, scale=scale)

# ============================================================
# GALLOWS (POTENCE)
# ============================================================

def create_gallows(mats):
    # Base platform
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.15))
    platform = bpy.context.active_object
    platform.name = 'Gallows_Platform'
    platform.scale = (1.5, 1.5, 0.15)
    assign_material(platform, mats['wood_dark'])

    # Steps
    bpy.ops.mesh.primitive_cube_add(size=1, location=(1.2, 0, 0.075))
    step = bpy.context.active_object
    step.name = 'Gallows_Step'
    step.scale = (0.4, 0.6, 0.075)
    assign_material(step, mats['wood'])

    # Vertical post
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.5, 0, 1.8))
    post = bpy.context.active_object
    post.name = 'Gallows_Post'
    post.scale = (0.12, 0.12, 1.5)
    assign_material(post, mats['wood_dark'])

    # Horizontal beam
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.2, 0, 3.2))
    beam = bpy.context.active_object
    beam.name = 'Gallows_Beam'
    beam.scale = (0.8, 0.1, 0.08)
    assign_material(beam, mats['wood_dark'])

    # Rope
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=1.0, location=(0.5, 0, 2.7))
    rope = bpy.context.active_object
    rope.name = 'Gallows_Rope'
    assign_material(rope, mats['rope'])

    # Noose (torus)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.1, minor_radius=0.02,
        location=(0.5, 0, 2.15)
    )
    noose = bpy.context.active_object
    noose.name = 'Gallows_Noose'
    assign_material(noose, mats['rope'])

    # Support brace
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.15, 0, 2.6))
    brace = bpy.context.active_object
    brace.name = 'Gallows_Brace'
    brace.scale = (0.5, 0.06, 0.06)
    brace.rotation_euler.y = math.radians(45)
    assign_material(brace, mats['wood_dark'])

# ============================================================
# LANTERNS
# ============================================================

def create_lantern(mats, location):
    x, y, z = location

    # Post
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=2.5, location=(x, y, z + 1.25))
    post = bpy.context.active_object
    post.name = f'Lantern_Post_{int(x)}_{int(y)}'
    assign_material(post, mats['metal'])

    # Arm
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 0.25, y, z + 2.5))
    arm = bpy.context.active_object
    arm.name = f'Lantern_Arm_{int(x)}_{int(y)}'
    arm.scale = (0.3, 0.03, 0.03)
    assign_material(arm, mats['metal'])

    # Lantern glass
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 0.45, y, z + 2.25))
    glass = bpy.context.active_object
    glass.name = f'Lantern_Glass_{int(x)}_{int(y)}'
    glass.scale = (0.1, 0.1, 0.15)
    assign_material(glass, mats['lantern_glass'])

def create_lanterns(mats):
    radius = 7.5
    for i in range(4):
        angle = (i / 4) * 2 * math.pi + math.pi/4
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        create_lantern(mats, (x, y, 0))

# ============================================================
# WELL (PUITS)
# ============================================================

def create_well(mats):
    # Base cylinder
    bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=0.8, location=(3, 3, 0.4), vertices=8)
    base = bpy.context.active_object
    base.name = 'Well_Base'
    assign_material(base, mats['stone'])

    # Inner hole (slightly smaller, darker)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.1, location=(3, 3, 0.81), vertices=8)
    hole = bpy.context.active_object
    hole.name = 'Well_Water'
    assign_material(hole, mats['wood_dark'])

    # Posts
    for sx in [-0.4, 0.4]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=1.2, location=(3 + sx, 3, 1.2))
        post = bpy.context.active_object
        post.name = f'Well_Post_{sx}'
        assign_material(post, mats['wood'])

    # Crossbar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=1.0, location=(3, 3, 1.8), vertices=6)
    bar = bpy.context.active_object
    bar.name = 'Well_Bar'
    bar.rotation_euler.y = math.pi/2
    assign_material(bar, mats['wood'])

# ============================================================
# MAIN
# ============================================================

def main():
    clear_scene()
    mats = create_materials()

    print("Creating ground...")
    create_ground(mats)

    print("Creating houses...")
    create_houses(mats)

    print("Creating gallows...")
    create_gallows(mats)

    print("Creating lanterns...")
    create_lanterns(mats)

    print("Creating well...")
    create_well(mats)

    # Set up basic lighting for export
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
    sun = bpy.context.active_object
    sun.name = 'Sun'
    sun.data.energy = 3

    print(f"Exporting to {OUTPUT_PATH}...")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH,
        export_format='GLB',
        export_lights=True,
        export_apply=True,
    )
    print("Village map exported successfully!")

if __name__ == '__main__':
    main()
