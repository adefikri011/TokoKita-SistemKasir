// Helper HTML kecil — dipakai untuk mencegah XSS saat
// menyisipkan data user ke innerHTML.
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

export const emptyRow = (text, colspan) =>
  `<tr><td colspan="${colspan}" class="cell-empty">${escapeHtml(text)}</td></tr>`;
