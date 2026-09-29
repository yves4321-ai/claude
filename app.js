const FONT_FAMILY = 'Work Sans';
const STORAGE_KEY = 'flyer-maker:values';
const DEBUG = new URLSearchParams(location.search).has('debug');

const form = document.getElementById('fields');
const previews = document.getElementById('previews');
const backgrounds = {};
const canvases = {};

// Every template/version pair is drawn on its own canvas.
const sheets = TEMPLATES.flatMap((t) => t.versions.map((v) => ({ key: `${t.id}-${v.id}`, t, v })));

// ---------- form ----------

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function save(values) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Private windows can block storage; the form still works.
  }
}

function buildForm() {
  const saved = loadSaved();
  for (const field of FIELDS) {
    const label = document.createElement('label');
    label.textContent = field.label;
    let input;
    if (field.options) {
      input = document.createElement('select');
      for (const option of field.options) {
        input.add(new Option(`${option} — ${DESIGNATIONS[option]}`, option));
      }
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
  form.addEventListener('input', scheduleRender);
  document.getElementById('clear').addEventListener('click', () => {
    form.reset();
    scheduleRender();
  });
}

function formValues() {
  const values = {};
  for (const field of FIELDS) values[field.id] = form.elements[field.id].value.trim();
  return values;
}

// ---------- text layout ----------

function fillText(template, values) {
  let anyFilled = false;
  const text = template.replace(/\{(\w+)\}/g, (_, key) => {
    let value = values[key] || '';
    if (key === 'designation') value = DESIGNATIONS[value] || value;
    if (value) anyFilled = true;
    return value;
  });
  return anyFilled ? text.trim() : '';
}

function setFont(ctx, box, size) {
  ctx.font = `${box.weight || 400} ${size}px "${FONT_FAMILY}"`;
  ctx.letterSpacing = `${box.letterSpacing || 0}px`;
}

// Greedy word wrap. Keeps the user's own line breaks.
function wrap(ctx, text, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let line = words[0];
    for (const word of words.slice(1)) {
      const next = `${line} ${word}`;
      if (ctx.measureText(next).width <= width) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function widest(ctx, lines) {
  return Math.max(...lines.map((line) => ctx.measureText(line).width));
}

// Wrapping can leave one lonely word on the last line. Narrow the wrap width
// as far as possible without adding lines so the lines come out even.
function balance(ctx, text, width, lineCount) {
  let lo = 0;
  let hi = width;
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    const lines = wrap(ctx, text, mid);
    if (lines.length <= lineCount && widest(ctx, lines) <= mid) hi = mid;
    else lo = mid;
  }
  return wrap(ctx, text, hi);
}

// Wrap first; shrink only when the wrapped text won't fit the box.
function layout(ctx, box, text) {
  const lineHeight = box.lineHeight || 1.15;
  const maxLines = box.maxLines || Infinity;
  const minSize = box.minSize || Math.round(box.size * 0.6);
  const step = Math.max(1, box.size * 0.02);
  for (let size = box.size; size >= minSize; size -= step) {
    setFont(ctx, box, size);
    const lines = wrap(ctx, text, box.w);
    const fits =
      lines.length <= maxLines &&
      lines.length * size * lineHeight <= box.h &&
      widest(ctx, lines) <= box.w;
    if (fits) {
      return { size, lines: balance(ctx, text, box.w, lines.length), lineHeight, shrunk: size < box.size, overflow: false };
    }
  }
  setFont(ctx, box, minSize);
  return { size: minSize, lines: wrap(ctx, text, box.w), lineHeight, shrunk: true, overflow: true };
}

// ---------- drawing ----------

function drawPlaceholder(ctx, t, v) {
  ctx.fillStyle = v.id === 'dark' ? '#2b2f38' : '#f1efe9';
  ctx.fillRect(0, 0, t.width, t.height);
  ctx.strokeStyle = '#c9c4b8';
  ctx.lineWidth = Math.max(2, t.width / 300);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, t.width - 2 * ctx.lineWidth, t.height - 2 * ctx.lineWidth);
  ctx.fillStyle = '#9a9384';
  ctx.font = `600 ${Math.round(t.width / 28)}px "${FONT_FAMILY}"`;
  ctx.textAlign = 'center';
  ctx.fillText(`Canva background goes here: ${v.background}`, t.width / 2, t.height * 0.12);
}

function drawBox(ctx, box, text, colors) {
  const { size, lines, lineHeight, shrunk, overflow } = layout(ctx, box, text);
  setFont(ctx, box, size);
  const lineGap = size * lineHeight;
  const blockHeight = lines.length * lineGap;
  let top = box.y;
  if (box.valign === 'middle') top = box.y + (box.h - blockHeight) / 2;
  if (box.valign === 'bottom') top = box.y + box.h - blockHeight;

  ctx.fillStyle = colors[box.color] || box.color || '#000';
  ctx.textBaseline = 'middle';
  const align = box.align || 'left';
  ctx.textAlign = align;
  const x = align === 'center' ? box.x + box.w / 2 : align === 'right' ? box.x + box.w : box.x;
  lines.forEach((line, i) => ctx.fillText(line, x, top + lineGap * (i + 0.5)));
  return { shrunk, overflow };
}

function render({ key, t, v }, values) {
  const ctx = canvases[key].getContext('2d');
  ctx.clearRect(0, 0, t.width, t.height);
  if (backgrounds[key]) ctx.drawImage(backgrounds[key], 0, 0, t.width, t.height);
  else drawPlaceholder(ctx, t, v);

  const notes = [];
  for (const box of t.boxes) {
    if (DEBUG) {
      ctx.strokeStyle = 'rgba(255,0,128,0.8)';
      ctx.lineWidth = Math.max(1, t.width / 800);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
    }
    let text = fillText(box.text, values);
    if (!text) continue;
    if (box.upper) text = text.toUpperCase();
    const result = drawBox(ctx, box, text, v.colors);
    const snippet = text.replace(/\s+/g, ' ').slice(0, 40);
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
  save(values);
  for (const sheet of sheets) render(sheet, values);
}

// ---------- export ----------

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function place() {
  const { city, state } = formValues();
  return slug([city, state].filter(Boolean).join(' ')) || 'flyer';
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
    for (const t of TEMPLATES) for (const file of exportFiles(t)) zip.file(file.name, await file.blob());
    saveBlob(await zip.generateAsync({ type: 'blob' }), `${place()}-flyers.zip`);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

// ---------- setup ----------

function buildPreviews() {
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
  const all = document.getElementById('download-all');
  all.addEventListener('click', () => downloadAll(all));
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
  const weights = new Set([600]);
  for (const t of TEMPLATES) for (const box of t.boxes) weights.add(box.weight || 400);
  await Promise.all([...weights].map((w) => document.fonts.load(`${w} 40px "${FONT_FAMILY}"`)));
}

async function init() {
  buildForm();
  buildPreviews();
  await Promise.all([
    loadFonts(),
    ...sheets.map(async ({ key, v }) => {
      backgrounds[key] = await loadImage(v.background);
    }),
  ]);
  renderAll();
}

init();
