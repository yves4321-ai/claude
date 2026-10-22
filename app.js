const COURSE_KEY = 'flyer-maker:course';
const DEBUG = new URLSearchParams(location.search).has('debug');

const form = document.getElementById('fields');
const previews = document.getElementById('previews');
const backgrounds = {}; // image per background path
let canvases = {};

// The course being edited, and its template/version pairs (one canvas each).
let course = COURSES[0];
let sheets = [];

// ---------- storage ----------
// Private windows can block storage; the app still works without it.

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do.
  }
}

// ---------- form ----------

function buildForm() {
  const saved = load(course.storageKey, {});
  form.replaceChildren();
  for (const field of course.fields) {
    const label = document.createElement('label');
    label.textContent = field.label;
    let input;
    if (field.options) {
      input = document.createElement('select');
      for (const [value, text] of Object.entries(field.options)) input.add(new Option(text, value));
    } else if (field.multiline) {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = 'text';
    }
    input.name = field.id;
    input.placeholder = field.placeholder || '';
    if (saved[field.id] !== undefined) input.value = saved[field.id];
    label.appendChild(input);
    form.appendChild(label);
  }
}

function formValues() {
  const values = {};
  for (const field of course.fields) values[field.id] = form.elements[field.id].value.trim();
  return values;
}

// Form values plus the wording each design uses for them.
function valuesFor(v, values) {
  const price = /^[\d,.]+$/.test(values.price) ? `$${values.price}` : values.price;
  const seats = values.capacity;
  const spots = !seats
    ? v.limited || 'Limited Space Available'
    : /^\d+$/.test(seats)
      ? `Only ${seats} Spots Available`
      : seats;
  return {
    ...values,
    price,
    spots,
    designation: v.designation?.[values.designation] || '',
    designedFor: v.designedFor?.[values.designation] || '',
  };
}

// ---------- text layout ----------

// Height of capital letters as a share of font size, used to center text.
const CAP_HEIGHT = { Teko: 0.627, 'Work Sans': 0.66 };

// Turns a box into styled pieces with the form values filled in, or null
// when the box has nothing to show.
function boxRuns(box, values) {
  if (box.when && !values[box.when]) return null;
  const runs = box.runs || [{ text: box.text, font: box.font, weight: box.weight, color: box.color }];
  let fields = 0;
  let filled = 0;
  const out = runs.map((run) => {
    let text = run.text.replace(/\{(\w+)\}/g, (_, key) => {
      fields++;
      if (values[key]) filled++;
      return values[key] || '';
    });
    if (box.joinLines) text = text.replace(/\s*\n\s*/g, ' ');
    if (box.upper) text = text.toUpperCase();
    return { ...run, text };
  });
  if (fields && !filled) return null;
  return out;
}

function fontFor(piece, size) {
  return `${piece.weight || 400} ${size}px "${piece.font}"`;
}

// Splits styled runs into words. Each word remembers its style and whether a
// space comes before it; '\n' starts a new line (an empty one stays empty).
function words(runs) {
  const out = [[]];
  let space = false;
  for (const run of runs) {
    for (const part of run.text.split(/(\n| +)/)) {
      if (part === '\n') {
        out.push([]);
        space = false;
      } else if (/^ +$/.test(part)) {
        space = true;
      } else if (part) {
        out[out.length - 1].push({ ...run, text: part, space: space && out[out.length - 1].length > 0 });
        space = false;
      }
    }
  }
  return out;
}

// Greedy word wrap of one paragraph, the same way Canva wraps text boxes.
function wrapParagraph(ctx, paragraph, size, width) {
  const lines = [];
  let line = [];
  let lineWidth = 0;
  for (const word of paragraph) {
    ctx.font = fontFor(word, size);
    const w = ctx.measureText(word.text).width;
    const gap = line.length && word.space ? ctx.measureText(' ').width : 0;
    if (line.length && lineWidth + gap + w > width) {
      lines.push({ pieces: line, width: lineWidth });
      line = [{ ...word, gap: 0, w }];
      lineWidth = w;
    } else {
      line.push({ ...word, gap, w });
      lineWidth += gap + w;
    }
  }
  lines.push({ pieces: line, width: lineWidth });
  return lines;
}

