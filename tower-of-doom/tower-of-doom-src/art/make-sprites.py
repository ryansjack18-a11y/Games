#!/usr/bin/env python3
"""Cuts art/sheet.png and art/sheet2.png into sprites and writes src/sprites.css + src/sprites.js.

Run from anywhere:  python3 tower-of-doom-src/art/make-sprites.py
The sheet is 1536x1024: 10 player cards, 10 monsters, 3 bosses, 8 icons (+ extras we do not use).
Card art is cut inside the card border and above the name label.
"""
import base64, io, json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'src')
sheet = Image.open(os.path.join(HERE, 'sheet.png')).convert('RGB')

# Card columns (x ranges) found by scanning the sheet for non-background pixels
PLAYER = ['knight', 'archer', 'wizard', 'cleric', 'rogue', 'barbarian', 'icemage', 'druid', 'ninja', 'engineer']
PLAYER_X = [(18, 169), (179, 334), (344, 493), (503, 645), (655, 798), (808, 944), (954, 1090), (1099, 1233), (1242, 1373), (1382, 1518)]
MONSTER = ['slime', 'skeleton', 'goblin', 'orc', 'spider', 'ghost', 'troll', 'darkmage', 'vampire', 'dragonling']
MONSTER_X = [(23, 174), (183, 330), (339, 482), (491, 631), (640, 775), (785, 923), (932, 1069), (1078, 1218), (1228, 1365), (1375, 1513)]
BOSS = ['boneking', 'lavatitan', 'evilking']
BOSS_X = [(22, 391), (402, 764), (775, 1133)]
ICON = ['heart', 'potion', 'coin', 'gem', 'sword', 'shield', 'star', 'crown']
ICON_X = [(1172, 1248), (1258, 1335), (1343, 1418), (1428, 1502)]
ICON_Y = [(776, 830), (850, 904)]

sprites = {}   # id -> (PIL image, mime)

def card_art(x0, x1, y0):  # inside the 4-5px border, above the ~40px name label
    return sheet.crop((x0 + 8, y0 + 8, x1 - 7, y0 + 158))
for n, (x0, x1) in zip(PLAYER, PLAYER_X): sprites[n] = (card_art(x0, x1, 59), 'jpeg')
for n, (x0, x1) in zip(MONSTER, MONSTER_X): sprites[n] = (card_art(x0, x1, 323), 'jpeg')
for n, (x0, x1) in zip(BOSS, BOSS_X): sprites[n] = (sheet.crop((x0 + 9, 594 + 9, x1 - 8, 594 + 296)), 'jpeg')

def main_picture(im, near=1, min_share=0.2):
    """Drop the specks left over from panel borders: keep the biggest blob plus any blob that is near it or big."""
    a = im.split()[3]; w, h = im.size; px = a.load()
    label = [[0] * w for _ in range(h)]; comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y] > 40 and not label[y][x]:
                n = len(comps) + 1; stack = [(x, y)]; label[y][x] = n; cells = []
                while stack:
                    cx, cy = stack.pop(); cells.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and px[nx, ny] > 40 and not label[ny][nx]:
                                label[ny][nx] = n; stack.append((nx, ny))
                comps.append(cells)
    if not comps: return im
    big = max(comps, key=len)
    bx0, bx1 = min(c[0] for c in big), max(c[0] for c in big); by0, by1 = min(c[1] for c in big), max(c[1] for c in big)
    keep = set()
    for cells in comps:
        xs = [c[0] for c in cells]; ys = [c[1] for c in cells]
        close = min(xs) <= bx1 + near and max(xs) >= bx0 - near and min(ys) <= by1 + near and max(ys) >= by0 - near
        if cells is big or (close and len(cells) >= 12) or len(cells) >= min_share * len(big):
            keep.update(cells)
    out = im.copy(); op = out.load()
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep: op[x, y] = (0, 0, 0, 0)
    return out

