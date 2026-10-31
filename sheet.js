// Đọc danh sách máy từ Google Sheets.
// SHEET_LIVE: đọc thẳng bảng đang sửa, thấy thay đổi ngay (cần bảng bật "Bất kỳ ai có đường liên kết", quyền Người xem).
// SHEET_CSV: bản "Xuất bản lên web" (Tệp > Chia sẻ > Xuất bản lên web > .csv), dùng khi không đọc được SHEET_LIVE; Google cập nhật chậm ~5 phút.
const SHEET_LIVE = "https://docs.google.com/spreadsheets/d/1J0b4t6T54mWwVVRlSrqIdn6ef7kb5pqSYwfk4J2dWt4/export?format=csv&gid=943489757";
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-SCINEaf5A56Ku21Km9F3CbFZL8nXL2RjGbzM0jYayg6_AQaGMqP7LZtnrCGw4S8LxIap652lJZeM/pub?gid=943489757&single=true&output=csv";

// Cột nhận theo tên tiêu đề, không phân biệt dấu và chữ hoa:
//   Tên máy | Giá | Thông số | Tình trạng | Link ảnh | Ảnh minh họa
// Thông số: nhiều ý cách nhau bằng dấu ; hoặc xuống dòng. Ảnh minh họa: ghi "có" hoặc "x".

function boDau(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

/** CSV -> mảng các dòng; hiểu ô có dấu phẩy, dấu ngoặc kép và xuống dòng bên trong. */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const COT = { tenmay: "ten", ten: "ten", gia: "gia", thongso: "thongSo", tinhtrang: "tinhTrang", linkanh: "anh", anh: "anh", anhminhhoa: "minhHoa" };

/** Link chia sẻ Google Drive -> link ảnh hiển thị được trên web; link khác giữ nguyên. */
function linkAnh(url) {
  const id = /drive\.google\.com/.test(url) && (url.match(/\/d\/([\w-]{20,})/) || url.match(/[?&]id=([\w-]{20,})/));
  return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1000` : url;
}

function fromSheet(rows) {
  const keys = (rows[0] || []).map((h) => COT[boDau(h).toLowerCase().replace(/[^a-z]/g, "")]);
  return rows.slice(1).map((r) => {
    const p = { ten: "", gia: "", thongSo: [], tinhTrang: "", anh: "", minhHoa: false };
    keys.forEach((k, i) => {
      const v = (r[i] || "").trim();
      if (k === "thongSo") p.thongSo = v.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
      else if (k === "minhHoa") p.minhHoa = /^(co|x|yes|true|1)$/i.test(boDau(v));
      else if (k === "anh") p.anh = v && linkAnh(v);
      else if (k === "tinhTrang") p.tinhTrang = v.replace(/^t\S*nh\s+tr\S*ng\s*:?\s*/i, ""); // trang tự ghi "Tình trạng:"
      else if (k) p[k] = v;
    });
    p.gia ||= "Liên hệ";
    return p;
  }).filter((p) => p.ten);
}

/** Danh sách máy: bảng đang sửa (SHEET_LIVE), không được thì bản xuất bản (SHEET_CSV); lỗi cả hai thì trả null. */
async function loadProducts() {
  // ponytail: mỗi lượt xem gọi thẳng Google; trang đông khách mà Google giới hạn thì tự lùi về bản xuất bản
  for (const url of [SHEET_LIVE, SHEET_CSV].filter(Boolean)) {
    try {
      // no-store: không dùng bản trình duyệt đang giữ, để vừa sửa bảng là thấy
      const r = await fetch(url, { cache: "no-store" });
      // bảng tắt chia sẻ thì Google trả trang đăng nhập (HTML), không phải CSV
      if (r.ok && /csv/.test(r.headers.get("content-type") || "")) return fromSheet(parseCsv(await r.text()));
    } catch {}
  }
  return null;
}