// Wraps every paragraph. A single word left alone on a paragraph's last line
// looks odd, so the wrap is narrowed until at least two words share it —
// as long as that doesn't add a line.
function wrap(ctx, paragraphs, size, width) {
  return paragraphs.flatMap((paragraph) => {
    const lines = wrapParagraph(ctx, paragraph, size, width);
    if (lines.length < 2 || lines[lines.length - 1].pieces.length > 1) return lines;
    for (let w = width - size / 4; w > width * 0.6; w -= size / 4) {
      const tighter = wrapParagraph(ctx, paragraph, size, w);
      if (tighter.length > lines.length) break;
      if (tighter[tighter.length - 1].pieces.length > 1) return tighter;
    }
    return lines;
  });
}

function firstBaseline(box, lineCount, size, gap) {
  const cap = (CAP_HEIGHT[box.font || box.runs[0].font] || 0.65) * size;
  if (box.valign === 'middle') return box.y + cap / 2 - ((lineCount - 1) * gap) / 2;
  if (box.valign === 'bottom') return box.y - (lineCount - 1) * gap;
  return box.y;
}

// Wrap first; only make the text smaller when wrapped text still won't fit.
function layout(ctx, box, runs) {
  const paragraphs = words(runs);
  const baseGap = box.lineGap || box.size * 1.2;
  for (let scale = 1; scale >= 0.55; scale -= 0.01) {
    const size = box.size * scale;
    const gap = baseGap * scale;
    const lines = wrap(ctx, paragraphs, size, box.w);
    const first = firstBaseline(box, lines.length, size, gap);
    const last = first + (lines.length - 1) * gap;
    const cap = (CAP_HEIGHT[box.font || box.runs[0].font] || 0.65) * size;
    const fits =
      lines.length <= (box.maxLines || Infinity) &&
      lines.every((line) => line.width <= box.w + 0.5) &&
      (box.top === undefined || first - cap >= box.top) &&
      (box.bottom === undefined || last <= box.bottom);
    if (fits) return { size, gap, lines, first, shrunk: scale < 1, overflow: false };
  }
  const size = box.size * 0.55;
  const gap = baseGap * 0.55;
  const lines = wrap(ctx, paragraphs, size, box.w);
  return { size, gap, lines, first: firstBaseline(box, lines.length, size, gap), shrunk: true, overflow: true };
}

// ---------- drawing ----------

function drawPlaceholder(ctx, t, v) {
  ctx.fillStyle = v.id === 'dark' ? '#2b2f38' : '#f1efe9';
  ctx.fillRect(0, 0, t.width, t.height);
  ctx.fillStyle = '#9a9384';
  ctx.font = `600 ${Math.round(t.width / 28)}px "Work Sans"`;
  ctx.textAlign = 'center';
  ctx.fillText(`Missing background: ${v.background}`, t.width / 2, t.height * 0.12);
}

function drawBox(ctx, box, runs) {
  const { size, gap, lines, first, shrunk, overflow } = layout(ctx, box, runs);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    let x = box.x;
    if (box.align === 'center') x += (box.w - line.width) / 2;
    if (box.align === 'right') x += box.w - line.width;
    const y = first + i * gap;
    for (const piece of line.pieces) {
      x += piece.gap;
      ctx.font = fontFor(piece, size);
      ctx.fillStyle = piece.color;
      ctx.fillText(piece.text, x, y);
      x += piece.w;
    }
  });
  return { shrunk, overflow };
}

function render({ key, t, v }, values) {
  const ctx = canvases[key].getContext('2d');
  ctx.clearRect(0, 0, t.width, t.height);
  const background = backgrounds[v.background];
  if (background) ctx.drawImage(background, 0, 0, t.width, t.height);
  else drawPlaceholder(ctx, t, v);

  const filled = valuesFor(v, values);
  const notes = [];
  for (const box of v.boxes) {
    if (DEBUG) {
      ctx.strokeStyle = 'rgba(255,0,128,0.8)';
      ctx.lineWidth = Math.max(1, t.width / 800);
      const top = box.top ?? box.y - box.size;
      const bottom = box.bottom ?? box.y + (box.lineGap || box.size) * ((box.maxLines || 1) - 1);
      ctx.strokeRect(box.x, top, box.w, bottom - top);
    }
    const runs = boxRuns(box, filled);
    if (!runs) continue;
    const result = drawBox(ctx, box, runs);
    const snippet = runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (result.overflow) notes.push({ level: 'error', text: `“${snippet}” is too long to fit. Try shortening it.` });
    else if (result.shrunk) notes.push({ level: 'info', text: `“${snippet}” was made a little smaller to fit.` });
  }
  const noteList = document.getElementById(`notes-${key}`);
  noteList.replaceChildren(
    ...notes.map((n) => {
      const li = document.createElement('li');
      li.className = n.level;
      li.textContent = n.text;
      return li;
    }),
  );
}

