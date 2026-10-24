/**
 * phim.js — Logic riêng cho trang phim.html
 * - Filter phim theo trạng thái / search
 * - Hiển thị lịch chiếu khi click MUA VÉ
 */

let allPhims = [];

// Hàm điều hướng sang booking.html đặt vé
function handleDatVe(maPhim, tenPhim, maSuatChieu = '') {
  let url = `booking.html?movieId=${encodeURIComponent(maPhim)}&title=${encodeURIComponent(tenPhim)}`;
  if (maSuatChieu) {
    url += `&showtimeId=${encodeURIComponent(maSuatChieu)}`;
  }
  window.location.href = url;
}
window.handleDatVe = handleDatVe;

// Override handleMuaVe từ app.js:
// - Nếu click "MUA VÉ" ở phim (chưa có suất chiếu): cuộn xuống xem danh sách lịch chiếu của phim
// - Nếu click "Đặt vé" (có mã suất chiếu): điều hướng ngay sang booking.html
window.handleMuaVe = async function(maPhim, tenPhim, maSuatChieu = '') {
  if (maSuatChieu) {
    handleDatVe(maPhim, tenPhim, maSuatChieu);
    return;
  }

  const section = document.getElementById('lich-chieu-section');
  const nameEl  = document.getElementById('phim-selected-name');
  const listEl  = document.getElementById('lich-chieu-list');

  section.style.display = 'block';
  nameEl.textContent    = tenPhim;
  listEl.innerHTML      = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  // Smooth scroll
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const result = await Api.getSuatChieu({ maPhim });
    const items  = result.data || [];
    if (items.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Chưa có lịch chiếu nào cho phim này.</p>';
    } else {
      listEl.innerHTML = items.map(renderScheduleCard).join('');
    }
  } catch (err) {
    listEl.innerHTML = `<p style="color:#c62828;padding:20px;">Lỗi: ${err.message}</p>`;
  }
};

// ─── Filter & Search ─────────────────────────────────────────────────────
function applyFilter() {
  const statusVal  = document.getElementById('filter-status').value;
  const searchVal  = document.getElementById('filter-search').value.toLowerCase().trim();

  const filtered = allPhims.filter(p => {
    const matchStatus = !statusVal || p.TrangThai === statusVal;
    const matchSearch = !searchVal ||
      p.TenPhim.toLowerCase().includes(searchVal) ||
      (p.TheLoai && p.TheLoai.toLowerCase().includes(searchVal));
    return matchStatus && matchSearch;
  });

  const grid = document.getElementById('phim-grid');
  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;grid-column:1/-1;">Không tìm thấy phim phù hợp.</p>';
  } else {
    grid.innerHTML = filtered.map(renderPhimCard).join('');
  }
}

// ─── Override loadPhim để lưu allPhims ──────────────────────────────────
async function loadPhimPage(trangThai) {
  const grid    = document.getElementById('phim-grid');
  const spinner = document.getElementById('loading-spinner');
  const errEl   = document.getElementById('error-msg');

  spinner.style.display = 'flex';
  grid.style.display    = 'none';
  errEl.style.display   = 'none';

  try {
    const result = await Api.getPhim(trangThai);
    allPhims = result.data || [];

    spinner.style.display = 'none';
    grid.style.display    = 'grid';
    applyFilter();
  } catch (err) {
    spinner.style.display = 'none';
    errEl.style.display   = 'block';
    errEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Không thể kết nối server: ${err.message}`;
  }
}

// ─── Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check URL param ?id= để auto-hiện lịch chiếu
  const urlParams = new URLSearchParams(window.location.search);
  const maPhim    = urlParams.get('id');
  const tenPhim   = urlParams.get('ten') || '';

  // Load toàn bộ phim
  const statusFilter = document.getElementById('filter-status');
  loadPhimPage(statusFilter.value);

  // Nếu có ?id=, tự click MUA VÉ
  if (maPhim) {
    setTimeout(() => {
      window.handleMuaVe(maPhim, decodeURIComponent(tenPhim));
    }, 600);
  }

  // Lắng nghe filter
  statusFilter.addEventListener('change', () => {
    loadPhimPage(statusFilter.value);
  });

  document.getElementById('filter-search').addEventListener('input', applyFilter);
});
