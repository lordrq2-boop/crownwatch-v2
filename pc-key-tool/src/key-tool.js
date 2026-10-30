import qrcode from 'qrcode-generator';
import { makeDailyCode, makePairCode } from '../../src/dailyCode';

const KEY = 'crownwatch.secret';
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

const getSecret = () => localStorage.getItem(KEY);
const newSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');

function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 8, margin: 32, scalable: true });
}

let hideTimer = null;
let showing = null; // 'pair' | 'code' | null

function hide() {
  clearTimeout(hideTimer);
  showing = null;
  $('qrBox').classList.add('hidden');
  $('qr').innerHTML = '';
  $('caption').textContent = '';
  window.__lastPayload = null;
}

function show(kind) {
  const secret = getSecret();
  if (!secret) return;
  clearTimeout(hideTimer);
  showing = kind;
  const payload = kind === 'pair' ? makePairCode(secret) : makeDailyCode(secret, todayKey());
  window.__lastPayload = payload;
  $('qr').innerHTML = qrSvg(payload);
  $('qrBox').classList.remove('hidden');
  $('caption').textContent = kind === 'pair' ? 'Pairing code. Scan it once in the app: Settings, then Pair with PC key tool.' : `Today's code for ${todayKey()}. It stops working at midnight.`;
  hideTimer = setTimeout(hide, kind === 'pair' ? 90000 : 120000);
  $('secretText').textContent = kind === 'pair' ? secret : '';
}

function refresh() {
  const has = !!getSecret();
  $('setup').classList.toggle('hidden', has);
  $('main').classList.toggle('hidden', !has);
  $('today').textContent = todayKey();
}

$('create').onclick = () => { localStorage.setItem(KEY, newSecret()); refresh(); };
$('restoreBtn').onclick = () => {
  const v = $('restoreInput').value.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(v)) { $('restoreMsg').textContent = 'That is not a valid key (32 letters and numbers, a to f).'; return; }
  localStorage.setItem(KEY, v);
  $('restoreInput').value = '';
  $('restoreMsg').textContent = '';
  refresh();
};
$('showPair').onclick = () => show('pair');
$('showCode').onclick = () => show('code');
$('hideBtn').onclick = hide;
$('resetBtn').onclick = () => {
  if (confirm('Delete the key from this browser? You will need to create or restore a key and pair the phone again.')) { localStorage.removeItem(KEY); hide(); refresh(); }
};

// At midnight the shown code must change.
setInterval(() => {
  $('today').textContent = todayKey();
  if (showing === 'code') show('code');
}, 30000);

refresh();