let pending = null;
function scheduleRender() {
  clearTimeout(pending);
  pending = setTimeout(renderAll, 120);
}

function renderAll() {
  const values = formValues();
  store(course.storageKey, values);
  for (const sheet of sheets) render(sheet, values);
}

// ---------- export ----------

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function place() {
  return slug(course.fileName(formValues())) || 'flyer';
}

// A PDF holds every version as its own page; PNGs are one file per version.
function exportFiles(t) {
  if (t.output === 'pdf') return [{ name: `${place()}-${t.id}.pdf`, blob: () => pdfBlob(t) }];
  return t.versions.map((v) => ({
    name: `${place()}-${t.id}-${v.id}.png`,
    blob: () => canvasBlob(canvases[`${t.id}-${v.id}`]),
  }));
}

function canvasBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function pdfBlob(t) {
  const [w, h] = t.pageInches;
  const orientation = w > h ? 'landscape' : 'portrait';
  const pdf = new window.jspdf.jsPDF({ unit: 'in', format: [w, h], orientation });
  t.versions.forEach((v, i) => {
    if (i > 0) pdf.addPage([w, h], orientation);
    pdf.addImage(canvases[`${t.id}-${v.id}`], 'PNG', 0, 0, w, h, undefined, 'FAST');
  });
  return pdf.output('blob');
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadOne(t, v, button) {
  button.disabled = true;
  try {
    const files = exportFiles(t);
    const file = files.find((f) => f.name.endsWith(`-${v.id}.png`)) || files[0];
    saveBlob(await file.blob(), file.name);
  } finally {
    button.disabled = false;
  }
}

async function downloadAll(button) {
  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Preparing…';
  try {
    const zip = new JSZip();
    for (const t of course.templates) for (const file of exportFiles(t)) zip.file(file.name, await file.blob());
    saveBlob(await zip.generateAsync({ type: 'blob' }), `${place()}-flyers.zip`);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

// ---------- setup ----------

function buildPreviews() {
  canvases = {};
  previews.replaceChildren();
  for (const { key, t, v } of sheets) {
    const card = document.createElement('figure');
    card.className = 'card';
    const canvas = document.createElement('canvas');
    canvas.width = t.width;
    canvas.height = t.height;
    canvas.style.aspectRatio = `${t.width} / ${t.height}`;
    canvases[key] = canvas;

    const caption = document.createElement('figcaption');
    const title = document.createElement('span');
    title.textContent = `${t.name} (${v.name.toLowerCase()})`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = t.output === 'pdf' ? 'Download PDF (both pages)' : 'Download PNG';
    button.addEventListener('click', () => downloadOne(t, v, button));
    caption.append(title, button);

    const notes = document.createElement('ul');
    notes.className = 'notes';
    notes.id = `notes-${key}`;

    card.append(canvas, caption, notes);
    previews.appendChild(card);
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadFonts() {
  const fonts = new Set(['600 40px "Work Sans"']);
  for (const c of COURSES) {
    for (const t of c.templates) {
      for (const v of t.versions) {
        for (const box of v.boxes) {
          for (const piece of box.runs || [box]) fonts.add(fontFor(piece, 40));
        }
      }
    }
  }
  await Promise.all([...fonts].map((font) => document.fonts.load(font)));
}

// Shows a course: its form, its flyers and its saved values.
async function showCourse(id) {
  course = COURSES.find((c) => c.id === id) || COURSES[0];
  store(COURSE_KEY, course.id);
  for (const button of document.querySelectorAll('#courses button')) {
    button.setAttribute('aria-pressed', button.dataset.course === course.id);
  }
  document.getElementById('course-title').textContent = course.title;
  sheets = course.templates.flatMap((t) => t.versions.map((v) => ({ key: `${t.id}-${v.id}`, t, v })));
  buildForm();
  buildPreviews();
  await Promise.all(
    sheets.map(async ({ v }) => {
      if (!(v.background in backgrounds)) backgrounds[v.background] = await loadImage(v.background);
    }),
  );
  renderAll();
}

async function init() {
  const nav = document.getElementById('courses');
  for (const c of COURSES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.course = c.id;
    button.textContent = c.name;
    button.addEventListener('click', () => showCourse(c.id));
    nav.appendChild(button);
  }
  form.addEventListener('input', scheduleRender);
  document.getElementById('clear').addEventListener('click', () => {
    form.reset();
    scheduleRender();
  });
  const all = document.getElementById('download-all');
  all.addEventListener('click', () => downloadAll(all));
  await loadFonts();
  await showCourse(load(COURSE_KEY, COURSES[0].id));
}

init();