def centre_picture(im, near=2, min_cells=12):
    """Keep the item in the middle of a crop: the blob under the centre plus small pieces touching its box.
    Neighbouring items and panel lines (separate blobs) are dropped."""
    import numpy as np
    a = np.array(im.split()[3]) > 40; h, w = a.shape
    lab = np.zeros((h, w), int); comps = []
    for y in range(h):
        for x in range(w):
            if a[y, x] and not lab[y, x]:
                n = len(comps) + 1; stack = [(x, y)]; lab[y, x] = n; cells = []
                while stack:
                    cx, cy = stack.pop(); cells.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and a[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; stack.append((nx, ny))
                comps.append(cells)
    if not comps: return im
    def dist(cells):  # distance from the crop centre to the blob's nearest pixel
        return min(abs(x - w / 2) + abs(y - h / 2) for x, y in cells)
    main = max((c for c in comps if len(c) >= 40), key=lambda c: len(c) / (1 + dist(c) / 6.0))
    bx0, bx1 = min(c[0] for c in main), max(c[0] for c in main); by0, by1 = min(c[1] for c in main), max(c[1] for c in main)
    keep = set(main)
    for cells in comps:
        if cells is main or len(cells) < min_cells: continue
        xs = [c[0] for c in cells]; ys = [c[1] for c in cells]
        if min(xs) <= 0 or max(xs) >= w - 1 or min(ys) <= 0 or max(ys) >= h - 1: continue
        if min(xs) >= bx0 - near and max(xs) <= bx1 + near and min(ys) >= by0 - near and max(ys) <= by1 + near: keep.update(cells)
    out = im.copy(); op = out.load()
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep: op[x, y] = (0, 0, 0, 0)
    return out

def cutout(im, near=22, hole_min=25):
    """Make an icon's dark panel background transparent while keeping its dark outline whole.
    Pixels close to the background colour that touch the edge (or form a big hole, like a ring's centre) become
    transparent; the edge pixels next to them are softened. Nothing else is touched, so outlines stay solid."""
    import numpy as np
    a = np.array(im.convert('RGBA')).astype(int)
    h, w = a.shape[:2]
    ring = np.concatenate([a[:2, :, :3].reshape(-1, 3), a[-2:, :, :3].reshape(-1, 3), a[:, :2, :3].reshape(-1, 3), a[:, -2:, :3].reshape(-1, 3)])
    bg = np.median(ring, axis=0)
    diff = np.abs(a[:, :, :3] - bg).sum(axis=2)
    isbg = diff < near
    lab = [[0] * w for _ in range(h)]; clear = np.zeros((h, w), bool); n = 0
    for y in range(h):
        for x in range(w):
            if isbg[y, x] and not lab[y][x]:
                n += 1; stack = [(x, y)]; lab[y][x] = n; cells = []; edge = False
                while stack:
                    cx, cy = stack.pop(); cells.append((cx, cy))
                    if cx in (0, w - 1) or cy in (0, h - 1): edge = True
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and isbg[ny, nx] and not lab[ny][nx]:
                            lab[ny][nx] = n; stack.append((nx, ny))
                if edge or len(cells) >= hole_min:
                    for cx, cy in cells: clear[cy, cx] = True
    alpha = np.where(clear, 0, 255)
    # soften the pixels touching the cleared area so edges blend instead of showing a dark fringe
    grown = clear.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            grown |= np.roll(np.roll(clear, dy, 0), dx, 1)
    soft = np.clip((diff - 8) / 34.0, 0, 1) * 255
    alpha = np.where(grown & ~clear, np.minimum(alpha, soft), alpha)
    a[:, :, 3] = alpha.astype(int)
    return Image.fromarray(a.astype('uint8'), 'RGBA')

# Icons: remove the dark tile background (flood fill from the edges so the black outline stays)
def icon(box):
    im = cutout(sheet.crop(box))
    im = main_picture(im)
    im = im.crop(im.getbbox())
    side = max(im.size) + 6
    out = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    out.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return out.resize((64, 64), Image.LANCZOS)
k = 0
for (y0, y1) in ICON_Y:
    for (x0, x1) in ICON_X:
        sprites[ICON[k]] = (icon((x0 + 9, y0, x1 - 9, y1)), 'png'); k += 1


# ------------------------------------------------------------------------------------------
# Second sheet (art/sheet2.png): logo, backgrounds, tiles, card frames/back/backgrounds,
# more icons and items, buttons and UI pieces. Boxes were measured from the sheet.
# ------------------------------------------------------------------------------------------
sheet2 = Image.open(os.path.join(HERE, 'sheet2.png')).convert('RGB')


def keyed(box, inner=0, thresh=26, size=None, pad=3, src=None):
    """Crop a box and make the dark panel background around the picture transparent."""
    im = (src or sheet2).crop(box).convert('RGBA')
    w, h = im.size
    pts = [(x, y) for x in range(0, w, 3) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 3) for x in (0, w - 1)]
    seen = set()
    for pt in pts:
        if pt in seen or im.getpixel(pt)[3] == 0: continue
        ImageDraw.floodfill(im, pt, (0, 0, 0, 0), thresh=thresh)
    im = main_picture(im)
    im = im.crop(im.getbbox())
    if size:
        side = max(im.size) + pad * 2
        out = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        out.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        return out.resize((size, size), Image.LANCZOS)
    return im

def around(cx, cy, r=25): return (cx - r, cy - r, cx + r, cy + r)

# Logo (title screen)
sprites['logo'] = (keyed((16, 12, 318, 186), thresh=22), 'png')

# Level backgrounds (wide banners) and floor tiles
for name, (y0, y1) in zip(['bg-castle', 'bg-lava', 'bg-storm'], [(484, 570), (579, 664), (673, 756)]):
    sprites[name] = (sheet2.crop((485, y0, 906, y1)), 'jpeg')
for name, x in zip(['tile-stone', 'tile-cobble', 'tile-brick'], [114, 180, 243]):
    sprites[name] = (sheet2.crop((x, 489, x + 48, 537)), 'jpeg')

