# Renders the plates the exported story card and reveal clip are painted on: per card style, a framed leather panel
# modeled in Blender and lit like the room (candle key upper left, ember fill lower right, the Home still as the
# reflection environment), plus the ball's glow as a light pass (the same scene with only the ball's light, so it adds).
# Live text and the ball are drawn over them in src/storyPlate.ts. Uses the component kit's AI material tiles.
#   uv run --python 3.11 --with bpy --with pillow --with numpy python scripts/render-share-plates.py [scale]
# scale < 1 renders a quick low-resolution preview into .local/share-plates instead of assets/share.
import math, os, sys, bpy, bmesh, numpy as np
from PIL import Image

KIT = "/Users/janustsen/dev/archive/crystal-ball-components"
TILES = os.path.expanduser("~/dev/_archive/cb-render/ai")  # the MacBook lane's tiles (macbook/pipeline/kit.py)
ROOM_ENV = "/Users/janustsen/dev/archive/crystal-ball-room/v2/stills/home_1170x2532.png"
SCALE = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
OUT = "assets/share" if SCALE == 1 else ".local/share-plates"
W, H, S = 1080, 1920, 0.001  # output px; 1 BU = 1000 px, so the card is about a metre tall like the room's props
BORDER, FILLET = 62, 10       # frame width and the brass fillet inside it (px); live text stays inside x 90..990
BALL = (540, 584)             # ball centre in output px (y down), where the story painter draws assets/orb.png
ENERGY = float(os.environ.get("ENERGY", 0.2))  # candle level: keeps the text bands dark enough
os.makedirs(OUT, exist_ok=True); os.makedirs(".local/share-plates", exist_ok=True)

def tex(path):
    return bpy.data.images.load(path, check_existing=True)

def mat(name, img=None, color=(0.1, 0.07, 0.05), metal=0.0, rough=0.6, bump=0.3, tile=0.36, tint=(1, 1, 1)):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    b.inputs["Base Color"].default_value = (*color, 1)
    if img:
        tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); im = nt.nodes.new("ShaderNodeTexImage")
        im.image = tex(img); im.extension = "MIRROR"; mp.inputs["Scale"].default_value = (1 / tile, 1 / tile, 1); mp.inputs["Location"].default_value = (0.5, 0.5, 0)  # one tile centred: no mirror seam mid-card
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], im.inputs["Vector"])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
        mul.inputs["B"].default_value = (*tint, 1)
        nt.links.new(im.outputs["Color"], mul.inputs["A"]); nt.links.new(mul.outputs["Result"], b.inputs["Base Color"])
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.002
        nt.links.new(im.outputs["Color"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m

def rect(w, h):
    return [(w / 2, h / 2), (-w / 2, h / 2), (-w / 2, -h / 2), (w / 2, -h / 2)]

def slab(name, w, h, depth, z, m, bev, hole=None):
    """Extruded rectangle in px (optionally a frame around a rectangular hole), bevelled on its edges."""
    bm = bmesh.new()
    outer = [bm.verts.new((x * S, y * S, 0)) for x, y in rect(w, h)]
    if hole:
        inner = [bm.verts.new((x * S, y * S, 0)) for x, y in rect(*hole)]
        for i in range(4): bm.faces.new((outer[i], outer[(i + 1) % 4], inner[(i + 1) % 4], inner[i]))
    else:
        bm.faces.new(outer)
    ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, depth * S))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); ob.location.z = z * S
    mod = ob.modifiers.new("bev", "BEVEL"); mod.width = bev * S; mod.segments = 6; mod.limit_method = "ANGLE"; mod.harden_normals = True
    ob.data.materials.append(m)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def light(kind, px, z, energy, color, size):
    ld = bpy.data.lights.new(kind, kind); ld.energy = energy; ld.color = color; ld.shadow_soft_size = size
    ob = bpy.data.objects.new(ld.name, ld); ob.location = (px[0] * S, px[1] * S, z); bpy.context.scene.collection.objects.link(ob)

