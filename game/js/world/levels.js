// The three dreams. Each map is drawn with text: one character = one 1x1 tile.
//
//  #  %  =   walls (each level picks their look in `textures`)
//  E          eye painting wall (USE it or shoot it)
//  .          floor            P  player start      X  exit pad
//  D          door             R  red-key door      B  blue-key door
//  m  h  c    Mask Drifter, Channel Hound, Chrome Mime      Z  The Snooze (boss)
//  +  *  $    health, armor, volts (ammo)
//  L          Lucid Pill       r  b  red / blue keycard
//  2  3       Prism Scatter, Arc Lance
//  anything else is a "marker" that the level explains in `markers`.
//
// Try it yourself: change a '.' to a '+' and reload to add a health pickup.

export const LEVELS = [
  {
    id: 1,
    name: 'RAIN MARKET',
    tagline: 'The night market never closes. Neither do its eyes.',
    sky: 'sunset',
    ceiling: false,
    weather: 'rain',
    fog: { color: 0x2a0b3d, near: 3, far: 18 },
    textures: { '#': 'brick', '%': 'neonSign', '=': 'shutter', E: 'eye', floor: 'asphalt' },
    music: 'market',
    startYaw: -Math.PI / 2,
    loadout: { weapons: ['pulse'], volts: 10 },
    markers: {
      7: { type: 'teleport', to: '8', secret: true }, // the kiosk that is bigger inside
      8: { type: 'floor' },
      9: { type: 'teleport', to: '0' },
      0: { type: 'floor' },
    },
    map: [
      '####################################',
      '#......#..........%%%%%%%%%%.......#',
      '#..P...#..........%........%...m...#',
      '#......#....$.....%...r....%.......#',
      '#......D..........%........%.......#',
      '#......#....h.....%%%%D%%%%%...+...#',
      '###.####...........................#',
      '#......#......===.......===........#',
      '#.+....#......=7=...m...=$=....h...#',
      '#......#.......0...................#',
      '#......####.#######.########...#####',
      '#...h..#.......#.......#.....m.#...#',
      '#......D.......#...2...D.......R.X.#',
      '#......#...$...#.......#..h....#...#',
      '#......#.......#####################',
      '#..m...#.......#...................#',
      '#......#...h...#..8.........$...L..#',
      '########.......#.......*...........#',
      '#...m..........#...+...............#',
      '#.$............#....9..............#',
      '####################################',
    ],
  },
  {
    id: 2,
    name: 'STATIC MOTEL',
    tagline: 'Every door is room 107. The hallway remembers you.',
    sky: 'none',
    ceiling: true,
    weather: 'dust',
    fog: { color: 0x07151a, near: 1, far: 8.5 },
    textures: { '#': 'wallpaper', '%': 'motelDoor', '=': 'painting', E: 'eye', floor: 'carpet', ceiling: 'ceilingTile' },
    music: 'motel',
    startYaw: -Math.PI / 2,
    loadout: { weapons: ['pulse', 'scatter'], volts: 30 },
    markers: {
      5: { type: 'teleport', to: '6', loop: 'hall' }, // the hallway that loops forever
      6: { type: 'floor' },
      7: { type: 'teleport', to: '8' }, // a closet that opens into a ballroom
      8: { type: 'floor' },
      9: { type: 'teleport', to: '0' },
      0: { type: 'floor' },
    },
    loop: {
      id: 'hall',
      messages: [
        '',
        'Wait... have I walked this hallway before?',
        'The same painting. The same carpet stain.',
        'The painting is watching you. USE it. Or shoot it.',
      ],
    },
    eye: { breakLoop: 'hall', message: 'The eye closes. The hallway lets you go.' },
    map: [
      '########################################',
      '#......#################################',
      '#......#######=#####E#####=#####E#####=#',
      '#..P..........6...........5............#',
      '#......####%#####%#####%#####%#####%##.#',
      '#.===..###############################.#',
      '#....+.#################.....$.......#.#',
      '#......#################..h..........#.#',
      '########################....=====....#.#',
      '#....................###....=====....D.#',
      '#..==....8.......==..###....=====.m..#.#',
      '#..==............==..###.............#.#',
      '#......c......$......###...+.....$...#.#',
      '#....................#################.#',
      '#....==....3.....==..###..h..........#.#',
      '#....==..........==..###......$......D.#',
      '#.m.......b.......c..###.........h..##.#',
      '#....................###############7D0#',
      '#..==....L.......==..###..c.........##.#',
      '#..==............==..###+...........$D.#',
      '#......+......$......#################B#',
      '#........9...........#########.........#',
      '#....................#########...X.....#',
      '########################################',
    ],
  },
  {
    id: 3,
    name: 'ALARM TOWER',
    tagline: 'The walls breathe. Something up top is about to ring.',
    sky: 'alarm',
    ceiling: false,
    weather: 'embers',
    fog: { color: 0x1c0306, near: 3, far: 20 },
    textures: { '#': 'chrome', '%': 'clockPanel', '=': 'gold', E: 'eye', floor: 'redGrid' },
    music: 'tower',
    startYaw: 0,
    loadout: { weapons: ['pulse', 'scatter', 'lance'], volts: 40 },
    breathePeriod: 3.5,
    markers: {
      u: { type: 'mover', group: 'pulse', up: true, breathe: true }, // breathing wall, starts up
      n: { type: 'mover', group: 'pulse', up: false, breathe: true }, // breathing wall, starts down
      w: { type: 'mover', group: 'gate', up: false }, // arena gate, slams shut behind you
      o: {
        type: 'trigger',
        actions: [
          { raise: 'gate' },
          { message: 'THE ALARM IS RINGING. WAKE UP. WAKE UP.' },
          { wakeAll: true },
          { music: 'boss' },
        ],
      },
    },
    map: [
      '########################################',
      '######............................######',
      '######....%%................%%....######',
      '######....%%........Z.......%%....######',
      '######............................######',
      '######..+......................+..######',
      '######....%%................%%....######',
      '######....%%..$...........$.%%....######',
      '######...........*......L.........######',
      '######..............o.............######',
      '####################w###################',
      '####################.###################',
      '####################R###################',
      '##..h...u.....%%%%%%....n...%%%%..u...##',
      '##.####..####n%.......#.....u....####.##',
      '##.#.r#.......n..$....#..m.......#..#.##',
      '##.#..#..%%%%....%%.u.#...%%%%...#+.#.##',
      '##.#..#...m......%%...#......n...#..#.##',
      '##.##u#..%%%%.u.......####..u....##n#.##',
      '##...$....h......c..........$.....h...##',
      '######.###############.##########.######',
      '##........===..............===........##',
      '##..P...........$.................+...##',
      '##....................m...............##',
      '########################################',
    ],
  },
];
