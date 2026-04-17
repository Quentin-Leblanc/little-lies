"""Generate a simple social-sharing card for Among Liars.

Output: public/og-image.png (1200x630, the standard size for Open Graph
and Twitter Card previews).

Re-run this script any time the art direction changes. It uses Pillow
(pip install Pillow) and has no external asset dependency.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 1200, 630
OUT = Path(__file__).resolve().parent.parent / "public" / "og-image.png"

BG_TOP = (18, 12, 32)
BG_BOTTOM = (6, 6, 18)
ACCENT = (169, 110, 221)   # cult purple — matches in-game theme
HIGHLIGHT = (255, 199, 87) # warm highlight
MUTED = (170, 170, 200)

img = Image.new("RGB", (W, H), BG_TOP)
px = img.load()
# Vertical gradient
for y in range(H):
    t = y / (H - 1)
    r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
    g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
    b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
    for x in range(W):
        px[x, y] = (r, g, b)

draw = ImageDraw.Draw(img)

# Accent stripe left
draw.rectangle([(0, 0), (12, H)], fill=ACCENT)


def find_font(candidates, size):
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


TITLE = find_font([
    "C:/Windows/Fonts/georgiab.ttf",
    "C:/Windows/Fonts/timesbd.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
], 140)
SUBTITLE = find_font([
    "C:/Windows/Fonts/georgia.ttf",
    "C:/Windows/Fonts/arial.ttf",
], 40)
TAG = find_font([
    "C:/Windows/Fonts/arial.ttf",
], 28)


def draw_centered(text, font, y, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) // 2, y), text, font=font, fill=fill)


draw_centered("AMONG LIARS", TITLE, 180, HIGHLIGHT)
draw_centered(
    "Jeu de deduction sociale multijoueur",
    SUBTITLE, 360, (235, 235, 245),
)
draw_centered("2-15 joueurs  -  gratuit  -  sans telechargement", TAG, 440, MUTED)
draw_centered("mafia  -  culte  -  bluff  -  enquete", TAG, 490, ACCENT)

# Frame
draw.rectangle([(40, 40), (W - 40, H - 40)], outline=(80, 60, 110), width=2)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
