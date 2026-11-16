// Generates js/data.js (slim B-licence question data + study groups + mock exams)
// from the raw files downloaded from gplx.app. Run: node build.js
const fs = require('fs');
globalThis.localStorage = { getItem: () => 'B_2025' };
const load = (f, n) => new Function(fs.readFileSync(f, 'utf8') + ';return ' + n)();
const raw = load('js/full-questions.js', 'originalQuestions');
const exams = load('js/full-exams.js', 'fullExams').filter(e => e.licenseCode === 'B_2025');

const questions = raw.map(q => ({
  n: q.no,
  t: q.text,
  tip: q.tip || '',
  img: q.image || '',
  topic: q.topic,
  crit: q.required3 > 0 ? 1 : 0, // câu điểm liệt for hạng B
  a: q.answers.map(a => [a.text, a.correct ? 1 : 0]),
}));

const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const L = (...parts) => parts.flatMap(p => Array.isArray(p) ? p : [p]);

// Curated groups. A question may appear in several groups.
const groups = [
  // ---- Chương 1
  { topic: 1, id: 'toc-do', title: 'Tốc độ tối đa & khoảng cách an toàn', note: 'Hay nhầm: 30/40/50/60/70/80/90 km/h, 35/55/70/100 m', nos: L(41, 43, R(144, 163), 165, 166) },
  { topic: 1, id: 'khai-niem', title: 'Khái niệm & định nghĩa', nos: R(1, 18) },
  { topic: 1, id: 'cam', title: 'Hành vi bị nghiêm cấm, nồng độ cồn', nos: R(19, 32) },
  { topic: 1, id: 'hieu-lenh', title: 'Hiệu lệnh CSGT & đèn tín hiệu', nos: R(33, 40) },
  { topic: 1, id: 'lan-duong', title: 'Làn đường, đường một chiều', nos: L(44, 45, 78, 79, 80) },
  { topic: 1, id: 'vuot-xe', title: 'Vượt xe, nhường xe xin vượt', nos: L(46, 47, 48, 53, 81, 82, 108, 109, 110, 115, 251) },
  { topic: 1, id: 'den-coi', title: 'Đèn chiếu sáng & còi', nos: L(49, 50, 51, 193, 225, 241) },
  { topic: 1, id: 'quay-dau', title: 'Quay đầu, chuyển hướng, chuyển làn, lùi xe', nos: L(54, 55, 56, 57, 58, R(83, 86), 210, 216, 217, 246, 257) },
  { topic: 1, id: 'dung-do', title: 'Dừng xe, đỗ xe', nos: L(14, 15, R(59, 62), 234) },
  { topic: 1, id: 'mo-to', title: 'Mô tô, xe máy: mũ bảo hiểm, chở người', nos: L(R(63, 76), 242, 254, 255, 258, 259, 260, 261) },
  { topic: 1, id: 'nhuong-duong', title: 'Nhường đường, giao nhau, vòng xuyến', nos: L(R(87, 93), 253) },
  { topic: 1, id: 'xe-uu-tien', title: 'Xe ưu tiên', nos: L(R(94, 98), 329, 336) },
  { topic: 1, id: 'duong-sat', title: 'Đường sắt', nos: L(R(99, 102), 219, 235, 236, R(371, 375), 378, 379, 596) },
  { topic: 1, id: 'ham-keo-phao', title: 'Hầm, phà, kéo xe, rơ moóc', nos: L(77, R(103, 107)) },
  { topic: 1, id: 'cao-toc', title: 'Đường cao tốc', nos: L(16, R(111, 117), 248, 249, 250, 365, 464, R(470, 473), 597) },
  { topic: 1, id: 'tuoi-hang', title: 'Độ tuổi & hạng giấy phép lái xe', nos: R(118, 135) },
  { topic: 1, id: 'giay-to', title: 'Giấy tờ, trừ điểm, phục hồi GPLX', nos: L(31, R(136, 143)) },
  { topic: 1, id: 'van-tai', title: 'Vận tải hành khách & hàng hóa', nos: R(164, 180) },
  // ---- Chương 2
  { topic: 2, id: 'van-hoa', title: 'Văn hóa giao thông & đạo đức người lái', nos: L(R(181, 187), R(189, 193), R(200, 203)) },
  { topic: 2, id: 'tai-nan', title: 'Tai nạn, sơ cứu, cháy nổ', nos: L(188, 194, 195, 196, 197, 198, 199, 204, 205) },
  // ---- Chương 3
  { topic: 3, id: 'khoi-hanh', title: 'Khởi hành, số, côn, phanh tay', nos: L(207, 208, 209, 211, 221, 222, 237, 238, 239) },
  { topic: 3, id: 'doc-deo', title: 'Lên/xuống dốc, đường vòng, đổ đèo', nos: L(206, 212, 213, 214, 215, 218, 223, 252, 262) },
  { topic: 3, id: 'thoi-tiet', title: 'Đường trơn, mưa, sương mù, ngập nước, ban đêm', nos: L(224, 226, 240, 243, 244, 245, 263) },
  { topic: 3, id: 'den-bao', title: 'Đèn báo & ký hiệu trên bảng đồng hồ / nút bấm', nos: L(R(227, 231), R(286, 289), R(295, 300)) },
  // ---- Chương 4
  { topic: 4, id: 'cong-dung', title: 'Công dụng các bộ phận của xe', nos: L(275, 276, R(279, 285), R(291, 294)) },
  { topic: 4, id: 'yeu-cau-ky-thuat', title: 'Yêu cầu kỹ thuật, bảo dưỡng, niên hạn', nos: L(R(264, 274), 277, 278, 290) },
  // ---- Chương 5
  { topic: 5, id: 'bien-cam-xe', title: 'Biển cấm theo loại xe', nos: L(R(301, 307), R(330, 333), R(340, 345), 349, 350) },
  { topic: 5, id: 'bien-cam-vuot', title: 'Biển cấm vượt', nos: L(R(308, 312), 438) },
  { topic: 5, id: 'bien-cam-re', title: 'Biển cấm rẽ, quay đầu, đi ngược chiều', nos: L(R(313, 326), 440, 441, 442, 443) },
  { topic: 5, id: 'bien-cam-do', title: 'Biển cấm dừng, đỗ', nos: L(327, 328, 355) },
  { topic: 5, id: 'bien-phu', title: 'Biển phụ & hiệu lực của biển', nos: L(334, 335, 337, 338, 339, R(346, 348), R(351, 354), R(356, 359)) },
  { topic: 5, id: 'bien-toc-do', title: 'Biển tốc độ, khu dân cư, hết hiệu lực', nos: L(R(360, 366), 427, R(435, 439)) },
  { topic: 5, id: 'bien-nguoi-di-bo', title: 'Biển người đi bộ, xe thô sơ, trẻ em', nos: L(367, 368, 369, 412, 413) },
  { topic: 5, id: 'bien-nguy-hiem-giao-nhau', title: 'Biển nguy hiểm: giao nhau, đường ưu tiên', nos: R(376, 397) },
  { topic: 5, id: 'bien-nguy-hiem-khac', title: 'Biển nguy hiểm: cầu, hầm, dốc, đường trơn…', nos: L(R(398, 411), R(414, 425)) },
  { topic: 5, id: 'bien-hieu-lenh', title: 'Biển hiệu lệnh (xanh tròn)', nos: L(426, R(428, 434)) },
  { topic: 5, id: 'bien-chi-dan', title: 'Biển chỉ dẫn', nos: L(R(444, 463), 465, 466, 467, 468, 469, 474, 475) },
  { topic: 5, id: 'vach-ke', title: 'Vạch kẻ đường', nos: R(476, 485) },
];

