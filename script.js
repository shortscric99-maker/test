// Paste the Web App URL you get after deploying Code.gs (ends with /exec)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyuEX0scPt70-IPL10b5euk6SKOoCHbyKwqoghrbM1c9mdbz2FlbN2xlbtr25QhPPxK/exec';

const $ = id => document.getElementById(id);
const pass = $('pass'), list = $('list'), drop = $('drop'), input = $('file');

// Remember the passcode so you only type it once per device
try { pass.value = localStorage.getItem('pass') || ''; } catch (e) {}
pass.addEventListener('input', () => { try { localStorage.setItem('pass', pass.value); } catch (e) {} });

input.addEventListener('change', () => { handle(input.files); input.value = ''; });
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => handle(e.dataTransfer.files));

let queue = Promise.resolve(); // files upload one after another

function handle(files) {
  [...files].forEach(file => {
    const row = addRow(file);
    queue = queue.then(() => upload(file, row));
  });
}

function addRow(file) {
  const li = document.createElement('li');
  li.innerHTML = '<div class="top"><span class="name"></span><span class="st">Waiting</span></div><div class="bar"><i></i></div>';
  li.querySelector('.name').textContent = file.name + ' (' + fmt(file.size) + ')';
  list.prepend(li);
  return li;
}

const fmt = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

function status(row, text, cls) {
  row.querySelector('.st').textContent = text;
  if (cls) row.classList.add(cls);
}

async function upload(file, row) {
  try {
    status(row, 'Starting');
    const type = file.type || 'application/octet-stream';

    // 1) Ask your Apps Script for a private upload link (it holds the Drive access)
    const r = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ secret: pass.value, name: file.name, type, origin: location.origin })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Rejected');
