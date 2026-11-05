/* Verdane data tables (ported from resources/data/*.json). Everything is plain data. */
(function () {
  const PLANTS = {
    sunsprout:  { n: 'Sunsprout',  e: '🌻', cost: 50,  cd: 5,  hp: 120, sun: 25, every: 10, role: 'Your economy. Plant it early and it prints the sun that pays for everything else.' },
    peashooter: { n: 'Pea Pod',    e: '🌱', cost: 100, cd: 5,  hp: 160, shoot: { dmg: 20, every: 1.5, speed: 300 }, role: 'Cheap, steady damage down one lane. The backbone of most rows.' },
    frostbud:   { n: 'Frost Bud',  e: '❄️', cost: 150, cd: 6,  hp: 160, shoot: { dmg: 20, every: 1.5, speed: 300, slow: 0.5, slowTime: 3 }, role: 'Slows a lane so every other plant gets more shots into the crowd.' },
    barkwall:   { n: 'Barkwall',   e: '🪵', cost: 50,  cd: 14, hp: 1000, role: 'A wall, not a weapon. Buys the rows behind it time to keep firing.' },
    thornmat:   { n: 'Thornmat',   e: '🌵', cost: 100, cd: 8,  hp: 250, spike: 12, role: 'Chews through anything that gets close. Best in front of a shooter.' },
    cinderpod:  { n: 'Cinder Pod', e: '💥', cost: 150, cd: 25, hp: 140, bomb: { r: 1.6, dmg: 1800, fuse: 1 }, role: 'A one-shot crowd eraser. Plant it where the horde will bunch up.' },
    lobber:     { n: 'Lobber',     e: '🌰', cost: 125, cd: 7,  hp: 150, lob: { dmg: 30, every: 2.6, speed: 360, ignoreShield: true }, role: 'Arcs a heavy seed over walls and shields. The answer to a shield row.' },
    vine:       { n: 'Vine',       e: '🌿', cost: 75,  cd: 10, hp: 180, spread: { every: 6, id: 'vinepatch', max: 3 }, role: 'Creeps into neighbouring tiles. Board control that slows whatever crosses it.' },
    bellflower: { n: 'Bellflower', e: '🔔', cost: 100, cd: 12, hp: 140, pulse: { every: 8, dmg: 20, stun: 1.2, rows: 1 }, role: 'Rings across three rows, stunning the crowd so your shooters catch up.' },
    glowcap:    { n: 'Glowcap',    e: '🍄', cost: 75,  cd: 8,  hp: 120, sun: 20, every: 8, aura: { haste: 0.85 }, role: 'Night economy that also quickens an adjacent shooter.' },
  };
  // Non-seedable sub-plants. They never appear in seed lists or the packet bar.
  const SUBS = {
    vinepatch:  { n: 'Vinepatch',  e: '🍃', cost: 25, cd: 0, hp: 100, sub: true, hidden: true, tangle: { slow: 0.7 }, role: 'Grown by a Vine. Tangles and slows anything that walks over it.' },
  };
  // Fused plants cannot be fused again.
  const FUSIONS = {
    bulwarkpod:   { n: 'Bulwark Pod',   e: '🛡️', a: 'barkwall',  b: 'peashooter', cost: 145, cd: 21,   hp: 1350, shoot: { dmg: 24, every: 1.5, speed: 300 }, role: 'A wall that shoots back. Holds a lane almost by itself.' },
    sunbank:      { n: 'Sun Bank',      e: '🏦', a: 'sunsprout', b: 'barkwall',   cost: 105, cd: 21,   hp: 1350, sun: 35, every: 9, role: 'A fortified sun factory. Expensive, then it pays for the late game.' },
    blastpod:     { n: 'Blast Pod',     e: '☄️', a: 'cinderpod', b: 'peashooter', cost: 225, cd: 37.5, hp: 165,  shoot: { dmg: 30, every: 1.8, speed: 300, burn: 3 }, role: 'Burning shots that keep damaging after they land.' },
    spikedbastion:{ n: 'Spiked Bastion',e: '🦔', a: 'barkwall',  b: 'thornmat',   cost: 150, cd: 21,   hp: 2250, spike: 18, role: 'The last wall you will ever need. Spikes included.' },
    frostlobber:  { n: 'Frost Lobber',  e: '❄️', a: 'frostbud',  b: 'lobber',     cost: 200, cd: 30,   hp: 210, lob: { dmg: 35, every: 2.4, speed: 360, ignoreShield: true, slow: 0.55, slowTime: 4 }, role: 'Lobs freezing seeds over shields and walls, slowing the whole row.' },
    bramblebell:  { n: 'Bramble Bell',  e: '🌵', a: 'thornmat',  b: 'bellflower', cost: 175, cd: 24,   hp: 300, pulse: { every: 7, dmg: 30, stun: 1.2, rows: 1 }, spike: 14, role: 'A ringing bell wrapped in thorns. Stuns at range and cuts anything close.' },
    thornvine:    { n: 'Thorn Vine',    e: '🌿', a: 'vine',      b: 'thornmat',   cost: 150, cd: 20,   hp: 260, spread: { every: 4, id: 'vinepatch', max: 4 }, spike: 18, role: 'Spreads thorned patches faster and fights whatever reaches it.' },
    glowbloom:    { n: 'Glow Bloom',    e: '🌸', a: 'bellflower', b: 'sunsprout', cost: 125, cd: 18,   hp: 200, sun: 40, every: 8, aura: { haste: 0.85 }, role: 'A bright night bloom: more sun and a faster neighbour.' },
  };
  Object.values(FUSIONS).forEach(f => (f.fused = true));
  const ZOMBIES = {
    splitling:  { n: 'Splitling',  e: '🧟', hp: 70, speed: 20, dps: 18, cost: 0, sub: true, hidden: true, spawnOnly: true, role: 'A Splitter comes apart into two of these on death.' },
    grunt:   { n: 'Grunt',          e: '🧟', hp: 153, speed: 14, dps: 36, cost: 1, role: 'The baseline shambler. Cheap, slow, and endless.' },
    cone:    { n: 'Cone-head',      e: '🧟', hp: 153, speed: 14, dps: 36, cost: 2, armor: 224, tag: '🔶', role: 'A grunt under a cone. Shots must chew through the armor first.' },
    dasher:  { n: 'Dasher',         e: '🏃', hp: 119, speed: 30, dps: 32, cost: 2, role: 'Fast and fragile. Slows and walls turn it back into a normal grunt.' },
    hurdler: { n: 'Hurdler',        e: '🧟', hp: 161, speed: 28, dps: 36, cost: 2, jump: { cells: 1.5, time: 0.7, speedAfter: 14 }, tag: '🦘', role: 'Leaps the first plant it meets, then slows to a walk.' },
    bucket:  { n: 'Bucket-head',    e: '🧟', hp: 153, speed: 14, dps: 36, cost: 4, armor: 520, tag: '🪣', role: 'Heavy armor on a slow body. Bring sustained damage or lob over it.' },
    brute:   { n: 'Behemoth',       e: '🦍', hp: 935, speed: 10, dps: 64, cost: 8, role: 'A huge health pool that eats a lane if it is not focused down.' },
    colossus:{ n: 'Lawnmower Colossus', e: '🚜', hp: 1575, speed: 5, dps: 105, cost: 0, boss: true, big: 1.8, role: 'The campaign boss. Mowers only chip it; firepower finishes it.' },
    tunneler: { n: 'Tunneler', e: '🧟', hp: 190, speed: 12, dps: 34, cost: 2, burrow: { time: 0.9, cells: 1.2 }, tag: '⛏️', role: 'Digs under the first plant and comes up behind it.' },
    shielder: { n: 'Shielder', e: '🧟', hp: 170, speed: 12, dps: 30, cost: 3, shield: 240, tag: '🛡️', role: 'A front shield absorbs shots. Lobbers ignore it.' },
    splitter: { n: 'Splitter', e: '🧟', hp: 220, speed: 12, dps: 34, cost: 3, split: { id: 'splitling', n: 2 }, tag: '✂️', role: 'Comes apart into two Splitlings when it dies. Splash it down.' },
    runner:   { n: 'Runner', e: '🏃', hp: 110, speed: 24, dps: 30, cost: 2, sprint: { every: 4, time: 1.2, mul: 2.2 }, tag: '💨', role: 'Sprints in bursts. Slows and stuns break the charge.' },
    sapper:   { n: 'Sapper', e: '🧟', hp: 160, speed: 14, dps: 24, cost: 3, blast: { dmg: 120, splash: 60, radius: 1.3 }, tag: '💣', role: 'Detonates at the first plant, splashing its neighbours.' },
    composter:{ n: 'Composter', e: '🪱', hp: 1600, speed: 8, dps: 80, cost: 0, boss: true, big: 1.8, summon: { every: 7, id: 'grunt', max: 3 }, role: 'The mission 9 boss. Summons grunts while it grinds forward.' },
  };
  // noSkySun is an explicit mission flag AND shown as a tip (fixes the hidden "lab = no sky sun" rule).
  const FULL = ['bulwarkpod', 'sunbank', 'blastpod', 'spikedbastion'];
  const SIX_A = ['bulwarkpod', 'sunbank', 'blastpod', 'spikedbastion', 'frostlobber', 'thornvine'];
  const SIX_B = ['bulwarkpod', 'sunbank', 'blastpod', 'spikedbastion', 'bramblebell', 'glowbloom'];
  const FULL8 = FULL.concat(['frostlobber', 'bramblebell', 'thornvine', 'glowbloom']);
  const MISSIONS = [
    { id: 1, title: 'The Garden Gate',   sun: 150, seeds: ['sunsprout', 'peashooter'], fusions: [], waves: 5, budget: 2.5, pool: ['grunt'], par: 150, tip: 'Plant Sunsprouts early, then Pea Pods. Sun collects itself — press A to toggle that.' },
    { id: 2, title: 'Sunny Rows',        sun: 150, seeds: ['sunsprout', 'peashooter', 'barkwall'], fusions: [], waves: 6, budget: 3, pool: ['grunt', 'cone'], par: 170, tip: 'Barkwall holds a lane while your shooters work.' },
    { id: 3, title: 'Cone Season',       sun: 150, seeds: ['sunsprout', 'peashooter', 'barkwall', 'frostbud'], fusions: [], waves: 7, budget: 3.5, pool: ['grunt', 'cone', 'dasher'], par: 190, tip: 'Frost Bud slows zombies so everything else hits more.' },
    { id: 4, title: 'The Graft Journal', sun: 250, seeds: ['sunsprout', 'peashooter', 'barkwall', 'thornmat', 'cinderpod'], fusions: FULL, waves: 7, budget: 4, pool: ['grunt', 'cone', 'bucket', 'hurdler'], par: 200, tip: 'Select a seed, then click an existing plant to fuse. Fused plants keep your current health ratio.' },
    { id: 5, title: 'Moonless Night',    sun: 250, noSkySun: true, seeds: ['sunsprout', 'peashooter', 'barkwall', 'frostbud', 'thornmat', 'cinderpod'], fusions: FULL, waves: 8, budget: 3.8, pool: ['grunt', 'cone', 'dasher', 'bucket', 'hurdler'], par: 230, tip: 'No sunlight falls at night. Only Sunsprouts make sun.' },
    { id: 6, title: 'The Lawnmower Colossus', sun: 300, seeds: ['sunsprout', 'peashooter', 'barkwall', 'frostbud', 'thornmat', 'cinderpod'], fusions: FULL, waves: 8, budget: 3.8, pool: ['grunt', 'cone', 'dasher', 'bucket', 'hurdler', 'brute'], boss: 'colossus', par: 300, tip: 'A boss is coming. Mowers only chip it, so build firepower.' },
    { id: 7, title: 'The Rock Garden', sun: 300, seeds: ['sunsprout', 'peashooter', 'barkwall', 'frostbud', 'lobber', 'vine', 'thornmat', 'cinderpod'], fusions: SIX_A, waves: 9, budget: 4.2, pool: ['grunt', 'cone', 'dasher', 'shielder', 'tunneler'], par: 320, tip: 'Rocks block tiles. Lob over shields and let a Vine tangle the lane.' },
    { id: 8, title: 'The Long Night', sun: 350, noSkySun: true, seeds: ['sunsprout', 'peashooter', 'barkwall', 'frostbud', 'thornmat', 'bellflower', 'glowcap', 'cinderpod'], fusions: SIX_B, waves: 9, budget: 4.4, pool: ['grunt', 'cone', 'dasher', 'bucket', 'hurdler', 'runner', 'splitter', 'shielder'], par: 360, tip: 'No sky sun. Glowcap pays and quickens; Bellflower stuns the rush.' },
    { id: 9, title: 'The Compost Heap', sun: 400, seeds: ['sunsprout', 'peashooter', 'barkwall', 'frostbud', 'thornmat', 'cinderpod', 'lobber', 'vine', 'bellflower'], fusions: FULL8, waves: 10, budget: 4.8, pool: ['grunt', 'cone', 'dasher', 'hurdler', 'bucket', 'brute', 'tunneler', 'shielder', 'splitter', 'runner', 'sapper'], boss: 'composter', par: 420, tip: 'Everything at once, then the Composter. Keep a Lobber for shields and a wall for Sappers.' },
  ];

  const PUZZLES = [
    {
      id: 'p1', mode: 'puzzle', title: 'First Cuts', sun: 100,
      seeds: ['peashooter', 'barkwall'], fusions: [],
      prePlaced: [{ id: 'peashooter', c: 0, r: 1 }, { id: 'peashooter', c: 0, r: 3 }],
      blocked: [], plantLimit: 3, mowers: false, noSkySun: true, par: 45,
      script: [
        { t: 2, list: [{ id: 'grunt', r: 1 }] },
        { t: 6, list: [{ id: 'grunt', r: 3 }] },
        { t: 10, list: [{ id: 'grunt', r: 2 }] },
      ],
      tip: 'Two Pea Pods already hold the outside rows. Add one more and cover the middle.',
    },
    {
      id: 'p2', mode: 'puzzle', title: 'Wallflower', sun: 75,
      seeds: ['barkwall', 'thornmat'], fusions: [],
      prePlaced: [{ id: 'thornmat', c: 2, r: 2 }],
      blocked: [[4, 1], [4, 3]], plantLimit: 3, mowers: false, noSkySun: true, par: 50,
      script: [
        { t: 2, list: [{ id: 'grunt', r: 2 }] },
        { t: 8, list: [{ id: 'cone', r: 2 }] },
      ],
      tip: 'Rocks funnel the row. Put a wall in front of the Thornmat and let the cone walk in.',
    },
    {
      id: 'p3', mode: 'puzzle', title: 'Night Shift', sun: 150,
      seeds: ['sunsprout', 'peashooter', 'glowcap'], fusions: [],
      prePlaced: [{ id: 'glowcap', c: 1, r: 2 }],
      blocked: [], plantLimit: 5, mowers: false, noSkySun: true, par: 55,
      script: [
        { t: 3, list: [{ id: 'runner', r: 2 }] },
        { t: 9, list: [{ id: 'grunt', r: 2 }] },
      ],
      tip: 'No sky sun here. Glowcap already earns; add a Sunsprout and a shooter beside it.',
    },
    {
      id: 'p4', mode: 'puzzle', title: 'Over the Wall', sun: 150,
      seeds: ['lobber', 'barkwall'], fusions: [],
      prePlaced: [{ id: 'barkwall', c: 2, r: 1 }, { id: 'barkwall', c: 2, r: 3 }],
      blocked: [[5, 0], [5, 2], [5, 4]], plantLimit: 4, mowers: false, noSkySun: true, par: 60,
      script: [
        { t: 3, list: [{ id: 'shielder', r: 1 }] },
        { t: 9, list: [{ id: 'cone', r: 3 }] },
      ],
      tip: 'Shots stop at the shield. A Lobber arcs over it and still hits the body.',
    },
    {
      id: 'p5', mode: 'puzzle', title: 'Bramble Path', sun: 125,
      seeds: ['vine', 'thornmat', 'bellflower'], fusions: [],
      prePlaced: [{ id: 'vine', c: 1, r: 2 }],
      blocked: [[4, 0], [4, 1], [4, 3], [4, 4]], plantLimit: 4, mowers: false, noSkySun: true, par: 65,
      script: [
        { t: 3, list: [{ id: 'splitter', r: 2 }] },
        { t: 9, list: [{ id: 'grunt', r: 2 }] },
      ],
      tip: 'The Vine grows patches that tangle. Thornmat and Bellflower clean up the splits.',
    },
    {
      id: 'p6', mode: 'puzzle', title: 'The Long Row', sun: 200,
      seeds: ['frostbud', 'peashooter', 'bellflower'], fusions: [],
      prePlaced: [], blocked: [[3, 1], [5, 2], [3, 3]],
      plantLimit: 6, mowers: false, noSkySun: true, par: 70,
      script: [
        { t: 3, list: [{ id: 'hurdler', r: 2 }] },
        { t: 9, list: [{ id: 'runner', r: 2 }] },
      ],
      tip: 'The zigzag rocks make one long lane. Frost and a Bellflower keep it slow.',
    },
    {
      id: 'p7', mode: 'puzzle', title: 'Pinch Point', sun: 175,
      seeds: ['cinderpod', 'barkwall', 'lobber'], fusions: [],
      prePlaced: [{ id: 'cinderpod', c: 1, r: 2 }],
      blocked: [[4, 0], [4, 1], [4, 3], [4, 4]], plantLimit: 5, mowers: false, noSkySun: true, par: 75,
      script: [
        { t: 3, list: [{ id: 'bucket', r: 2 }] },
        { t: 9, list: [{ id: 'shielder', r: 2 }] },
        { t: 13, list: [{ id: 'grunt', r: 2 }] },
      ],
      tip: 'Everything funnels through row 2. Time the Cinder Pod for the bucket, lob the shield.',
    },
    {
      id: 'p8', mode: 'puzzle', title: 'Last Stand', sun: 250,
      seeds: ['sunsprout', 'peashooter', 'barkwall', 'frostbud', 'lobber', 'vine', 'bellflower', 'glowcap'], fusions: [],
      prePlaced: [{ id: 'sunsprout', c: 0, r: 1 }, { id: 'peashooter', c: 0, r: 3 }, { id: 'barkwall', c: 2, r: 2 }],
      blocked: [[5, 0], [5, 4]], plantLimit: 7, mowers: false, noSkySun: true, par: 90,
      script: [
        { t: 3, list: [{ id: 'tunneler', r: 2 }] },
        { t: 7, list: [{ id: 'sapper', r: 1 }] },
        { t: 11, list: [{ id: 'splitter', r: 3 }] },
        { t: 16, list: [{ id: 'cone', r: 2 }] },
      ],
      tip: 'Tunneler, Sapper, Splitter, then a cone. Spread out so one blast cannot take everything.',
    },
  ];

  const vase = (c, r, kind, id, amt) => (kind === 'sun' ? { c, r, kind, amt: 25 } : { c, r, kind, id });
  const VASES = [
    {
      id: 'v1', mode: 'vase', title: 'Kitchen Crockery', sun: 0, seeds: [], fusions: [],
      mowers: false, noSkySun: true, par: 45,
      vases: [
        vase(1, 1, 'plant', 'peashooter'), vase(1, 3, 'plant', 'barkwall'),
        vase(6, 0, 'zombie', 'grunt'), vase(7, 2, 'zombie', 'grunt'), vase(8, 4, 'zombie', 'cone'),
        vase(3, 0, 'sun'), vase(4, 2, 'sun'), vase(5, 4, 'sun'),
      ],
      tip: 'Smash every vase. Plants are friends, zombies are not — and sun is score.',
    },
    {
      id: 'v2', mode: 'vase', title: 'Porch Pots', sun: 0, seeds: [], fusions: [],
      mowers: false, noSkySun: true, par: 55,
      vases: [
        vase(1, 0, 'plant', 'peashooter'), vase(2, 2, 'plant', 'thornmat'), vase(1, 4, 'plant', 'barkwall'),
        vase(6, 1, 'zombie', 'grunt'), vase(7, 3, 'zombie', 'grunt'), vase(8, 0, 'zombie', 'cone'), vase(8, 2, 'zombie', 'dasher'),
        vase(4, 1, 'sun'), vase(4, 3, 'sun'), vase(5, 0, 'sun'),
      ],
      tip: 'Open the left-hand pots first so the plants land before the zombies arrive.',
    },
    {
      id: 'v3', mode: 'vase', title: 'Greenhouse Shards', sun: 0, seeds: [], fusions: [],
      mowers: false, noSkySun: true, par: 65,
      vases: [
        vase(1, 0, 'plant', 'peashooter'), vase(2, 1, 'plant', 'frostbud'), vase(1, 3, 'plant', 'barkwall'), vase(2, 4, 'plant', 'lobber'),
        vase(6, 0, 'zombie', 'grunt'), vase(7, 1, 'zombie', 'grunt'), vase(8, 2, 'zombie', 'cone'), vase(7, 3, 'zombie', 'dasher'), vase(8, 4, 'zombie', 'shielder'),
        vase(4, 0, 'sun'), vase(4, 2, 'sun'), vase(5, 4, 'sun'),
      ],
      tip: 'A Lobber is hiding in here. Save it for the shield on the right.',
    },
    {
      id: 'v4', mode: 'vase', title: 'Night Jars', sun: 0, seeds: [], fusions: [],
      mowers: false, noSkySun: true, par: 70,
      vases: [
        vase(1, 1, 'plant', 'sunsprout'), vase(1, 3, 'plant', 'glowcap'), vase(2, 0, 'plant', 'bellflower'),
        vase(6, 1, 'zombie', 'grunt'), vase(7, 2, 'zombie', 'grunt'), vase(8, 3, 'zombie', 'runner'), vase(8, 1, 'zombie', 'splitter'), vase(7, 4, 'zombie', 'cone'), vase(8, 0, 'zombie', 'hurdler'),
        vase(4, 2, 'sun'), vase(5, 0, 'sun'), vase(5, 3, 'sun'),
      ],
      tip: 'Night board: the economy plants matter most. Break the sun vases early.',
    },
    {
      id: 'v5', mode: 'vase', title: 'Bramble Vases', sun: 0, seeds: [], fusions: [],
      mowers: false, noSkySun: true, par: 80,
      vases: [
        vase(1, 0, 'plant', 'vine'), vase(2, 1, 'plant', 'thornmat'), vase(1, 3, 'plant', 'lobber'), vase(2, 4, 'plant', 'bellflower'),
        vase(6, 1, 'zombie', 'grunt'), vase(7, 3, 'zombie', 'grunt'), vase(8, 0, 'zombie', 'tunneler'), vase(8, 2, 'zombie', 'sapper'), vase(7, 4, 'zombie', 'splitter'), vase(8, 4, 'zombie', 'bucket'),
        vase(4, 0, 'sun'), vase(4, 2, 'sun'), vase(5, 1, 'sun'), vase(5, 3, 'sun'),
      ],
      tip: 'Spread the plants out. A Sapper punishes anything clustered together.',
    },
    {
      id: 'v6', mode: 'vase', title: 'The Compost Urn', sun: 0, seeds: [], fusions: [],
      mowers: false, noSkySun: true, par: 95,
      vases: [
        vase(1, 0, 'plant', 'sunsprout'), vase(2, 1, 'plant', 'peashooter'), vase(1, 2, 'plant', 'barkwall'), vase(2, 3, 'plant', 'vine'), vase(1, 4, 'plant', 'glowcap'),
        vase(6, 0, 'zombie', 'grunt'), vase(7, 0, 'zombie', 'grunt'), vase(8, 0, 'zombie', 'cone'), vase(8, 1, 'zombie', 'runner'), vase(8, 2, 'zombie', 'shielder'), vase(7, 3, 'zombie', 'splitter'), vase(8, 3, 'zombie', 'sapper'), vase(8, 4, 'zombie', 'tunneler'),
        vase(4, 1, 'sun'), vase(5, 2, 'sun'), vase(4, 4, 'sun'),
      ],
      tip: 'The urn board: eight zombies, five plants, three sun. Every break counts.',
    },
  ];

  window.Verdane = Object.assign(window.Verdane || {}, {
    PLANTS, SUBS, FUSIONS, ZOMBIES, MISSIONS, PUZZLES, VASES,
    ALL: Object.assign({}, PLANTS, FUSIONS, SUBS),
  });
})();