// Chương 6 (sa hình): classified by keyword, first match wins.
const sa = [
  ['sa-vuot', 'Sa hình: vượt xe', /vượt/i],
  ['sa-do', 'Sa hình: dừng, đỗ xe', /đỗ|dừng/i],
  ['sa-keo', 'Sa hình: kéo xe', /kéo nhau|kéo xe/i],
  ['sa-huong', 'Sa hình: hướng đi được / không được phép', /hướng nào|biển hướng/i],
  ['sa-den', 'Sa hình: tín hiệu đèn', /tín hiệu đèn/i],
  ['sa-vi-pham', 'Sa hình: tìm xe vi phạm / đúng quy tắc', /vi phạm|chấp hành/i],
  ['sa-thu-tu', 'Sa hình: thứ tự đi, nhường đường', /thứ tự|đi trước|nhường|được phép đi/i],
  ['sa-ban', 'Sa hình: tình huống "Bạn xử lý"', /./],
];
const saMap = new Map(sa.map(s => [s[0], { topic: 6, id: s[0], title: s[1], nos: [] }]));
for (const q of questions.filter(q => q.topic === 6)) {
  const hit = sa.find(s => s[2].test(q.t));
  saMap.get(hit[0]).nos.push(q.n);
}
groups.push(...saMap.values());

// Leftovers per chapter go to an "Khác" group so nothing is unreachable.
const covered = new Set(groups.flatMap(g => g.nos));
for (let t = 1; t <= 6; t++) {
  const rest = questions.filter(q => q.topic === t && !covered.has(q.n)).map(q => q.n);
  if (rest.length) groups.push({ topic: t, id: 'khac-' + t, title: 'Các câu còn lại', nos: rest });
}

const examMap = {};
for (const e of exams) (examMap[e.exam] ||= []).push(e.questionNo);
const examList = Object.keys(examMap).map(Number).sort((a, b) => a - b).map(k => ({ id: k, nos: examMap[k] }));

const topics = {
  1: 'Quy định chung & quy tắc giao thông',
  2: 'Văn hóa giao thông, đạo đức, cứu hộ',
  3: 'Kỹ thuật lái xe',
  4: 'Cấu tạo & sửa chữa',
  5: 'Báo hiệu đường bộ',
  6: 'Sa hình & xử lý tình huống',
};

const out =
  'const QUESTIONS=' + JSON.stringify(questions) + ';\n' +
  'const GROUPS=' + JSON.stringify(groups) + ';\n' +
  'const EXAMS=' + JSON.stringify(examList) + ';\n' +
  'const TOPICS=' + JSON.stringify(topics) + ';\n';
fs.writeFileSync('js/data.js', out);

console.log('questions', questions.length, 'critical', questions.filter(q => q.crit).length);
console.log('exams', examList.length, examList.map(e => e.nos.length).join(','));
console.log(groups.map(g => `${g.topic} ${g.id} (${g.nos.length})`).join('\n'));
const bad = questions.filter(q => q.a.filter(a => a[1]).length !== 1);
console.log('questions without exactly one correct answer:', bad.map(q => q.n).join(',') || 'none');
