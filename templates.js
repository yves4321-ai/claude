// Flyer layouts.
//
// Each flyer is a blank background exported from Canva (all changing text
// removed) plus a list of text boxes drawn on top of it. Box coordinates are
// in pixels of the background image, measured from the top-left corner.
//
// Text box options:
//   text      Text to draw. {field} is replaced with the form value. A box
//             whose fields are all empty is skipped.
//   x, y, w, h  The box. Text wraps inside the width and never leaves the box.
//   size      Font size in pixels (at the background's resolution).
//   minSize   Smallest size text may shrink to when wrapping isn't enough.
//   weight    Work Sans weight: 400, 500, 600, 700 or 800.
//   color     'main' or 'accent' (set per light/dark version below), or any
//             CSS color.
//   align     'left', 'center' or 'right'.
//   valign    'top', 'middle' or 'bottom' inside the box.
//   lineHeight  Line spacing as a multiple of the font size.
//   maxLines  Most lines allowed before the text shrinks instead.
//   upper     true to show the text in capitals.
//   letterSpacing  Extra space between letters, in pixels.

// What each designation choice prints on the flyer.
const DESIGNATIONS = {
  LEO: 'Law Enforcement Only',
  Public: 'Open to the Public',
};

// Form fields, in the order they appear in the form.
const FIELDS = [
  { id: 'city', label: 'City', placeholder: 'Nashville' },
  { id: 'state', label: 'State', placeholder: 'TN' },
  { id: 'hostedBy', label: 'Hosted by', placeholder: 'Metro Nashville Police Department' },
  { id: 'dateRange', label: 'Date range', placeholder: 'October 14–16, 2026' },
  { id: 'hours', label: 'Hours', placeholder: '8:00 AM – 5:00 PM' },
  { id: 'location', label: 'Location (full address)', placeholder: 'Training Center\n123 Main Street\nNashville, TN 37201', multiline: true },
  { id: 'price', label: 'Price', placeholder: '$495' },
  { id: 'designation', label: 'Designation', options: Object.keys(DESIGNATIONS) },
  { id: 'capacity', label: 'Capacity / seats (8.5×11 only)', placeholder: 'Limited to 30 seats' },
];

// Light and dark versions share the text layout; each has its own background
// and text colors.
function versions(id, light, dark) {
  return [
    { id: 'light', name: 'Light', background: `templates/${id}-light.png`, colors: light },
    { id: 'dark', name: 'Dark', background: `templates/${id}-dark.png`, colors: dark },
  ];
}
const LIGHT = { main: '#1b2a4a', accent: '#c8102e' };
const DARK = { main: '#ffffff', accent: '#f2b705' };

// NOTE: positions below are placeholders until the real Canva backgrounds are
// added to templates/. They get measured against the filled-in examples.
const TEMPLATES = [
  {
    id: 'print',
    name: 'Print flyer — 8.5×11',
    versions: versions('print', LIGHT, DARK),
    width: 2550, // 8.5in at 300 DPI
    height: 3300, // 11in at 300 DPI
    output: 'pdf', // light and dark are pages 1 and 2 of one PDF
    pageInches: [8.5, 11],
    boxes: [
      { text: '{city}, {state}', x: 200, y: 900, w: 2150, h: 260, size: 150, weight: 800, color: 'main', align: 'center', valign: 'middle', upper: true, maxLines: 1 },
      { text: '{designation}', x: 200, y: 1180, w: 2150, h: 120, size: 80, weight: 600, color: 'accent', align: 'center', valign: 'middle', upper: true, maxLines: 1 },
      { text: '{dateRange}', x: 200, y: 1420, w: 2150, h: 150, size: 110, weight: 700, color: 'main', align: 'center', valign: 'middle', maxLines: 1 },
      { text: '{hours}', x: 200, y: 1580, w: 2150, h: 110, size: 80, weight: 500, color: 'main', align: 'center', valign: 'middle', maxLines: 1 },
      { text: '{location}', x: 300, y: 1760, w: 1950, h: 420, size: 80, weight: 500, color: 'main', align: 'center', valign: 'middle', maxLines: 4 },
      { text: 'Hosted by {hostedBy}', x: 300, y: 2230, w: 1950, h: 240, size: 80, weight: 600, color: 'main', align: 'center', valign: 'middle', maxLines: 2 },
      { text: '{price}', x: 300, y: 2520, w: 1950, h: 180, size: 130, weight: 800, color: 'accent', align: 'center', valign: 'middle', maxLines: 1 },
      { text: '{capacity}', x: 300, y: 2720, w: 1950, h: 120, size: 70, weight: 600, color: 'main', align: 'center', valign: 'middle', upper: true, maxLines: 1 },
    ],
  },
  {
    id: 'square',
    name: 'Social post — 1080×1080',
    versions: versions('square', LIGHT, DARK),
    width: 1080,
    height: 1080,
    output: 'png',
    boxes: [
      { text: '{city}, {state}', x: 80, y: 300, w: 920, h: 110, size: 72, weight: 800, color: 'main', align: 'center', valign: 'middle', upper: true, maxLines: 1 },
      { text: '{designation}', x: 80, y: 415, w: 920, h: 50, size: 34, weight: 600, color: 'accent', align: 'center', valign: 'middle', upper: true, maxLines: 1 },
      { text: '{dateRange} • {hours}', x: 80, y: 500, w: 920, h: 110, size: 44, weight: 700, color: 'main', align: 'center', valign: 'middle', maxLines: 2 },
      { text: '{location}', x: 120, y: 630, w: 840, h: 170, size: 34, weight: 500, color: 'main', align: 'center', valign: 'middle', maxLines: 4 },
      { text: 'Hosted by {hostedBy}', x: 120, y: 810, w: 840, h: 90, size: 34, weight: 600, color: 'main', align: 'center', valign: 'middle', maxLines: 2 },
      { text: '{price}', x: 120, y: 910, w: 840, h: 80, size: 56, weight: 800, color: 'accent', align: 'center', valign: 'middle', maxLines: 1 },
    ],
  },
  {
    id: 'story',
    name: 'Story — 1080×1920',
    versions: versions('story', LIGHT, DARK),
    width: 1080,
    height: 1920,
    output: 'png',
    boxes: [
      { text: '{city}, {state}', x: 80, y: 560, w: 920, h: 200, size: 88, weight: 800, color: 'main', align: 'center', valign: 'middle', upper: true, maxLines: 2 },
      { text: '{designation}', x: 80, y: 780, w: 920, h: 60, size: 40, weight: 600, color: 'accent', align: 'center', valign: 'middle', upper: true, maxLines: 1 },
      { text: '{dateRange}', x: 80, y: 900, w: 920, h: 80, size: 56, weight: 700, color: 'main', align: 'center', valign: 'middle', maxLines: 1 },
      { text: '{hours}', x: 80, y: 985, w: 920, h: 60, size: 42, weight: 500, color: 'main', align: 'center', valign: 'middle', maxLines: 1 },
      { text: '{location}', x: 120, y: 1100, w: 840, h: 240, size: 42, weight: 500, color: 'main', align: 'center', valign: 'middle', maxLines: 4 },
      { text: 'Hosted by {hostedBy}', x: 120, y: 1370, w: 840, h: 130, size: 42, weight: 600, color: 'main', align: 'center', valign: 'middle', maxLines: 2 },
      { text: '{price}', x: 120, y: 1530, w: 840, h: 110, size: 72, weight: 800, color: 'accent', align: 'center', valign: 'middle', maxLines: 1 },
    ],
  },
];
