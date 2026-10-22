// Level 2 Advanced Instructor Certification Course flyers.
//
// Same box options as templates.js. Positions were measured from the
// Monroeville, PA (8.5×11, story) and Pocahontas, AR (square) flyers. Hours,
// price and who can enroll are part of the backgrounds and don't change.
// The light versions were made from the dark ones (see
// tools/build_backgrounds.py), so both share one layout and differ only in
// text color.

const LEVEL_2_FIELDS = [
  { id: 'hostedBy', label: 'Hosted by', placeholder: 'Monroeville Police Department' },
  { id: 'dateRange', label: 'Date range', placeholder: 'AUG 30 - SEPT 2, 2027' },
  { id: 'location', label: 'Location (full address)', placeholder: 'Monroeville Public Safety\nTraining Center\n2465 Johnston Rd.\nMonroeville, PA 15146', multiline: true },
];

// One layout per size; `color` is the text color of that version.
function level2Boxes(size, color) {
  const hosted = (box) => ({
    runs: [
      { text: 'HOSTED BY: ', font: TEKO, weight: 300, color: OLIVE },
      { text: '{hostedBy}', font: TEKO, weight: 300, color },
    ],
    maxLines: 2,
    upper: true,
    ...box,
  });
  const work = (box) => ({ font: WORK, weight: 500, color, ...box });
  if (size === 'print') {
    return [
      hosted({ size: 126.8, x: 151.2, w: 1800, y: 1480.1, lineGap: 128, bottom: 1610 }),
      work({ text: '{dateRange}', size: 68.6, x: 284.4, w: 1000, y: 1765.8, lineGap: 83.3, maxLines: 2 }),
      work({ text: '{location}', size: 68.6, x: 284.4, w: 1000, y: 2152.5, lineGap: 83.3, maxLines: 5, bottom: 2490 }),
    ];
  }
  if (size === 'square') {
    return [
      hosted({ size: 40.1, x: 79.3, w: 720, y: 483.3, lineGap: 40.6, bottom: 530 }),
      work({ text: '{dateRange}', size: 23.1, x: 127.2, w: 420, y: 581.3, lineGap: 26.3, maxLines: 2 }),
      work({ text: '{location}', size: 23.1, x: 127.2, w: 420, y: 723.9, lineGap: 26.3, maxLines: 5, bottom: 832 }),
    ];
  }
  return [
    hosted({ size: 58.5, x: 94.1, w: 780, y: 795.2, lineGap: 59.2, bottom: 858 }),
    work({ text: '{dateRange}', size: 28.4, x: 132.7, w: 430, y: 904.9, lineGap: 40.6, maxLines: 2 }),
    work({ text: '{location}', size: 28.4, x: 132.7, w: 430, y: 1064.8, lineGap: 40.6, maxLines: 5, bottom: 1215 }),
  ];
}

function level2Versions(size) {
  return [
    { id: 'light', name: 'Light', background: `templates/l2-${size}-light.png`, boxes: level2Boxes(size, BLACK) },
    { id: 'dark', name: 'Dark', background: `templates/l2-${size}-dark.png`, boxes: level2Boxes(size, WHITE) },
  ];
}

const LEVEL_2_TEMPLATES = [
  { id: 'print', name: 'Print flyer 8.5×11', width: 2550, height: 3300, output: 'pdf', pageInches: [8.5, 11], versions: level2Versions('print') },
  { id: 'square', name: 'Social post 1080×1080', width: 1080, height: 1080, output: 'png', versions: level2Versions('square') },
  { id: 'story', name: 'Story 1080×1920', width: 1080, height: 1920, output: 'png', versions: level2Versions('story') },
];

const COURSES = [
  {
    id: 'level1',
    name: 'Level 1',
    title: 'Instructor Certification Course',
    storageKey: 'flyer-maker:values', // kept from before there were two courses
    fields: FIELDS,
    templates: TEMPLATES,
    fileName: (values) => [values.city, values.state].filter(Boolean).join(' ') || 'flyer',
  },
  {
    id: 'level2',
    name: 'Level 2',
    title: 'Advanced Instructor Certification Course',
    storageKey: 'flyer-maker:values:level2',
    fields: LEVEL_2_FIELDS,
    templates: LEVEL_2_TEMPLATES,
    fileName: (values) => `level 2 ${values.hostedBy || 'flyer'}`,
  },
];