def scene(style, glow_only=False):
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    walnut = mat("walnut", f"{TILES}/tex_walnut_s7.png", rough=0.35, bump=0.15, tint=(0.42, 0.36, 0.32))
    brass = mat("brass", f"{KIT}/ai/tex_brass_s7.png", color=(0.78, 0.52, 0.22), metal=1, rough=0.42, bump=0.05, tint=(0.9, 0.72, 0.42), tile=2.0)  # antique, satin
    gilt = mat("gilt", f"{KIT}/ai/tex_brass_s7.png", metal=1, rough=0.3, bump=0.05, tint=(1, 0.84, 0.5), tile=2.0)  # burnished gilt
    pewter = mat("pewter", f"{KIT}/ai/tex_brass_s7.png", metal=1, rough=0.35, bump=0.05, tint=(0.5, 0.5, 0.54), tile=2.0)
    ebony = mat("ebony", f"{TILES}/tex_walnut_s7.png", rough=0.25, bump=0.12, tint=(0.06, 0.06, 0.07))
    calf = lambda t: mat("calf", f"{TILES}/tex_calf_s7.png", rough=0.6, bump=0.25, tint=t, tile=2.0)
    frame, trim, panel = {
        "classic": (walnut, brass, calf((0.2, 0.15, 0.12))),
        "gold": (brass, gilt, calf((0.24, 0.16, 0.09))),
        "obsidian": (ebony, pewter, mat("slate", f"{TILES}/tex_slate_s7.png", rough=0.7, bump=0.2, tint=(0.2, 0.2, 0.22), tile=2.0)),
        "golden": (gilt, gilt, calf((0.2, 0.07, 0.05))),  # gilt on oxblood, with a wider fillet
    }[style]
    inner = (W - 2 * BORDER, H - 2 * BORDER)
    slab("panel", *inner, 6, 0, panel, 2)
    slab("frame", W + 40, H + 40, 34, 0, frame, 10, hole=inner)  # frame runs past the crop, so the plate is full bleed
    slab("lip", inner[0] + 44, inner[1] + 44, 10, 34, frame, 6, hole=inner)  # raised moulding at the frame's inner edge
    fillet = FILLET * (2 if style == "golden" else 1)
    slab("fillet", inner[0], inner[1], 3, 6, trim, 1.2, hole=(inner[0] - 2 * fillet, inner[1] - 2 * fillet))
    ball = (BALL[0] - W / 2, H / 2 - BALL[1])
    if glow_only:  # the ball's own warm light, a little in front of the panel; nothing else lights the pass
        light("POINT", ball, 0.2, 45, (1.0, 0.55, 0.2), 0.12)
    else:
        light("POINT", (-760, 1300), 1.1, ENERGY * 1500, (1.0, 0.62, 0.32), 0.35)  # candle key, upper left
        light("POINT", (900, -1200), 0.6, ENERGY * 300, (1.0, 0.45, 0.18), 0.5)    # fire rim, low lower right
        light("AREA", (0, 0), 3.0, ENERGY * 40, (0.55, 0.65, 1.0), 3)              # skylight moon fill
        w = bpy.data.worlds.new("room"); w.use_nodes = True; sc.world = w; WN, WL = w.node_tree.nodes, w.node_tree.links
        env = WN.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(ROOM_ENV)  # what the metal reflects
        WL.new(env.outputs[0], WN["Background"].inputs[0]); WN["Background"].inputs[1].default_value = ENERGY * 0.25
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
    cam.data.type = "ORTHO"; cam.data.ortho_scale = H * S; cam.location = (0, 0, 3); sc.camera = cam
    r = sc.render; r.resolution_x, r.resolution_y = round(W * SCALE), round(H * SCALE)
    r.engine = "CYCLES"; sc.cycles.samples = 64 if SCALE == 1 else 16; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
    p = bpy.context.preferences.addons["cycles"].preferences; p.compute_device_type = "METAL"; p.get_devices()
    for d in p.devices: d.use = True
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGB"
    r.filepath = os.path.abspath(f".local/share-plates/raw-{style}{'-glow' if glow_only else ''}.png")
    bpy.ops.render.render(write_still=True)
    return np.asarray(Image.open(r.filepath).convert("RGB"))

def luminance(rgb):
    c = rgb / 255; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return c @ [0.2126, 0.7152, 0.0722]

save = lambda a, name, size=None: Image.fromarray(a.astype(np.uint8)).resize(size or (round(W * SCALE), round(H * SCALE)), Image.LANCZOS).save(f"{OUT}/{name}.jpg", quality=84, optimize=True, progressive=True)
for style in ("classic", "gold", "obsidian", "golden"):
    plate = scene(style); save(plate, style)
    # The text bands (category to footer) must hold the muted footer ink (#B9AB97) at 4.5:1 or better.
    y0, y1, x0, x1 = (round(v * SCALE) for v in (900, 1700, 90, 990))
    bg = np.percentile(luminance(plate[y0:y1, x0:x1].astype(float)), 95)
    print(style, f"text band 95th luminance {bg:.4f}, muted contrast {(0.4167 + 0.05) / (bg + 0.05):.2f}:1")
# One glow for every style: almost all of the ball's light lands on the panel, which the styles share in shape.
# ponytail: shared light pass; render per style if a frame's sheen visibly disagrees during the clip's glow.
save(scene("classic", glow_only=True), "glow", (round(W * SCALE / 2), round(H * SCALE / 2)))  # soft light: half size is enough
