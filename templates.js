// Flyer layouts.
//
// Each design is a blank background built from the Canva export (see
// tools/build_backgrounds.py) plus the text boxes drawn on top of it. All
// positions and sizes are in pixels of the background image and were measured
// from the Bryan, TX flyers.
//
// Text box options:
//   text      Text to draw. {field} is replaced with the form value. A box
//             whose fields are all empty is skipped.
//   runs      Instead of text: a list of { text, weight, color, font } pieces
//             for lines that mix styles, like "Cost $1467 per person*".
//   font      'Teko' or 'Work Sans'.  weight  300 light … 600 semibold.
//   size      Font size.   color  Text color.
//   x, w      Left edge and width. Text wraps inside the width.
//   y         Where the text sits, depending on valign:
//               'baseline' (default) first line's baseline
//               'middle'   middle of the whole block
//               'bottom'   last line's baseline
//   lineGap   Distance between baselines (defaults to 1.2 × size).
//   align     'left' (default), 'center' or 'right'.
//   maxLines  Most lines allowed before the text is made smaller.
//   top, bottom  Text may not go above / below these (keeps it off the
//             edges of its panel). bottom limits the last baseline.
//   upper     true to show the text in capitals.
//   when      Only draw this box when that form field is filled in.
//   joinLines true to ignore the line breaks typed in the form and let the
//             text wrap on its own.

const TEKO = 'Teko';
const WORK = 'Work Sans';
const BLACK = '#000000';
const WHITE = '#ffffff';
const OLIVE = '#6c6f57';

// Form fields, in the order they appear in the form.
const FIELDS = [
  { id: 'city', label: 'City', placeholder: 'Bryan' },
  { id: 'state', label: 'State', placeholder: 'TX' },
  { id: 'hostedBy', label: 'Hosted by', placeholder: 'Texas A&M Engineering Extension Service (TEEX LAW)' },
  { id: 'dateRange', label: 'Date range', placeholder: 'June 29 - July 2, 2027' },
  { id: 'hours', label: 'Hours', placeholder: '0800hrs - 1830hrs' },
  { id: 'location', label: 'Location (full address)', placeholder: 'Texas A&M Engineering Extension Service (TEEX)\n1500 4TH St., Bldg 7751,\nRELLIS Campus Bryan, TX', multiline: true },
  { id: 'price', label: 'Price', placeholder: '$1467' },
  { id: 'designation', label: 'Open to', options: { LEO: 'LEO only', Public: 'Public (LEO, Security, Military & Approved Civilians)' } },
  { id: 'capacity', label: 'Seats available (8.5×11 only)', placeholder: 'Leave blank for "Limited Space Available"' },
];

// The "Designed for …" bullet changes with who the course is open to.
const DESIGNED_FOR_LED = {
  LEO: 'Designed for LEO, by LED',
  Public: 'Designed for LEO, Security & Military personnel, by LED',
};
const DESIGNED_FOR_LEO = {
  LEO: 'Designed for LEO, by LEO',
  Public: 'Designed for LEO, Security & Military personnel, by LEO',
};
const PUBLIC_TEXT = 'Open to Public (LEO, Security, Military Personnel, & Approved Civilians)';

