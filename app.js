(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byNo = new Map(QUESTIONS.map(q => [q.n, q]));
const KEY = 'gplx-b-progress-v1';
const EXAM_PASS = 27, EXAM_SECS = 20 * 60;

// ---------- persisted progress: { [n]: { ok: bool, wrong: count } } ----------
let progress = {};
try { progress = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
const save = () => localStorage.setItem(KEY, JSON.stringify(progress));
function record(n, ok) {
  const p = progress[n] || { ok: false, wrong: 0 };
  p.ok = ok;
  if (!ok) p.wrong++;
  progress[n] = p;
  save();
}
const status = n => progress[n] ? (progress[n].ok ? 'ok' : 'bad') : '';

// ---------- session state ----------
// view: 'practice' | 'summary' | 'exam' | 'examlist' | 'empty'
let S = { view: 'empty', navId: '', title: '', note: '', list: [], idx: 0, sel: {}, checked: {}, exam: null };
let timerId = null;

const critNos = QUESTIONS.filter(q => q.crit).map(q => q.n);
const wrongNos = () => QUESTIONS.filter(q => progress[q.n] && !progress[q.n].ok).map(q => q.n);

// ---------- sidebar ----------
function counts(nos) {
  let ok = 0; nos.forEach(n => { if (progress[n] && progress[n].ok) ok++; });
  return `${ok}/${nos.length}`;
}
function renderSidebar() {
  let h = '<h3>Luyện tập</h3>';
  h += navBtn('crit', 'Câu điểm liệt', counts(critNos), true);
  h += navBtn('wrong', 'Câu đã làm sai', String(wrongNos().length), true);
  h += navBtn('examlist', 'Thi thử (30 câu / 20 phút)', '', true);
  h += '<h3>Ôn theo nhóm câu giống nhau</h3>';
  for (const t of Object.keys(TOPICS)) {
    const gs = GROUPS.filter(g => g.topic == t);
    const open = S.navId.startsWith('g:') && gs.some(g => 'g:' + g.id === S.navId) ? ' open' : '';
    h += `<details${open}><summary>Chương ${t}. ${esc(TOPICS[t])}</summary>`;
    gs.forEach(g => { h += navBtn('g:' + g.id, g.title, counts(g.nos)); });
    h += '</details>';
  }
  $('#sidebar').innerHTML = h;
  const total = QUESTIONS.length, done = QUESTIONS.filter(q => progress[q.n] && progress[q.n].ok).length;
  $('#overall').textContent = `Đã nắm: ${done}/${total} câu`;
}
function navBtn(id, label, cnt, flat) {
  return `<button class="nav-item${flat ? ' flat' : ''}${S.navId === id ? ' active' : ''}" data-nav="${id}"><span>${esc(label)}</span><span class="cnt">${cnt}</span></button>`;
}
$('#sidebar').addEventListener('click', e => {
  const b = e.target.closest('[data-nav]'); if (!b) return;
  openNav(b.dataset.nav);
  $('#sidebar').classList.remove('open');
});
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

function openNav(id) {
  stopTimer();
  S = { view: 'practice', navId: id, title: '', note: '', list: [], idx: 0, sel: {}, checked: {}, exam: null };
  if (id === 'crit') { S.title = 'Câu điểm liệt'; S.note = 'Sai một câu điểm liệt là trượt cả bài thi.'; S.list = critNos.slice(); }
  else if (id === 'wrong') { S.title = 'Câu đã làm sai'; S.list = wrongNos(); }
  else if (id === 'examlist') { S.view = 'examlist'; }
  else if (id.startsWith('g:')) {
    const g = GROUPS.find(g => 'g:' + g.id === id);
    S.title = g.title; S.note = g.note || ''; S.list = g.nos.slice();
  }
  if (S.view === 'practice' && !S.list.length) S.view = 'empty';
  render();
}

// ---------- rendering ----------
function render() { renderSidebar(); renderMain(); window.scrollTo(0, 0); }
function renderMain() {
  const m = $('#main');
  if (S.view === 'empty') {
    m.innerHTML = `<div class="card empty">${S.navId === 'wrong' ? 'Chưa có câu nào làm sai. 👍' : 'Chọn một nhóm câu hỏi ở menu bên trái để bắt đầu.'}</div>`;
    return;
  }
  if (S.view === 'examlist') return renderExamList(m);
  if (S.view === 'summary') return renderSummary(m);
  renderQuestion(m);
}

function chipsHtml() {
  return '<div class="chips">' + S.list.map((n, i) => {
    const q = byNo.get(n);
    let cls = '';
    if (S.exam && !S.exam.done) cls = S.sel[n] != null ? 'answered' : '';
    else if (S.checked[n]) cls = S.sel[n] != null && q.a[S.sel[n]][1] ? 'ok' : 'bad';
    else if (!S.exam) cls = status(n);
    return `<button class="chip ${cls}${i === S.idx ? ' cur' : ''}${q.crit ? ' crit' : ''}" data-go="${i}" title="Câu ${n}">${n}</button>`;
  }).join('') + '</div>';
}

function headHtml() {
  const isGroup = !S.exam;
  let h = `<div class="head"><h2>${esc(S.title)} <span style="color:var(--muted);font-weight:400;font-size:14px">(${S.list.length} câu)</span></h2>`;
  if (S.exam) {
    h += `<span id="timer" class="timer"></span>`;
    h += S.exam.done ? '' : `<button class="btn primary" id="submitExam">Nộp bài</button>`;
  } else {
    h += `<button class="btn" id="toSummary">Xem tổng hợp đáp án</button>`;
    h += `<button class="btn" id="shuffle">Trộn thứ tự</button>`;
    h += `<button class="btn" id="resetSession">Làm lại</button>`;
  }
  return h + '</div>' + (S.note && isGroup ? `<p class="note">⚠ ${esc(S.note)}</p>` : '');
}

function renderQuestion(m) {
  const n = S.list[S.idx], q = byNo.get(n);
  const examLive = S.exam && !S.exam.done;
  const checked = !!S.checked[n] || (S.exam && S.exam.done);
  const sel = S.sel[n];
  let h = `<div class="card">${headHtml()}${chipsHtml()}</div>`;
  if (S.exam && S.exam.done) h += examResultHtml();
  h += `<div class="card"><div class="qmeta"><span>Câu ${S.idx + 1}/${S.list.length}</span><span>· Số ${n} trong bộ 600 câu</span>${q.crit ? '<span class="badge">Điểm liệt</span>' : ''}</div>`;
  h += `<p class="qtext">${esc(q.t)}</p>`;
  if (q.img) h += `<img class="qimg" src="images/questions/${esc(q.img)}" alt="Hình câu ${n}">`;
  h += '<div class="answers">';
  q.a.forEach((a, i) => {
    let cls = '';
    if (checked) cls = a[1] ? 'right' : (sel === i ? 'wrong' : '');
    else if (sel === i) cls = 'sel';
    h += `<button class="ans ${cls}" data-ans="${i}" ${checked ? 'disabled' : ''}><span class="k">${i + 1}</span><span>${esc(a[0])}</span></button>`;
  });
  h += '</div>';
  if (checked && !examLive) {
    const ok = sel != null && q.a[sel][1];
    const right = q.a.findIndex(a => a[1]) + 1;
    h += `<div class="result ${ok ? 'ok' : 'bad'}"><b>${sel == null ? 'Chưa chọn đáp án.' : ok ? 'Chính xác!' : 'Chưa đúng.'}</b> Đáp án đúng: ${right}.${q.tip ? `<div class="tip">💡 ${esc(q.tip)}</div>` : ''}</div>`;
  }
  h += '<div class="actions"><button class="btn" id="prev">← Trước</button><span class="sp"></span>';
  if (!checked && !S.exam) h += `<button class="btn primary" id="check" ${sel == null ? 'disabled' : ''}>Kiểm tra</button>`;
  h += `<button class="btn${checked ? ' primary' : ''}" id="next">${S.idx === S.list.length - 1 ? 'Xong' : 'Câu tiếp →'}</button></div></div>`;
  m.innerHTML = h;
  if (S.exam) tickTimer();
}

function renderSummary(m) {
  let h = `<div class="card"><div class="head"><h2>${esc(S.title)} — tổng hợp đáp án</h2><button class="btn primary" id="toPractice">Luyện tập nhóm này</button></div>`;
  if (S.note) h += `<p class="note">⚠ ${esc(S.note)}</p>`;
  h += '<table class="sum"><tr><th>Câu</th><th>Câu hỏi</th><th>Đáp án đúng</th></tr>';
  S.list.forEach(n => {
    const q = byNo.get(n), right = q.a.filter(a => a[1]).map(a => a[0]).join(' / ');
    h += `<tr><td class="n">${n}${q.crit ? ' <span class="badge">!</span>' : ''}</td><td>${esc(q.t)}${q.img ? `<img src="images/questions/${esc(q.img)}" loading="lazy" alt="">` : ''}</td><td class="ans-ok">${esc(right)}</td></tr>`;
  });
  m.innerHTML = h + '</table></div>';
}

function renderExamList(m) {
  let h = '<div class="card"><div class="head"><h2>Thi thử hạng B</h2></div><p>30 câu, 20 phút, đạt khi đúng từ 27 câu trở lên và không sai câu điểm liệt. Chỉ xem đáp án sau khi nộp bài.</p>';
  h += '<p><button class="btn primary" id="randomExam">Đề ngẫu nhiên</button></p><div class="exam-grid">';
  EXAMS.forEach(e => { h += `<button class="btn" data-exam="${e.id}">Đề ${e.id}</button>`; });
  m.innerHTML = h + '</div></div>';
}

function examResultHtml() {
  const { score, critWrong } = examScore();
  const pass = score >= EXAM_PASS && !critWrong;
  return `<div class="card"><div class="score ${pass ? 'pass' : 'fail'}">${pass ? 'ĐẠT' : 'KHÔNG ĐẠT'} — ${score}/${S.list.length} câu đúng</div>` +
    (critWrong ? '<div class="fail">Sai câu điểm liệt.</div>' : '') +
    (score < EXAM_PASS ? `<div class="fail">Cần tối thiểu ${EXAM_PASS} câu đúng.</div>` : '') +
    '<div style="color:var(--muted);font-size:14px;margin-top:6px">Bấm số câu để xem lại đáp án và giải thích.</div></div>';
}
function examScore() {
  let score = 0, critWrong = false;
  S.list.forEach(n => {
    const q = byNo.get(n), ok = S.sel[n] != null && q.a[S.sel[n]][1];
    if (ok) score++; else if (q.crit) critWrong = true;
  });
  return { score, critWrong };
}

// ---------- exam ----------
function startExam(nos, title) {
  stopTimer();
  S = { view: 'practice', navId: 'examlist', title, note: '', list: nos, idx: 0, sel: {}, checked: {}, exam: { left: EXAM_SECS, done: false } };
  timerId = setInterval(() => {
    if (!S.exam || S.exam.done) return stopTimer();
    if (--S.exam.left <= 0) finishExam(); else tickTimer();
  }, 1000);
  render();
}
function randomExamNos() {
  const need = { 1: 8, 2: 1, 3: 1, 4: 1, 5: 9, 6: 9 };
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const crit = shuf(QUESTIONS.filter(q => q.crit))[0];
  let out = [crit.n];
  for (const t of Object.keys(need)) {
    // 29 regular questions by chapter + 1 điểm liệt = 30
    out = out.concat(shuf(QUESTIONS.filter(q => q.topic == t && !q.crit)).slice(0, need[t]).map(q => q.n));
  }
  return shuf(out);
}
function finishExam() {
  if (!S.exam || S.exam.done) return;
  stopTimer();
  S.exam.done = true;
  S.list.forEach(n => record(n, S.sel[n] != null && byNo.get(n).a[S.sel[n]][1] === 1));
  render();
}
function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }
function tickTimer() {
  const el = $('#timer'); if (!el || !S.exam) return;
  if (S.exam.done) { el.textContent = 'Đã nộp'; return; }
  const l = S.exam.left;
  el.textContent = `${String(Math.floor(l / 60)).padStart(2, '0')}:${String(l % 60).padStart(2, '0')}`;
  el.classList.toggle('low', l < 120);
}

// ---------- actions ----------
function select(i) {
  const n = S.list[S.idx];
  if (S.checked[n] || (S.exam && S.exam.done)) return;
  if (i >= byNo.get(n).a.length) return;
  S.sel[n] = i;
  renderMain();
}
function check() {
  const n = S.list[S.idx];
  if (S.sel[n] == null || S.checked[n]) return;
  S.checked[n] = true;
  record(n, byNo.get(n).a[S.sel[n]][1] === 1);
  renderSidebar(); renderMain();
}
function go(i) { if (i >= 0 && i < S.list.length) { S.idx = i; renderMain(); window.scrollTo(0, 0); } }
function next() {
  if (S.idx < S.list.length - 1) return go(S.idx + 1);
  if (S.exam && !S.exam.done) return;
  if (!S.exam) { S.view = 'summary'; renderMain(); window.scrollTo(0, 0); }
}

$('#main').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.ans != null) select(+t.dataset.ans);
  else if (t.dataset.go != null) go(+t.dataset.go);
  else if (t.dataset.exam) { const ex = EXAMS.find(x => x.id == t.dataset.exam); startExam(ex.nos.slice(), 'Đề thi thử số ' + ex.id); }
  else switch (t.id) {
    case 'check': check(); break;
    case 'next': next(); break;
    case 'prev': go(S.idx - 1); break;
    case 'toSummary': S.view = 'summary'; renderMain(); break;
    case 'toPractice': S.view = 'practice'; renderMain(); break;
    case 'randomExam': startExam(randomExamNos(), 'Đề thi thử ngẫu nhiên'); break;
    case 'submitExam': {
      const un = S.list.filter(n => S.sel[n] == null).length;
      if (!un || confirm(`Còn ${un} câu chưa trả lời. Nộp bài?`)) finishExam();
      break;
    }
    case 'shuffle': {
      const a = S.list;
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      S.idx = 0; S.sel = {}; S.checked = {}; renderMain(); break;
    }
    case 'resetSession': S.idx = 0; S.sel = {}; S.checked = {}; renderMain(); break;
  }
});

document.addEventListener('keydown', e => {
  if (S.view !== 'practice' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[1-9]$/.test(e.key)) select(+e.key - 1);
  else if (e.key === 'Enter') { e.preventDefault(); const n = S.list[S.idx]; if (S.checked[n] || S.exam) next(); else check(); }
  else if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') go(S.idx - 1);
});

renderSidebar();
renderMain();
openNav('g:toc-do');
})();
