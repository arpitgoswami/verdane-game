/* Code-drawn pixel art: sprite atlas + pre-rendered garden backdrop.
 * Plants are loaded from the 24x24 PNGs under assets/sprites/plants;
 * zombies, projectiles, vases, and rocks come from the matrices below.
 * Matrices are normalized to their declared size at load, so trailing
 * transparent columns can be omitted while authoring.
 */
(function () {
  const V = (window.Verdane = window.Verdane || {});

  const ZPAL = {
    k: '#101a14', g: '#7fae6a', G: '#a8cf8b', d: '#557a45',
    s: '#5d6b8a', S: '#45516b', p: '#3b4a63', P: '#2c374a',
    o: '#e8933c', O: '#b3672a', m: '#b9c2c9', M: '#6f7a83',
    r: '#a34d5c', R: '#7a3743', y: '#ffc94a', Y: '#ffe28a', b: '#e9f5c9',
  };
  const BPAL = Object.assign({}, ZPAL, { g: '#5f8f52', G: '#86b56f', d: '#3f6638', s: '#4a3f63', S: '#362e4a' });
  const CPAL = { k: '#101a14', g: '#7fae6a', G: '#a8cf8b', m: '#b9c2c9', M: '#6f7a83', s: '#4a3f63', S: '#362e4a', o: '#e8933c', O: '#b3672a', y: '#ffc94a' };
  const SPAL = { k: '#101a14', y: '#ffc94a', Y: '#ffe28a' };
  const MPAL = { k: '#101a14', m: '#b9c2c9', M: '#6f7a83', g: '#7fae6a', G: '#a8cf8b' };
  const PPAL = { k: '#101a14', G: '#a8cf8b', g: '#7fae6a' };
  const FPAL = { k: '#101a14', b: '#bfe8ff', B: '#eaf9ff' };
  const XPAL = { k: '#101a14', o: '#ff8a3c', O: '#d85a1f', Y: '#ffe28a' };
  const DPAL = Object.assign({}, ZPAL, { n: '#b07a50', w: '#8a5a3c', W: '#5a3826' });
  const SPLITPAL = Object.assign({}, ZPAL, { q: '#e8708a', Q: '#b04a62' });
  const TPAL = {
    k: '#101a14', w: '#8a5a3c', n: '#b07a50', W: '#5a3826',
    g: '#7fae6a', G: '#a8cf8b', d: '#557a45',
    m: '#b9c2c9', M: '#6f7a83', s: '#5d6b8a', y: '#ffc94a', o: '#e8933c',
  };
  const VPAL = {
    k: '#101a14', c: '#e9f5c9', i: '#8fd0ff', I: '#4a8fc4',
    y: '#ffc94a', Y: '#ffe9a8', m: '#b9c2c9', M: '#6f7a83',
  };
  const RPAL = {
    k: '#101a14', m: '#b9c2c9', M: '#6f7a83', s: '#5d6b8a', S: '#45516b',
    g: '#7fae6a', G: '#a8cf8b', d: '#557a45',
  };
  const LPAL = { k: '#101a14', y: '#ffc94a', Y: '#ffe9a8', o: '#ff9a3c', O: '#d94f2b' };

  const gruntA = [
    '',
    '........kkkkkkkk',
    '......kkGGGGGGGGkk',
    '.....kGGGGGGGGGGGGk',
    '....kGGGGGGGGGGGGGGk',
    '....kGGkkGGGGkkGGGk',
    '....kGGkkGGGGkkGGGk',
    '....kGGGGGGGGGGGGGk',
    '....kGGkkkkkkGGGGk',
    '.....kGGkkkkkGGGk',
    '......kkGGGGGGGGk',
    '........kkkkkkkk',
    '.......kkkkkkkkkk',
    '......kssssssssssk',
    '..kkkkkssssssssssk',
    '.kggggkssssssssssk',
    '.kggggkSsssssssSSk',
    '..kkkkkSSSSSSSSSSk',
    '.......kppppppppk',
    '.......kpppk.kpppk',
    '......kpppk...kpppk',
    '......kppk.....kppk',
    '.....kkkk.......kkkk',
    '',
  ];

  const gruntB = gruntA.slice();
  gruntB[18] = '.......kppppppppk';
  gruntB[19] = '......kpppk..kpppk';
  gruntB[20] = '.....kpppk....kpppk';
  gruntB[21] = '.....kppk......kppk';
  gruntB[22] = '....kkkk........kkkk';

  const dasher = [
    '',
    '........kkkkkkk',
    '......kkGGGGGGGk',
    '.....kGGGGGGGGGGk',
    '....kGGGGGGGGGGGGk',
    '....kGGkkGGkkGGGk',
    '....kGGkkGGkkGGGk',
    '....kGGGGGGGGGGGk',
    '....kGGkkkkkkkGGk',
    '.....kGGGGGGGGGk',
    '......kkGGGGGGk',
    '........kkkkkkk',
    '.......kkkkkkkk',
    '......krrrrrrrrk',
    '..kkkkkrrrrrrrrk',
    '.kggggkrrrrrrrrk',
    '.kggggkRrrrrrRRk',
    '..kkkkkRRRRRRRRk',
    '.......kpppppppk',
    '......kpppk.kppk',
    '.....kpppk...kppk',
    '.....kppk.....kpk',
    '....kkkk.......kkk',
    '',
  ];

  const dasherB = dasher.slice();
  dasherB[18] = '.......kpppppppk';
  dasherB[19] = '.....kpppk..kppk';
  dasherB[20] = '....kpppk....kppk';
  dasherB[21] = '....kppk......kpk';
  dasherB[22] = '...kkkk........kkk';

  const cone = [
    '.......' + '....kk....',
    '.......' + '...koOk...',
    '.......' + '..koooOk..',
    '.......' + '.kooooOk..',
    '.......' + 'kooooooOk.',
    '.......' + 'kkkkkkkkkk',
  ];
  const bucket = [
    '......' + '..kkkkkkkk..',
    '......' + '.kmMMMMMMmk.',
    '......' + '.kmMMMMMMmk.',
    '......' + '.kmMMMMMMmk.',
    '......' + '.kmMMMMMMmk.',
    '......' + '..kkkkkkkk..',
  ];
  const headband = [
    '', '', '', '',
    '......' + '..yyyyyyyy..',
    '......' + '..yyyyyyyy..',
  ];
  const brutePads = [
    '', '', '', '', '', '', '', '', '', '', '', '', '',
    '....kMMkkkkkkkkMMk',
    '....kMMksssssskMMk',
  ];

  // Expansion art: the boss, props, and the new zombie silhouettes.
  const tunnelHelmet = [
    '......kkkkkkkkkk', '.....kyyyyyyyyyyk', '.....kyYYYYYYYYyk',
    '.....kkkkkkkkkkkk', '.......kYYYYk', '........kYYk',
  ];
  const tunnelDirt = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '..nn........nn', '.nwwn......nwwn', '..nn........nn', '',
    '..nn....nn', '.nwwn..nwwn', '..nn....nn', '..nnnnnnnnnnnn',
    '.nwwnnnnnnnnwwn',
  ];
  const shield = [
    '', '', '', '', '..kkkkkkkkk', '.kmmmmmmmmmk', '.kmMMMMMMMmk',
    '.kmMmmmmmMmk', '.kmMmmmmmMmk', '.kmMmmSmmMmk', '.kmMmmSSmMmk',
    '.kmMmmmmmMmk', '.kmMmmmmmMmk', '.kmMMMMMMMmk', '.kmmmmmmmmmk',
    '..kkkkkkkkk',
  ];
  const splitSeam = [
    '', '...........qq', '...........qq', '...........qq', '...........qq',
    '...........qq', '...........qq', '...........qq', '...........qq',
    '...........qq', '..........qqqq', '...........qq', '...........qq',
    '...........qq', '...........qq', '...........qq', '...........qq',
    '...........qq',
  ];
  const runnerBand = [
    '', '', '', '.....yyyyyyyyyyy', '.....YYYYYYYYYYY.yy',
    '.....yyyyyyyyyyy.YY',
  ];
  const runnerDust = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '..................mM', '.................mMMm', '..................mM',
  ];
  const sapperBomb = [
    '', '', '', '', '', '', '', '..........kyk',
    '..........koOk', '...........kOk', '..........kkkkkk',
    '.........kSSSSSSk', '........kSSSSSSSSk', '........kSSmmmmSSk',
    '........kSSmmmmSSk', '........kSSSSSSSSk', '.........kSSSSSSk',
    '..........kkkkkk',
  ];
  const splitling = [
    '................', '.....kkkkkk.....', '...kkGGGGGGkk...',
    '..kGGkkGGkkGGk..', '..kGGGGGGGGGGk..', '..kGGGkkkkGGGk..',
    '...kGGGGGGGGk...', '....kkGGGGkk....', '.....kkkkkk.....',
    '....kssssssk....', '...kssqqqqssk...', '...kssqqqqssk...',
    '....kssssssk....', '....ksskkssk....', '.....kk..kk.....',
    '................',
  ];
  const composter = [
    '.............kkkkkk.............',
    '............knnnnnnk............',
    '.........kkkknnnnnnkkkk.........',
    '.......kknnnnnnnnnnnnnnkk.......',
    '......knnnnnnnnnnnnnnnnnnk......',
    '......kwwwwwwwwwwwwwwwwwwk......',
    '.......kkkkkkkgggkkkkkkkk.......',
    '..kkkkknnnnnnnnnnnnnnnnnnnkkkkk.',
    '.knnnnknnnnnnnnnnnnnnnnnnnknnnnk',
    '.knwwnknwwwwwwwwwwwwwwwwwnknnnnk',
    '.knwwnknwggggggggggggggggwnknnnk',
    '..kkkkknwgkyggggggggggyggwnkkkk.',
    '.knnnnknwggggggggggggggggwnknnnk',
    '.knwwnknwgkkkkkkkkkkkkkkggwnknnk',
    '.knwwnknwggggggggggggggggwnknnnk',
    '.knnnnknwwwwwwwwwwwwwwwwwnknnnnk',
    '..kkkkknnnnnnnnnnnnnnnnnnnkkkkk.',
    '.......kknnnnnnnnnnnnnnnnkk......',
    '.........kkkkkkkkkkkkkkkk........',
    '........knnnk......knnnk.........',
    '........knnnk......knnnk.........',
    '........kwwWk......kwwWk.........',
    '.......kkwwWkk....kkwwWkk........',
    '........kkkkk......kkkkk.........',
  ];
  const vase = [
    '........kkkkkkkk........', '.......kyyyyyyyyk.......', '.......kyIIIIIIyk.......',
    '.......kcccccccck.......', '........kcccccck........', '......kkkcccccckkk......',
    '.....kcccccccccccck.....', '....kcccccccccccccck....', '....kcccyyyyyyycccck....',
    '....kcccyYYYYYycccck....', '....kcccccccccccccck....', '....kcccccccccccccck....',
    '...kcccccccccccccccck...', '...kccccccccMcccccccck..', '...kcccccccMccccccccck..',
    '...kcccccccccccccccccck.', '....kcccccccccccccccck..', '....kcccccccccccccccck..',
    '.....kcccccccccccccck...', '......kkcccccccccckk....', '........kkkkkkkk........',
    '', '', '',
  ];
  const rock = [
    '', '', '................kkkkkk...............', '..............kkmMMMMmmkk...........',
    '.............kmMMmmmmmmMmk..........', '...........kkmmMmmmmmmmmMMkk........',
    '..........kmmMmmmmmmmmmmmmMmk.......', '.........kmMmmmmmmmmmmmmmmMMk.......',
    '.........kmMmggmmmmmmmmmmmMMk.......', '........kmMgggGggmmmmmmmmmMMk.......',
    '........kmMgggGggmmmmmmmmmMMk.......', '........kmMMggggmmmmmmmmmmMMk.......',
    '........kmMmmmmmmmmmmmmmmmMMk.......', '........kmMmmmMmmmmMmmmmmmMMk.......',
    '........kmMmmmmmmmmmmmmmmmMMk.......', '.........kmMmmmmmmmmmmmmmmMk........',
    '.........kmMMmmmmmmmmmmmmMMk........', '..........kmMmmmmmmmmmmmMk..........',
    '..........kmmMmmmmmmmmmMmk..........', '...........kkmmMmmmmmMkk............',
    '.............kkkmmmmkk..............', '................kkkk................',
    '', '',
  ];
  const lob = ['.kkkk.', 'kYooYk', 'kYooYk', 'kYooYk', '.kYYk.', '..kk..'];

  const colossus = [
    '',
    '............kkkkkkkk',
    '..........kkGGGGGGGkk',
    '.........kGGGGGGGGGGGk',
    '.........kGGkkGGkkGGGk',
    '.........kGGkkGGkkGGGk',
    '.........kGGGGGGGGGGGk',
    '..........kGGkkkkkGGk',
    '...........kkkkkkkkk',
    '......kkkkkkkkkkkkkkkkkk',
    '....kkmmmmmmmmmmmmmmmmmmkk',
    '..kkmmMMMMMMMMMMMMMMMMmmkk',
    '.kmmMMkkkkkkkkkkkkkkMMmmk',
    'kmmMkkggggggggggggggkkMmmk',
    'kmmMkggggggggggggggggkMmmk',
    'kmmMkkggggggggggggggkkMmmk',
    '.kmmMMkkkkkkkkkkkkkkMMmmk',
    '..kkmmMMMMMMMMMMMMMMMMmmkk',
    '....kkmmmmmmmmmmmmmmmmkk',
    '.....kkkkkkkkkkkkkkkkkk',
    '...kkkk....kkkkkk....kkkk',
    '..kmmmmk..kmmmmmmk..kmmmmk',
    '..kmmmmk..kmmmmmmk..kmmmmk',
    '...kkkk....kkkkkk....kkkk',
  ];

  const sun = [
    '',
    '....k..kk..k',
    '.....kkyykk',
    '...kkyYYYYykk',
    '..kyYYYYYYYYyk',
    '..kyYkkYYkkYyk',
    '.kyYYkkYYkkYYyk',
    'kkyYYYYYYYYYYykk',
    'kkyYYkYYYYkYYykk',
    '.kyYYkkkkkkYYyk',
    '..kyYYYYYYYYyk',
    '..kyYYYYYYYYyk',
    '...kkyYYYYykk',
    '.....kkyykk',
    '....k..kk..k',
  ];

  const mower = [
    '',
    '......kkkkkkkk',
    '.....kmmmmmmmmk',
    '....kmMMMMMMMMmk',
    '....kmMkkkkkkMmk',
    '....kmMkggggkMmk',
    '....kmMkggggkMmk',
    '....kmMMMMMMMMmk',
    '....kmmmmmmmmmmk',
    '..kkkkkkkkkkkkkkkk',
    '.kmmkkkkkkkkkkkkmmk',
    '..kkk..........kkk',
  ];

  const pea = [
    '.kkkk.',
    'kGGGGk',
    'kGGggk',
    'kGgggk',
    '.kggk.',
    '..kk..',
  ];
  const frost = [
    '.kkkk.',
    'kbbbbk',
    'kbBBbk',
    'kbBBbk',
    '.kbbbk',
    '..kk..',
  ];
  const fire = [
    '.kkkk.',
    'kooook',
    'koYYok',
    'koYYok',
    '.koook',
    '..kk..',
  ];

  const raw = {
    sun: { size: 16, palette: SPAL, frames: [sun] },
    mower: { size: 20, palette: MPAL, frames: [mower] },
    pea: { size: 6, palette: PPAL, frames: [pea] },
    frost: { size: 6, palette: FPAL, frames: [frost] },
    fire: { size: 6, palette: XPAL, frames: [fire] },
    'zombie:grunt': { size: 24, palette: ZPAL, frames: [gruntA, gruntB] },
    'zombie:cone': { size: 24, palette: ZPAL, frames: [gruntA, gruntB], overlays: [{ rows: cone, x: 0, y: 0 }] },
    'zombie:bucket': { size: 24, palette: ZPAL, frames: [gruntA, gruntB], overlays: [{ rows: bucket, x: 0, y: 0 }] },
    'zombie:dasher': { size: 24, palette: ZPAL, frames: [dasher, dasherB] },
    'zombie:hurdler': { size: 24, palette: ZPAL, frames: [gruntA, gruntB], overlays: [{ rows: headband, x: 0, y: 0 }] },
    'zombie:brute': { size: 24, palette: BPAL, frames: [gruntA, gruntB], overlays: [{ rows: brutePads, x: 0, y: 0 }] },
    'zombie:colossus': { size: 32, h: 24, palette: CPAL, frames: [colossus] },
    'zombie:tunneler': { size: 24, palette: DPAL, frames: [gruntA, gruntB], overlays: [{ rows: tunnelHelmet, x: 0, y: 0 }, { rows: tunnelDirt, x: 0, y: 0 }] },
    'zombie:shielder': { size: 24, palette: ZPAL, frames: [gruntA, gruntB], overlays: [{ rows: shield, x: 0, y: 0 }] },
    'zombie:splitter': { size: 24, palette: SPLITPAL, frames: [gruntA, gruntB], overlays: [{ rows: splitSeam, x: 0, y: 0 }] },
    'zombie:runner': { size: 24, palette: ZPAL, frames: [dasher, dasherB], overlays: [{ rows: runnerBand, x: 0, y: 0 }, { rows: runnerDust, x: 0, y: 0 }] },
    'zombie:sapper': { size: 24, palette: ZPAL, frames: [gruntA, gruntB], overlays: [{ rows: sapperBomb, x: 0, y: 0 }] },
    'zombie:composter': { size: 32, h: 24, palette: TPAL, frames: [composter] },
    'zombie:splitling': { size: 16, palette: SPLITPAL, frames: [splitling] },
    vase: { size: 24, palette: VPAL, frames: [vase] },
    rock: { size: 32, h: 24, palette: RPAL, frames: [rock] },
    lob: { size: 6, palette: LPAL, frames: [lob] },
  };

  // Pad frames/overlays to the declared width and trim to the declared height.
  function normalize(def) {
    const size = def.size, h = def.h || size;
    const pad = rows => rows
      .slice(0, h)
      .map(row => (row.length >= size ? row.slice(0, size) : row + '.'.repeat(size - row.length)));
    def.frames = def.frames.map(pad);
    if (def.overlays) def.overlays = def.overlays.map(o => ({ x: o.x || 0, y: o.y || 0, rows: pad(o.rows) }));
    def.h = h;
    return def;
  }

  const MATRICES = {};
  Object.keys(raw).forEach(key => { MATRICES[key] = normalize(raw[key]); });

  const cache = new Map();
  const flashCache = new Map();
  const worlds = new Map();
  const canDraw = () => typeof document !== 'undefined' && !!document.createElement;

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function paint(ctx, rows, palette, ox, oy) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  function sprite(key, frame) {
    const def = MATRICES[key];
    if (!def) return null;
    const f = ((frame || 0) % def.frames.length + def.frames.length) % def.frames.length;
    const id = key + '#' + f;
    if (cache.has(id)) return cache.get(id);
    if (!canDraw()) return null;
    const c = makeCanvas(def.size, def.h);
    const ctx = c.getContext('2d');
    paint(ctx, def.frames[f], def.palette, 0, 0);
    (def.overlays || []).forEach(o => paint(ctx, o.rows, def.palette, o.x, o.y));
    cache.set(id, c);
    return c;
  }

  function flashSprite(key, frame) {
    const def = MATRICES[key];
    if (!def) return null;
    const f = ((frame || 0) % def.frames.length + def.frames.length) % def.frames.length;
    const id = key + '#' + f;
    if (flashCache.has(id)) return flashCache.get(id);
    const base = sprite(key, f);
    if (!base) return null;
    const c = makeCanvas(base.width, base.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    flashCache.set(id, c);
    return c;
  }

  function draw(ctx, key, x, y, size, opts) {
    const o = opts || {};
    const c = o.flash ? flashSprite(key, o.frame) : sprite(key, o.frame);
    if (!c) return false;
    const scale = size / c.width;
    const w = c.width * scale;
    const h = c.height * scale;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(c, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  const W = 1920, H = 1080, LX = 240, TOP = 140, CELL = 160, COLS = 9, ROWS = 5;

  function buildWorld(night) {
    const key = night ? 'night' : 'day';
    if (worlds.has(key)) return worlds.get(key);
    if (!canDraw()) return null;
    const c = makeCanvas(W, H);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;

    const grassA = night ? '#2a5a46' : '#4f9a53';
    const grassB = night ? '#33684f' : '#58a85c';
    const blade = night ? '#3c735a' : '#79c96e';
    const soil = night ? '#241d19' : '#3b2f2a';
    const soilEdge = night ? '#1a1512' : '#2b211d';
    const wood = night ? '#2f2320' : '#5b3a2c';
    const woodDark = night ? '#241b18' : '#452a20';
    const stone = night ? '#4a5350' : '#8d8d7a';
    const stoneDark = night ? '#343b39' : '#6c6c5d';
    const hedge = night ? '#14231d' : '#274b31';
    const hedgeLight = night ? '#1b3326' : '#356340';

    x.fillStyle = soil; x.fillRect(0, 0, W, H);
    x.fillStyle = soilEdge; x.fillRect(0, 0, W, TOP); x.fillRect(0, TOP + ROWS * CELL, W, H - (TOP + ROWS * CELL));

    // House wall along the left edge.
    x.fillStyle = wood; x.fillRect(0, 0, LX - 30, H);
    x.fillStyle = woodDark;
    for (let y = 0; y < H; y += 18) x.fillRect(0, y, LX - 30, 3);
    x.fillStyle = night ? '#3a2a24' : '#7a4a33';
    x.fillRect(0, 0, LX - 30, 62);
    x.fillStyle = night ? '#241b18' : '#452a20';
    for (let y = 8; y < 62; y += 14) for (let xx = (y % 28 ? 8 : 0); xx < LX - 30; xx += 28) x.fillRect(xx, y, 20, 2);

    // Door and windows.
    const glass = night ? '#3f6f66' : '#9fd9c0';
    const glassDark = night ? '#2a4f49' : '#6fae95';
    const frame = night ? '#2a211d' : '#4a3328';
    [[24, 132], [24, 286]].forEach(([wx, wy]) => {
      x.fillStyle = frame; x.fillRect(wx, wy, 56, 64);
      x.fillStyle = glass; x.fillRect(wx + 5, wy + 5, 46, 54);
      x.fillStyle = glassDark; x.fillRect(wx + 26, wy + 5, 3, 54); x.fillRect(wx + 5, wy + 30, 46, 3);
    });
    x.fillStyle = frame; x.fillRect(18, 420, 72, 104);
    x.fillStyle = night ? '#33241d' : '#6b3f2b'; x.fillRect(24, 426, 60, 98);
    x.fillStyle = night ? '#5b4630' : '#c49a5f'; x.fillRect(70, 470, 5, 5);

    // Stone path between house and lawn.
    x.fillStyle = stone; x.fillRect(LX - 30, 0, 30, H);
    x.fillStyle = stoneDark;
    for (let y = 6; y < H; y += 22) {
      x.fillRect(LX - 28, y, 26, 2);
      x.fillRect(LX - 16 + ((y / 22) % 2 ? 8 : 0), y - 8, 2, 10);
    }

    // Lawn tiles.
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        x.fillStyle = (r + col) % 2 ? grassA : grassB;
        x.fillRect(LX + col * CELL, TOP + r * CELL, CELL, CELL);
        x.fillStyle = 'rgba(0,0,0,.045)';
        x.fillRect(LX + col * CELL, TOP + r * CELL + CELL - 1, CELL, 1);
        x.fillRect(LX + col * CELL + CELL - 1, TOP + r * CELL, 1, CELL);
      }
    }

    // Deterministic grass blades and pebbles.
    let seed = 0x9e3779b9;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 260; i++) {
      const gx = LX + 4 + Math.floor(rnd() * (COLS * CELL - 8));
      const gy = TOP + 4 + Math.floor(rnd() * (ROWS * CELL - 8));
      x.fillStyle = rnd() > 0.72 ? (night ? '#4a7a5e' : '#a8d98a') : blade;
      const tall = rnd() > 0.5 ? 3 : 2;
      x.fillRect(gx, gy, 1, tall);
      if (rnd() > 0.7) x.fillRect(gx + 1, gy + 1, 1, tall - 1);
    }
    for (let i = 0; i < 28; i++) {
      const gx = LX + 4 + Math.floor(rnd() * (COLS * CELL - 8));
      const gy = TOP + 4 + Math.floor(rnd() * (ROWS * CELL - 8));
      x.fillStyle = night ? '#5f6a64' : '#b9b08a';
      x.fillRect(gx, gy, 2, 1);
    }

    // Hedge and treeline on the right.
    x.fillStyle = hedge; x.fillRect(LX + COLS * CELL, 0, W - (LX + COLS * CELL), H);
    for (let y = 0; y < H; y += 26) {
      x.fillStyle = hedgeLight;
      x.fillRect(LX + COLS * CELL + (y % 52 ? 0 : 8), y, 34, 18);
      x.fillRect(LX + COLS * CELL + 44, y + 10, 56, 16);
      x.fillRect(LX + COLS * CELL + 118, y, 40, 18);
    }
    x.fillStyle = night ? '#0d1914' : '#1b3326';
    x.fillRect(W - 64, 0, 64, H);
    for (let y = 0; y < H; y += 34) {
      x.fillRect(W - 92, y, 28, 20);
      x.fillRect(W - 54, y + 14, 40, 18);
    }

    // Hedgerow behind the top of the lawn so the board is framed, not letterboxed.
    const lawnW = COLS * CELL;
    x.fillStyle = night ? '#163026' : '#2b5134';
    x.fillRect(LX, 0, lawnW, TOP);
    for (let y = 2; y < TOP; y += 14) {
      for (let xx = LX + (y % 28 ? 0 : 12); xx < LX + lawnW; xx += 34) {
        x.fillStyle = (xx + y) % 2 ? hedgeLight : hedge;
        x.fillRect(xx, y, 24, 9);
        x.fillRect(xx + 7, y + 4, 15, 5);
      }
    }
    for (let i = 0; i < 18; i++) {
      x.fillStyle = i % 3 ? (night ? '#9fb69e' : '#f3e7a2') : (night ? '#d8c98a' : '#ffffff');
      x.fillRect(LX + Math.floor(rnd() * (lawnW - 8)) + 2, Math.floor(rnd() * (TOP - 12)) + 4, 2, 2);
    }

    // Soil border below the lawn.
    const fenceY = TOP + ROWS * CELL;
    x.fillStyle = night ? '#2a211b' : '#4a3628';
    x.fillRect(LX, fenceY, lawnW, H - fenceY);
    for (let i = 0; i < 46; i++) {
      const gx = LX + Math.floor(rnd() * (lawnW - 8));
      const gy = fenceY + 5 + Math.floor(rnd() * (H - fenceY - 10));
      x.fillStyle = rnd() > 0.7 ? (night ? '#3c735a' : '#6aa85a') : (night ? '#5f6a64' : '#8d7a5c');
      x.fillRect(gx, gy, rnd() > 0.5 ? 2 : 4, 1);
    }

    // Fence along the bottom of the lawn.
    x.fillStyle = night ? '#4b3a2c' : '#8a5c3e';
    for (let fx = LX + 8; fx < LX + COLS * CELL; fx += 48) {
      x.fillRect(fx, fenceY - 12, 6, 20);
    }
    x.fillRect(LX + 8, fenceY - 8, COLS * CELL - 16, 3);

    // Day/night tint + vignette.
    if (night) {
      x.fillStyle = 'rgba(8,20,26,.28)'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#ffe28a';
      for (let i = 0; i < 16; i++) {
        if (rnd() > 0.5) x.fillRect(LX + rnd() * (COLS * CELL), TOP + rnd() * (ROWS * CELL), 1, 1);
      }
    }
    const vg = x.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.82);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, night ? 'rgba(0,0,0,.42)' : 'rgba(0,0,0,.24)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);

    worlds.set(key, c);
    return c;
  }

  V.Art = { MATRICES, sprite, draw, buildWorld, W, H, LX, TOP, CELL, COLS, ROWS };
})();
