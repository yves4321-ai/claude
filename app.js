const FONT_FAMILY = 'Work Sans';
const STORAGE_KEY = 'flyer-maker:values';
const DEBUG = new URLSearchParams(location.search).has('debug');

const form = document.getElementById('fields');
const previews = document.getElementById('previews');
const backgrounds = {};
const canvases = {};

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

function drawPlaceholder(ctx, t) {
  ctx.fillStyle = '#f1efe9';
  ctx.fillRect(0, 0, t.width, t.height);
  ctx.strokeStyle = '#c9c4b8';
  ctx.lineWidth = Math.max(2, t.width / 300);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, t.width - 2 * ctx.lineWidth, t.height - 2 * ctx.lineWidth);
  ctx.fillStyle = '#9a9384';
  ctx.font = `600 ${Math.round(t.width / 28)}px "${FONT_FAMILY}"`;
  ctx.textAlign = 'center';
  ctx.fillText(`Canva background goes here: ${t.background}`, t.width / 2, t.height * 0.12);
}

function drawBox(ctx, box, text) {
  const { size, lines, lineHeight, shrunk, overflow } = layout(ctx, box, text);
  setFont(ctx, box, size);
  const lineGap = size * lineHeight;
  const blockHeight = lines.length * lineGap;
  let top = box.y;
  if (box.valign === 'middle') top = box.y + (box.h - blockHeight) / 2;
  if (box.valign === 'bottom') top = box.y + box.h - blockHeight;

  ctx.fillStyle = box.color || '#000';
  ctx.textBaseline = 'middle';
  const align = box.align || 'left';
  ctx.textAlign = align;
  const x = align === 'center' ? box.x + box.w / 2 : align === 'right' ? box.x + box.w : box.x;
  lines.forEach((line, i) => ctx.fillText(line, x, top + lineGap * (i + 0.5)));
  return { shrunk, overflow };
}

function render(t, values) {
  const canvas = canvases[t.id];
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, t.width, t.height);
  if (backgrounds[t.id]) ctx.drawImage(backgrounds[t.id], 0, 0, t.width, t.height);
  else drawPlaceholder(ctx, t);

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
    const result = drawBox(ctx, box, text);
    const snippet = text.replace(/\s+/g, ' ').slice(0, 40);
    if (result.overflow) notes.push({ level: 'error', text: `“${snippet}” is too long to fit. Try shortening it.` });
    else if (result.shrunk) notes.push({ level: 'info', text: `“${snippet}” was made a little smaller to fit.` });
  }
  const noteList = document.getElementById(`notes-${t.id}`);
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
  for (const t of TEMPLATES) render(t, values);
}

// ---------- export ----------

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fileName(t) {
  const { city, state } = formValues();
  const place = slug([city, state].filter(Boolean).join(' ')) || 'flyer';
  return `${place}-${t.id}.${t.output}`;
}

function canvasBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function exportBlob(t) {
  const canvas = canvases[t.id];
  if (t.output === 'pdf') {
    const [w, h] = t.pageInches;
    const pdf = new window.jspdf.jsPDF({ unit: 'in', format: [w, h], orientation: w > h ? 'landscape' : 'portrait' });
    pdf.addImage(canvas, 'PNG', 0, 0, w, h, undefined, 'FAST');
    return pdf.output('blob');
  }
  return canvasBlob(canvas);
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

async function downloadOne(t, button) {
  button.disabled = true;
  try {
    saveBlob(await exportBlob(t), fileName(t));
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
    for (const t of TEMPLATES) zip.file(fileName(t), await exportBlob(t));
    const { city, state } = formValues();
    const place = slug([city, state].filter(Boolean).join(' ')) || 'flyers';
    saveBlob(await zip.generateAsync({ type: 'blob' }), `${place}-flyers.zip`);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

// ---------- setup ----------

function buildPreviews() {
  for (const t of TEMPLATES) {
    const card = document.createElement('figure');
    card.className = 'card';
    const canvas = document.createElement('canvas');
    canvas.width = t.width;
    canvas.height = t.height;
    canvas.style.aspectRatio = `${t.width} / ${t.height}`;
    canvases[t.id] = canvas;

    const caption = document.createElement('figcaption');
    const title = document.createElement('span');
    title.textContent = t.name;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = `Download ${t.output.toUpperCase()}`;
    button.addEventListener('click', () => downloadOne(t, button));
    caption.append(title, button);

    const notes = document.createElement('ul');
    notes.className = 'notes';
    notes.id = `notes-${t.id}`;

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
    ...TEMPLATES.map(async (t) => {
      backgrounds[t.id] = await loadImage(t.background);
    }),
  ]);
  renderAll();
}

init();
