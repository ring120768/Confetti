"""Regenerate all app icons with Buzz-in-heart. Writes .new then os.replace."""
from PIL import Image
import glob, os

buzz = Image.open("public/buzz-heart.png")  # RGBA, transparent bg
CREAM = (250, 246, 238, 255)

def master(canvas_bg, content_frac):
    c = Image.new("RGBA", (1024, 1024), canvas_bg)
    b = buzz.copy()
    b.thumbnail((int(1024 * content_frac), int(1024 * content_frac)), Image.LANCZOS)
    c.paste(b, ((1024 - b.width) // 2, (1024 - b.height) // 2), b)
    return c

icon_master = master(CREAM, 0.92)          # bold crop for launchers
fore_master = master((0, 0, 0, 0), 0.62)   # adaptive-icon safe zone, transparent

def write(img, path, size, opaque):
    out = img.resize((size, size), Image.LANCZOS)
    if opaque:
        out = out.convert("RGB")
    tmp = path + ".new"
    out.save(tmp, format="PNG", optimize=True)
    os.replace(tmp, path)
    print("done:", path, flush=True)

for path in glob.glob("android/app/src/main/res/mipmap*/ic_launcher*.png"):
    w, _ = Image.open(path).size
    if "foreground" in path:
        write(fore_master, path, w, opaque=False)
    else:
        write(icon_master, path, w, opaque=True)

write(icon_master, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", 1024, opaque=True)

# refresh the source-of-truth master used by tooling
tmp = "assets/icon-only.png.new"
icon_master.convert("RGB").save(tmp, format="PNG", optimize=True)
os.replace(tmp, "assets/icon-only.png")
print("ALL ICONS DONE")