# Card frames (interior and corners made transparent so the artwork shows), back and backgrounds
FRAMES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
FRAME_X = [(941, 1017), (1027, 1103), (1113, 1190), (1200, 1277), (1288, 1365)]
for n, (x0, x1) in zip(FRAMES, FRAME_X):
    fr = sheet2.crop((x0 - 1, 495, x1 + 2, 608)).convert('RGBA')
    w, h = fr.size
    for pt in [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2), (w // 2, h // 2)]:
        ImageDraw.floodfill(fr, pt, (0, 0, 0, 0), thresh=34)
    sprites['frame-' + n] = (fr, 'png')
sprites['cardback'] = (sheet2.crop((1400, 497, 1512, 649)), 'jpeg')
for n, (x0, x1) in zip(['blue', 'green', 'purple', 'red', 'gold'], [(368, 452), (460, 541), (550, 630), (641, 722), (731, 812)]):
    sprites['cardbg-' + n] = (sheet2.crop((x0, 813, x1, 986)), 'jpeg')

# Items, weapons, equipment and symbols (each cell is cut out and made transparent)
ITEMS = {  # name: (cx, cy)
    'potion-red': (739, 277), 'potion-blue': (795, 277), 'potion-green': (851, 277), 'potion-purple': (907, 277),
    'key': (851, 349), 'bow': (739, 349), 'staff': (795, 349),
    'gem-red': (627, 409), 'gem-blue': (684, 409), 'gem-green': (739, 409), 'skull': (912, 409),
    'hammer': (1162, 293), 'spear': (1206, 293),
    'helmet': (999, 381), 'armor': (1056, 381), 'boots': (1106, 381), 'ring': (1206, 381),
    'fire': (1295, 281), 'snowflake': (1346, 281), 'bolt': (1396, 281), 'leaf': (1445, 281), 'swirl': (1493, 281),
    'book': (254, 830), 'chest': (292, 830), 'trophy': (327, 830), 'question': (214, 830), 'bang': (175, 830),
    'check': (99, 942), 'cross': (142, 942),
    'gear': (1335, 750), 'help': (1487, 750), 'tower': (1335, 699),
}
for n, (cx, cy) in ITEMS.items():
    r = 22 if n in ('gear', 'help') else 34 if n in ('armor', 'helmet', 'boots', 'ring', 'hammer', 'spear', 'staff', 'bow') else 28
    im = cutout(sheet2.crop(around(cx, cy, r)))
    im = centre_picture(im); im = im.crop(im.getbbox())
    side = max(im.size) + 6
    out = Image.new('RGBA', (side, side), (0, 0, 0, 0)); out.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sprites[n + '-2'] = (out.resize((64, 64), Image.LANCZOS), 'png')

# Buttons and dialog box (corners made transparent; used as 9-slice borders, text in the pictures is not used)
for n, box in {'btn-purple': (846, 906, 964, 945), 'btn-gold': (1093, 951, 1192, 991), 'dialog': (907, 806, 1192, 864)}.items():
    sprites[n] = (keyed(box, thresh=30), 'png')

css, dims, uris = [], {}, {}
SKIN_ONLY = ('frame-', 'btn-', 'dialog', 'cardbg-')   # used only as 9-slice borders (rules below), not as .spr-* pictures
for name, (im, mime) in sprites.items():
    buf = io.BytesIO()
    if mime == 'jpeg': im.convert('RGB').save(buf, 'JPEG', quality=86, optimize=True)
    else: im.save(buf, 'PNG', optimize=True)
    uris[name] = 'data:image/%s;base64,%s' % (mime, base64.b64encode(buf.getvalue()).decode())
    dims[name] = [im.width, im.height]
    if not name.startswith(SKIN_ONLY): css.append('.spr-%s{background-image:url(%s)}' % (name, uris[name]))
def skin(selector, name): css.append('%s{border-image-source:url(%s)}' % (selector, uris[name]))
skin('.btn::before', 'btn-purple'); skin('.btn.gold::before', 'btn-gold'); skin('.speech', 'dialog')
for r in FRAMES: skin('.card.r-%s::after' % r, 'frame-' + r)
def bgrule(selector, name): css.append('%s{background-image:url(%s)}' % (selector, uris[name]))
for r, c in zip(FRAMES, ['blue', 'green', 'blue', 'purple', 'gold']): bgrule('.card.r-%s::before' % r, 'cardbg-' + c)
with open(os.path.join(SRC, 'sprites.css'), 'w') as f:
    f.write('/* GENERATED by art/make-sprites.py from art/sheet.png and art/sheet2.png. Do not edit. */\n' + '\n'.join(css) + '\n')
with open(os.path.join(SRC, 'sprites.js'), 'w') as f:
    f.write('/* GENERATED by art/make-sprites.py. Pixel sizes of each sprite (for aspect ratios). */\nconst SPRITE_SIZE = ' + json.dumps(dims, separators=(',', ':')) + ';\n')
total = sum(len(c) for c in css)
print('sprites:', len(sprites), ' css size: %.0f KB' % (total / 1024))
print({k: v for k, v in dims.items() if k in ('logo', 'btn-purple', 'btn-gold', 'dialog', 'frame-common', 'cardback', 'bg-castle')})
