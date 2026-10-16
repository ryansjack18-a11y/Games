/* ===================== UI: SPRITES (artwork cut from art/sheet.png) ===================== */
// A picture of a character or boss. Sized in em so callers set the size with font-size:
// 10em wide, tall enough to keep the picture's own proportions.
function spriteHTML(id, extra) {
  const d = SPRITE_SIZE[id] || [100, 100];
  return `<div class="spr spr-${id}${extra ? ' ' + extra : ''}" style="width:10em;height:${(10 * d[1] / d[0]).toFixed(2)}em"></div>`;
}
// A small icon (heart, coin, potion, ...) that sits in a line of text
function iconHTML(name) { return `<i class="ico spr-${name}" aria-hidden="true"></i>`; }
// A trinket's icon: artwork when the sheet has a matching one, otherwise its emoji
function trinketIconHTML(t) { return t.sprite ? iconHTML(t.sprite) : t.icon; }
// A stat's icon (hammer, star, book) and a map room's icon
function statIconHTML(st) { return iconHTML(STAT_INFO[st].sprite); }
function roomIconHTML(t) { return t.sprite ? iconHTML(t.sprite) : t.icon; }
