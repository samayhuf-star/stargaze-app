const sharp = require('sharp');
const SRC = '/home/dev/android-publish/listings/assets/stargaze/stargaze-phone-';
const OUT = process.argv[2];
const W = 1290, H = 2796, SW = 1000, SH = Math.round(SW * 1920 / 1080), BZ = 26, PX = (W - SW) / 2, PY = 700;
const F = "font-family='DejaVu Sans'";
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// app-style onboarding screen (1080x1920) built from the same art as OnboardArt.tsx
const frameArt = (seed, inner) => {
  let r = seed, dots = '';
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) dots += `<circle cx='${rnd() * 280}' cy='${rnd() * 280}' r='${0.6 + rnd() * 1.4}' fill='#dbe6ff' opacity='${0.35 + rnd() * 0.6}'/>`;
  return `<defs><radialGradient id='bg' cx='50%' cy='40%' r='75%'><stop offset='0' stop-color='#1f2f7a'/><stop offset='1' stop-color='#060a1c'/></radialGradient>
  <radialGradient id='glow' cx='50%' cy='50%' r='50%'><stop offset='0' stop-color='#ffe9a8' stop-opacity='0.9'/><stop offset='1' stop-color='#ffe9a8' stop-opacity='0'/></radialGradient></defs>
  <rect width='280' height='280' rx='44' fill='url(#bg)'/>${dots}${inner}`;
};
const T = (x, y, s, t, a = 'middle', c = '#e8efff', w = 700) => `<text x='${x}' y='${y}' fill='${c}' font-size='${s}' font-weight='${w}' text-anchor='${a}' ${F}>${esc(t)}</text>`;
const ART = {
  meteors: frameArt(97, `<circle cx='190' cy='80' r='16' fill='url(#glow)'/>` + [[175, 95, 60, 170], [182, 100, 120, 220], [200, 98, 230, 190], [170, 80, 70, 110], [205, 75, 255, 120]].map(([a, b, c, d], i) => `<line x1='${a}' y1='${b}' x2='${c}' y2='${d}' stroke='#fff7e0' stroke-width='${2.6 - i * 0.3}' stroke-linecap='round' opacity='${0.95 - i * 0.12}'/>`).join('') + T(140, 254, 14, 'Geminids · peak 13–14 Dec')),
  tonight: frameArt(83, [['Jupiter', '19:42 rise', '#ffe3b3'], ['Saturn', 'up now', '#f3d9a0'], ['Moon', '62% lit', '#f3efe0'], ['Mars', '23:10 rise', '#ffb08a']].map(([n, t, c], i) => `<rect x='44' y='${50 + i * 44}' width='192' height='34' rx='12' fill='#0c1226' stroke='#7fb2ff' stroke-opacity='0.35'/><circle cx='66' cy='${67 + i * 44}' r='7' fill='${c}'/>` + T(82, 72 + i * 44, 13, n, 'start') + T(224, 72 + i * 44, 12, t, 'end', '#9fb3dd', 400)).join('') + T(140, 246, 14, "What's up tonight")),
  camera: frameArt(71, `<rect x='92' y='46' width='96' height='176' rx='18' fill='#0a1024' stroke='#7fb2ff' stroke-width='2.5'/><path d='M100 160 Q140 140 180 156 V212 H100 Z' fill='#1c2a45'/><path d='M112 96 L136 82 L160 100 L172 86' stroke='#7fb2ff' stroke-opacity='0.8' stroke-width='1.8' fill='none'/>` + [[112, 96], [136, 82], [160, 100], [172, 86]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='3' fill='#fff7e0'/>`).join('') + T(140, 128, 10, 'Cassiopeia') + T(140, 254, 14, 'Live camera + star labels')),
  bell: frameArt(109, `<circle cx='140' cy='128' r='60' fill='url(#glow)' opacity='0.35'/><path d='M100 160 Q100 96 140 90 Q180 96 180 160 L192 176 H88 Z' fill='#7fb2ff'/><circle cx='140' cy='186' r='10' fill='#7fb2ff'/><path d='M140 112 L145 124 L158 125 L148 133 L151 146 L140 139 L129 146 L132 133 L122 125 L135 124 Z' fill='#fff7e0'/><rect x='54' y='222' width='172' height='32' rx='14' fill='#0c1226' stroke='#7fb2ff' stroke-opacity='0.5'/>` + T(140, 243, 12, 'ISS overhead in 5 min')),
};
const wrap = (t, n) => { const out = []; let l = ''; for (const w of t.split(' ')) { if ((l + ' ' + w).trim().length > n) { out.push(l); l = w; } else l = (l + ' ' + w).trim(); } out.push(l); return out; };
const onboardScreen = (art, title, body, btn, dot, link) => {
  const sc = 2.7, ax = (1080 - 280 * sc) / 2, ay = 330;
  const tl = wrap(title, 22), bl = wrap(body, 40);
  let y = ay + 280 * sc + 120;
  let txt = tl.map((l, i) => T(540, y + i * 84, 70, l, 'middle', '#e8efff', 800)).join(''); y += tl.length * 84 + 40;
  txt += bl.map((l, i) => T(540, y + i * 62, 43, l, 'middle', '#9fb3dd', 400)).join('');
  const dots = Array.from({ length: 10 }, (_, i) => i === dot ? `<rect x='${430 + i * 24}' y='1668' width='58' height='18' rx='9' fill='#8ab4ff'/>` : `<circle cx='${(i > dot ? 470 : 439) + i * 24}' cy='1677' r='9' fill='#ffffff' opacity='0.22'/>`).join('');
  return Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='1080' height='1920' fill='#03050d'/>
  ${T(1000, 90, 40, 'Skip', 'end', '#9fb3dd', 600)}<g transform='translate(${ax} ${ay}) scale(${sc})'>${art}</g>${txt}${dots}
  <rect x='64' y='1730' width='952' height='118' rx='59' fill='#8ab4ff'/>${T(540, 1805, 46, btn, 'middle', '#04101f', 800)}${link ? T(540, 1900, 40, link, 'middle', '#9fb3dd', 600) : ''}</svg>`);
};

const SHOTS = [
  { src: 1, cap: ['Find any star', 'or planet'], sub: 'Point your phone and see what is up' },
  { src: 2, cap: ['Search 2,850 stars', '& deep-sky objects'], sub: 'Then follow the arrow to it', mask: true },
  { src: 3, cap: ['Sky Align points', 'the right way'], sub: 'One tap locks the map to the real sky' },
  { svg: () => onboardScreen(ART.camera, 'See it through your camera', 'AR mode labels the real sky behind your camera, so the dot you see is the star you are looking at.', 'Next', 3), cap: ['AR camera view', 'with live labels'], sub: 'Stars and planets over the real sky' },
  { svg: () => onboardScreen(ART.tonight, "Tonight's sky, planned", 'Which planets are up, when they rise and set, and how bright the Moon is. No ads, ever.', 'Next', 4), cap: ["Know what's up", 'tonight'], sub: 'Planet rise and set times, Moon phase' },
  { svg: () => onboardScreen(ART.meteors, 'Catch the Geminids', 'The best meteor shower of the year peaks on 13–14 December. Stargaze shows you where to look and when.', 'Next', 5), cap: ['Catch the Geminids', '13–14 December'], sub: 'Where to look, and when' },
  { src: 4, cap: ['Spot the ISS', '& meteor showers'], sub: 'Flyover times for your location' },
  { svg: () => onboardScreen(ART.bell, 'Never miss a sky event', 'Get a heads-up for meteor shower peaks, ISS flyovers and bright planets. A few a month, no spam.', 'Turn on reminders', 8, 'Not now'), cap: ['Never miss', 'a sky event'], sub: 'Reminders for ISS passes and meteor peaks' },
  { src: 5, cap: ['Free to start.', 'Pro unlocks it all'], sub: 'Works offline · No ads, ever' },
];

const bg = Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><defs><linearGradient id='g' x1='0' y1='0' x2='0.4' y2='1'><stop offset='0' stop-color='#1b2a6b'/><stop offset='0.55' stop-color='#070b1f'/><stop offset='1' stop-color='#03050d'/></linearGradient></defs><rect width='${W}' height='${H}' fill='url(#g)'/>
${(() => { let r = 7, s = ''; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280); for (let i = 0; i < 140; i++) s += `<circle cx='${rnd() * W}' cy='${rnd() * H}' r='${1 + rnd() * 2.6}' fill='#dbe6ff' opacity='${0.15 + rnd() * 0.5}'/>`; return s; })()}</svg>`);

(async () => {
  let n = 0;
  for (const s of SHOTS) {
    n++;
    let img;
    if (s.svg) img = sharp(s.svg()).png();
    else {
      img = sharp(SRC + s.src + '.png');
      if (s.mask) img = sharp(await img.composite([{ input: Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect x='0' y='112' width='1080' height='62' fill='#03050d'/></svg>`), top: 0, left: 0 }]).png().toBuffer());
      if (s.crop) img = sharp(await img.extract(s.crop).png().toBuffer()).resize(1080, 1920, { fit: 'cover', position: 'top' });
    }
    const screen = await img.resize(SW, SH, { fit: 'cover' }).composite([{ input: Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='${SW}' height='${SH}'><rect width='${SW}' height='${SH}' rx='70'/></svg>`), blend: 'dest-in' }]).png().toBuffer();
    const frame = Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>
      <rect x='${PX - BZ}' y='${PY - BZ}' width='${SW + 2 * BZ}' height='${SH + 2 * BZ}' rx='${70 + BZ}' fill='#0b0d14' stroke='#3a4566' stroke-width='5'/>
      ${T(W / 2, 250, 96, s.cap[0], 'middle', '#ffffff', 800)}${T(W / 2, 365, 96, s.cap[1], 'middle', '#8ab4ff', 800)}${T(W / 2, 470, 46, s.sub, 'middle', '#b9c6e6', 400)}</svg>`);
    const island = Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><rect x='${W / 2 - 150}' y='${PY + 26}' width='300' height='84' rx='42' fill='#000'/></svg>`);
    const f = `${OUT}/stargaze-${String(n).padStart(2, '0')}.png`;
    await sharp(bg).composite([{ input: frame }, { input: screen, left: PX, top: PY }, ...(s.svg ? [{ input: island }] : [])]).flatten({ background: '#03050d' }).removeAlpha().png({ compressionLevel: 9 }).toFile(f);
    console.log(f);
  }
})();