const TEMPLATES = [
  {
    id: 'print',
    name: 'Print flyer 8.5×11',
    width: 2550, // 8.5in at 300 DPI
    height: 3300, // 11in at 300 DPI
    output: 'pdf', // light and dark are pages 1 and 2 of one PDF
    pageInches: [8.5, 11],
    versions: [
      {
        id: 'light',
        name: 'Light',
        background: 'templates/print-light.png',
        designation: { LEO: 'Open to LEO ONLY', Public: PUBLIC_TEXT },
        designedFor: DESIGNED_FOR_LED,
        limited: 'Limited Space Available',
        boxes: [
          { text: '{city}, {state}', font: TEKO, weight: 500, color: WHITE, size: 147.4, x: 151, w: 1010, y: 502, valign: 'middle', maxLines: 1, upper: true },
          { text: '{hostedBy}', font: TEKO, weight: 300, color: WHITE, size: 117.1, x: 151, w: 1350, y: 1353.5, lineGap: 115.6, maxLines: 2, bottom: 1475, upper: true },
          { text: '{designedFor}', font: TEKO, weight: 300, color: BLACK, size: 78, x: 217, w: 1220, y: 1922.2, maxLines: 1 },
          { text: '{dateRange}', font: WORK, weight: 500, color: BLACK, size: 64.4, x: 1719.5, w: 740, y: 1847.6, lineGap: 81.25, maxLines: 2 },
          { text: '{hours}', font: WORK, weight: 500, color: BLACK, size: 64.4, x: 1719.5, w: 740, y: 2028, maxLines: 1 },
          { text: '{location}', joinLines: true, font: WORK, weight: 500, color: BLACK, size: 64.4, x: 1702.8, w: 757, y: 2188.9, lineGap: 81.25, maxLines: 5, bottom: 2560 },
          {
            runs: [
              { text: 'Cost ', font: TEKO, weight: 300, color: BLACK },
              { text: '{price}', font: TEKO, weight: 500, color: OLIVE },
              { text: ' per person*', font: TEKO, weight: 300, color: BLACK },
            ],
            size: 180.3, x: 151, w: 1260, y: 2812.6, maxLines: 1,
          },
          { text: '{spots} - Will Fill Up Quickly', font: WORK, weight: 500, color: BLACK, size: 52.8, x: 100, w: 1280, align: 'center', y: 2921.8, maxLines: 1 },
          { text: '{designation}', font: WORK, weight: 500, color: BLACK, size: 61.1, x: 164, w: 1280, align: 'center', y: 2993.7, lineGap: 72, bottom: 3075 },
        ],
      },
      {
        id: 'dark',
        name: 'Dark',
        background: 'templates/print-dark.png',
        designation: { LEO: 'LEO ONLY', Public: PUBLIC_TEXT },
        designedFor: DESIGNED_FOR_LED,
        limited: 'Limited Spots Available',
        boxes: [
          { text: '{city}, {state}', font: TEKO, weight: 500, color: WHITE, size: 147.4, x: 151, w: 786, y: 502, valign: 'middle', maxLines: 1, upper: true },
          { text: '{hostedBy}', font: TEKO, weight: 600, color: WHITE, size: 93.3, x: 151, w: 1220, y: 1321, lineGap: 90.6, maxLines: 2, bottom: 1420, upper: true },
          { text: '{designedFor}', font: TEKO, weight: 300, color: WHITE, size: 78, x: 217, w: 1180, y: 1925.1, maxLines: 1 },
          { text: '{dateRange}', font: WORK, weight: 500, color: WHITE, size: 64.4, x: 1707.6, w: 750, y: 1847.6, lineGap: 81.25, maxLines: 2 },
          { text: '{hours}', font: WORK, weight: 500, color: WHITE, size: 64.4, x: 1707.6, w: 750, y: 2028, maxLines: 1 },
          { text: '{location}', joinLines: true, font: WORK, weight: 500, color: WHITE, size: 64.4, x: 1707.6, w: 755, y: 2204.7, lineGap: 81.25, maxLines: 5, bottom: 2545 },
          {
            runs: [
              { text: 'Cost ', font: TEKO, weight: 300, color: WHITE },
              { text: '{price}', font: TEKO, weight: 500, color: WHITE },
              { text: ' per person*', font: TEKO, weight: 300, color: WHITE },
            ],
            size: 180.3, x: 151, w: 1250, y: 2812.2, maxLines: 1,
          },
          { text: '{spots} - Will Sell Out Quickly', font: WORK, weight: 500, color: WHITE, size: 52.8, x: 85, w: 1280, align: 'center', y: 2921.4, maxLines: 1 },
          { text: '{designation}', font: WORK, weight: 500, color: WHITE, size: 52.8, x: 112, w: 1280, align: 'center', y: 2983.9, lineGap: 64, bottom: 3050 },
        ],
      },
    ],
  },
  {
    id: 'square',
    name: 'Social post 1080×1080',
    width: 1080,
    height: 1080,
    output: 'png',
    versions: [
      {
        id: 'light',
        name: 'Light',
        background: 'templates/square-light.png',
        designation: { LEO: 'Open to LEO Only', Public: PUBLIC_TEXT },
        designedFor: DESIGNED_FOR_LED,
        boxes: [
          { text: '{city}, {state}', font: TEKO, weight: 500, color: WHITE, size: 59.4, x: 53, w: 377, y: 193.8, valign: 'middle', maxLines: 1, upper: true },
          { text: '{hostedBy}', font: TEKO, weight: 600, color: WHITE, size: 37.7, x: 54, w: 450, y: 510.7, lineGap: 37.1, maxLines: 2, bottom: 550, upper: true },
          { text: '{designedFor}', font: TEKO, weight: 300, color: BLACK, size: 32.3, x: 85, w: 495, y: 646.6, maxLines: 1 },
          { text: '{dateRange}', font: WORK, weight: 500, color: BLACK, size: 29.4, x: 722, w: 345, y: 629.3, lineGap: 36, maxLines: 2 },
          { text: '{hours}', font: WORK, weight: 500, color: BLACK, size: 29.1, x: 723, w: 345, y: 715.1, maxLines: 1 },
          { text: '{location}', font: WORK, weight: 500, color: BLACK, size: 24.5, x: 722, w: 340, y: 780, lineGap: 30.8, maxLines: 4, bottom: 880 },
          {
            runs: [
              { text: 'Cost ', font: TEKO, weight: 300, color: BLACK },
              { text: '{price}', font: TEKO, weight: 500, color: OLIVE },
              { text: ' per person*', font: TEKO, weight: 300, color: BLACK },
            ],
            size: 65.6, x: 40, w: 535, align: 'center', y: 996, maxLines: 1,
          },
          { text: '*Limited Space Available - Will Sell Out Quickly\n{designation}', font: WORK, weight: 500, color: BLACK, size: 16.6, x: 40, w: 545, align: 'center', y: 1027.4, lineGap: 19.8, bottom: 1068 },
        ],
      },
      {
        id: 'dark',
        name: 'Dark',
        background: 'templates/square-dark.png',
        designation: { LEO: 'Open to LEO ONLY', Public: PUBLIC_TEXT },
        designedFor: DESIGNED_FOR_LED,
        boxes: [
          { text: '{city}, {state}', font: TEKO, weight: 500, color: WHITE, size: 59.4, x: 53, w: 347, y: 193.8, valign: 'middle', maxLines: 1, upper: true },
          { text: '{hostedBy}', font: TEKO, weight: 600, color: WHITE, size: 38.6, x: 52, w: 525, y: 512.6, lineGap: 38.2, maxLines: 2, bottom: 552, upper: true },
          { text: '{designedFor}', font: TEKO, weight: 300, color: WHITE, size: 32.3, x: 85, w: 495, y: 646.6, maxLines: 1 },
          { text: '{dateRange}', font: WORK, weight: 500, color: WHITE, size: 24.9, x: 722, w: 345, y: 626.1, lineGap: 31, maxLines: 2 },
          { text: '{hours}', font: WORK, weight: 500, color: WHITE, size: 24.7, x: 723, w: 345, y: 710.9, maxLines: 1 },
          { text: '{location}', font: WORK, weight: 500, color: WHITE, size: 24.5, x: 722, w: 340, y: 780, lineGap: 30.8, maxLines: 4, bottom: 880 },
          {
            runs: [
              { text: 'Cost ', font: TEKO, weight: 300, color: WHITE },
              { text: '{price}', font: TEKO, weight: 500, color: WHITE },
              { text: ' per person*', font: TEKO, weight: 300, color: WHITE },
            ],
            size: 64.5, x: 52, w: 528, y: 995.5, maxLines: 1,
          },
          { text: '*Limited Space Available - Will Fill Up Quickly\n{designation}', font: WORK, weight: 500, color: WHITE, size: 16.6, x: 52, w: 528, y: 1027.1, lineGap: 19.8, bottom: 1068 },
        ],
      },
    ],
  },
  {
    id: 'story',
    name: 'Story 1080×1920',
    width: 1080,
    height: 1920,
    output: 'png',
    versions: [
      {
        id: 'light',
        name: 'Light',
        background: 'templates/story-light.png',
        designation: { LEO: 'Open to LEO Only', Public: PUBLIC_TEXT },
        designedFor: DESIGNED_FOR_LEO,
        boxes: [
          { text: '{city}, {state}', font: TEKO, weight: 500, color: BLACK, size: 57.7, x: 46.4, w: 620, y: 807, valign: 'middle', maxLines: 1, upper: true },
          { text: 'HOSTED BY', when: 'hostedBy', font: TEKO, weight: 300, color: OLIVE, size: 41.4, x: 48, w: 400, y: 1103.8, maxLines: 1 },
          { text: '{hostedBy}', font: TEKO, weight: 600, color: BLACK, size: 39.6, x: 46, w: 560, y: 1145.2, lineGap: 39.6, maxLines: 2, bottom: 1186, upper: true },
          { text: '{dateRange}', font: WORK, weight: 500, color: BLACK, size: 24.9, x: 146.6, w: 165, y: 1276, valign: 'middle', lineGap: 27.2, maxLines: 3, top: 1200, bottom: 1345 },
          { text: '{hours}', font: WORK, weight: 500, color: BLACK, size: 24.9, x: 430.5, w: 205, y: 1276, valign: 'middle', lineGap: 27.2, maxLines: 3, top: 1200, bottom: 1345 },
          { text: '{location}', font: WORK, weight: 500, color: BLACK, size: 23.2, x: 715, w: 330, y: 1277, valign: 'middle', lineGap: 25.3, maxLines: 5, top: 1200, bottom: 1345 },
          { text: '{designedFor}', font: TEKO, weight: 300, color: BLACK, size: 32.3, x: 80, w: 255, y: 1505.7, lineGap: 45, maxLines: 3 },
          {
            runs: [
              { text: '{price}', font: TEKO, weight: 500, color: OLIVE },
              { text: ' per person*', font: TEKO, weight: 300, color: BLACK },
            ],
            size: 81.4, x: 46.4, w: 560, y: 1824.9, maxLines: 1,
          },
          { text: '*Limited Space Available -\nWill Sell Out Quickly\n\n{designation}', font: WORK, weight: 500, color: BLACK, size: 21.7, x: 648, w: 395, y: 1709, valign: 'middle', lineGap: 25.9, top: 1655, bottom: 1765 },
        ],
      },
      {
        id: 'dark',
        name: 'Dark',
        background: 'templates/story-dark.png',
        designation: { LEO: '(LEO ONLY)', Public: '(Open to Public - LEO, Security, Military Personnel, & Approved Civilians)' },
        designedFor: DESIGNED_FOR_LEO,
        boxes: [
          { text: '{city}, {state}', font: TEKO, weight: 500, color: WHITE, size: 57.7, x: 46.4, w: 620, y: 807, valign: 'middle', maxLines: 1, upper: true },
          {
            runs: [
              { text: 'HOSTED BY ', font: TEKO, weight: 300, color: OLIVE },
              { text: '{hostedBy}', font: TEKO, weight: 500, color: WHITE },
            ],
            size: 42.4, x: 46.4, w: 520, y: 1127.4, lineGap: 42, maxLines: 2, bottom: 1186, upper: true,
          },
          { text: '{dateRange}', font: WORK, weight: 500, color: WHITE, size: 24.9, x: 146.6, w: 165, y: 1276, valign: 'middle', lineGap: 27.2, maxLines: 3, top: 1200, bottom: 1345 },
          { text: '{hours}', font: WORK, weight: 500, color: WHITE, size: 24.9, x: 430.5, w: 160, y: 1276, valign: 'middle', lineGap: 27.2, maxLines: 3, top: 1200, bottom: 1345 },
          { text: '{location}', font: WORK, weight: 500, color: WHITE, size: 24.9, x: 672, w: 375, y: 1276, valign: 'middle', lineGap: 27.2, maxLines: 5, top: 1200, bottom: 1345 },
          { text: '{designedFor}', font: TEKO, weight: 300, color: WHITE, size: 32.3, x: 80, w: 255, y: 1505.7, lineGap: 45, maxLines: 3 },
          {
            runs: [
              { text: '{price}', font: TEKO, weight: 500, color: WHITE },
              { text: ' per person*', font: TEKO, weight: 300, color: WHITE },
            ],
            size: 81.4, x: 46.4, w: 560, y: 1824.9, maxLines: 1,
          },
          { text: '*Limited Space Available -\nWill Sell Out Quickly  {designation}', font: WORK, weight: 500, color: WHITE, size: 21.8, x: 648, w: 395, y: 1709, valign: 'middle', lineGap: 25.9, top: 1655, bottom: 1765 },
        ],
      },
    ],
  },
];
