/**
 * app.js — Main frontend logic cho trang chủ
 * Khởi chạy khi DOM ready
 */

// ─── Helper: Format tiền VND ──────────────────────────────────────────────
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// ─── Helper: Format giờ từ DATETIME string ──────────────────────────────
function formatTime(dtString) {
  if (!dtString) return '--:--';
  const d = new Date(dtString);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Helper: Format ngày ────────────────────────────────────────────────
function formatDate(dtString) {
  if (!dtString) return '';
  const d = new Date(dtString);
  return d.toLocaleDateString('vi-VN');
}

// ─── Helper: Lấy class và text nhãn độ tuổi ────────────────────────────
function getAgeBadge(gioi_han) {
  if (gioi_han === null || gioi_han === undefined) return '';
  if (gioi_han === 0)  return '<span class="age-badge age-badge--P">P</span>';
  if (gioi_han <= 13)  return '<span class="age-badge age-badge--T13">T13</span>';
  if (gioi_han <= 16)  return '<span class="age-badge age-badge--T16">T16</span>';
  return '<span class="age-badge age-badge--T18">T18</span>';
}

// ─── Helper: Status badge suất chiếu ───────────────────────────────────
function getStatusBadge(trangThai) {
  const map = {
    'Sắp chiếu': 'sap',
    'Đang chiếu': 'dang',
    'Đã chiếu':   'da',
    'Đã hủy':     'huy',
  };
  const cls = map[trangThai] || 'da';
  return `<span class="status-badge status-badge--${cls}">${trangThai}</span>`;
}

// ─── Movie Assets (Ảnh Poster & Video Trailer) ───────────────────────────
const MOVIE_ASSETS = {
  'P001': {
    poster: 'anh_video/digger.jpg',
    trailer: 'anh_video/DIGGER ｜ Official Trailer.mp4'
  },
  'P002': {
    poster: 'anh_video/quyantang4.jpg',
    trailer: 'anh_video/[OFFICIAL TEASER] “ธี่หยด： สมิงเขาขวาง”.mp4'
  },
  'P003': {
    poster: 'anh_video/streetfighter.jpg',
    trailer: 'anh_video/Street Fighter ｜ New Trailer (2026 Movie).mp4'
  },
  'P004': {
    poster: 'anh_video/incidentsaruondthehouse.webp',
    trailer: 'anh_video/Other Mommy ｜ Official Trailer.mp4'
  },
  'P005': {
    poster: 'anh_video/official-poster-for-spy-x-family-code-white-v0-qz0gobx6ezpa1.webp',
    trailer: 'anh_video/SPY x FAMILY CODE： WHITE - Official Trailer (HD).mp4'
  },
  'P006': {
    poster: 'anh_video/teaser-poster_1.jpg',
    trailer: 'anh_video/QUYẾT CUA ANH NÀY ｜ Official Trailer ｜ KHỞI CHIẾU 02.10.2026.mp4'
  },
  'P007': {
    poster: 'anh_video/Suzume_no_Tojimari.jpg',
    trailer: 'anh_video/Suzume Trailer 1 (2023).mp4'
  },
  'P008': {
    poster: 'anh_video/Shaun_the_Sheep_Farmageddon_poster_pillars.jpg',
    trailer: 'anh_video/Shaun the Sheep Movie 2： Farmageddon – Official Trailer.mp4'
  },
  'P009': {
    poster: 'anh_video/The_Tale_of_the_Princess_Kaguya_(poster).jpg',
    trailer: 'anh_video/The Tale Of The Princess Kaguya - Official Trailer.mp4'
  },
  'P010': {
    poster: 'anh_video/ME-MIN-POSTER-CONG-VIEN-KTHUOC-SOCIAL-1.jpg',
    trailer: 'anh_video/MẸ MÌN ｜ TEASER TRAILER ｜ SUẤT CHIẾU ĐẶC BIỆT TỪ 18H NGÀY 20.10.2026.mp4'
  },
  'P011': {
    poster: 'anh_video/tran-yem-500_1778642449288.jpg',
    trailer: 'anh_video/Xóm nhỏ ｜ Trailer Official ｜ Phim ĐỜI SỐNG ĐÔ THỊ ｜ Phim VTV Mới Nhất 2026.mp4'
  },
  'P012': {
    poster: 'anh_video/MV5BMjNlMjM4NTAtYjE5YS00ZGYyLWEyMTYtNjFlMmIxZDEzYjhhXkEyXkFqcGc@._V1_.jpg',
    trailer: 'anh_video/Clayface ｜ Official Teaser.mp4'
  },
  'P013': {
    poster: 'anh_video/target_payoff_poster_united_kingdom_d19f38c5.jpeg',
    trailer: 'anh_video/Toy Story 5 ｜ Teaser Trailer ｜ In Theaters June 19.mp4'
  },
  'P014': {
    poster: 'anh_video/MV5BYjk1NjgwZDMtYzI5OS00Y2Q4LWI1NmItNTE5OGU2NDVmMTAxXkEyXkFqcGc@._V1_.jpg',
    trailer: 'anh_video/Dune： Part Three ｜ Official Teaser Trailer.mp4'
  },
  'P015': {
    poster: 'anh_video/sLYCyO58UvBuBtbHTQjPCCgJ4dG.webp',
    trailer: 'anh_video/AVENGERS 5： DOOMSDAY Official “Steve Rogers Meets New Avengers” Teaser Trailer (2026).mp4'
  },
  'P016': {
    poster: 'anh_video/images.jpg',
    trailer: 'anh_video/ÁN MẠNG KARAOKE ｜ MAIN TRAILER ｜ DỰ KIẾN KHỞI CHIẾU 02.10.2026.mp4'
  }
};

// Hàm lấy link ảnh poster hợp lệ
function getMoviePoster(phim) {
  if (!phim) return 'https://placehold.co/300x450/0054a6/ffffff?text=Phim';
  if (phim.Poster && phim.Poster.trim()) {
    return encodeURI(phim.Poster);
  }
  const asset = MOVIE_ASSETS[phim.MaPhim];
  if (asset && asset.poster) {
    return encodeURI(asset.poster);
  }
  return `https://placehold.co/300x450/0054a6/ffffff?text=${encodeURIComponent(phim.TenPhim || 'Phim')}`;
}
window.getMoviePoster = getMoviePoster;

// Hàm lấy link trailer hợp lệ
function getMovieTrailer(phim) {
  if (!phim) return '';
  if (typeof phim === 'string') {
    const asset = MOVIE_ASSETS[phim];
    return asset ? encodeURI(asset.trailer) : '';
  }
  if (phim.Trailer && phim.Trailer.trim()) {
    return encodeURI(phim.Trailer);
  }
  const asset = MOVIE_ASSETS[phim.MaPhim];
  return asset ? encodeURI(asset.trailer) : '';
}
window.getMovieTrailer = getMovieTrailer;

// ─── Trailer Modal Control ──────────────────────────────────────────────
function ensureTrailerModalExists() {
  if (document.getElementById('trailer-modal')) return;

  const modalEl = document.createElement('div');
  modalEl.id = 'trailer-modal';
  modalEl.className = 'trailer-modal';
  modalEl.innerHTML = `
    <div class="trailer-modal__backdrop" onclick="closeTrailerModal()"></div>
    <div class="trailer-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="trailer-modal-title">
      <div class="trailer-modal__header">
        <div class="trailer-modal__title-wrap">
          <span class="trailer-modal__badge">TRAILER</span>
          <span id="trailer-modal-age"></span>
          <h3 id="trailer-modal-title" class="trailer-modal__title">Trailer phim</h3>
        </div>
        <button type="button" class="trailer-modal__close" onclick="closeTrailerModal()" aria-label="Đóng trailer">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="trailer-modal__body">
        <video id="trailer-video" class="trailer-modal__video" controls playsinline preload="auto">
          <source id="trailer-source" src="" type="video/mp4" />
          Trình duyệt của bạn không hỗ trợ phát video.
        </video>
      </div>
      <div class="trailer-modal__footer">
        <div class="trailer-modal__meta" id="trailer-modal-meta"></div>
        <button type="button" class="trailer-modal__buy-btn" id="trailer-modal-buy-btn">
          <i class="fa-solid fa-ticket"></i> Mua vé ngay
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  // Lắng nghe phím ESC để đóng modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTrailerModal();
    }
  });
}

function openTrailerModal(maPhim, tenPhim, thoiLuong, gioiHanDoTuoi) {
  ensureTrailerModalExists();

  const modal = document.getElementById('trailer-modal');
  const video = document.getElementById('trailer-video');
  const source = document.getElementById('trailer-source');
  const titleEl = document.getElementById('trailer-modal-title');
  const metaEl = document.getElementById('trailer-modal-meta');
  const buyBtn = document.getElementById('trailer-modal-buy-btn');

  const trailerUrl = getMovieTrailer(maPhim);
  if (!trailerUrl) {
    alert(`Hiện tại chưa có trailer cho phim "${tenPhim}".`);
    return;
  }

  const ageEl = document.getElementById('trailer-modal-age');
  if (ageEl) {
    ageEl.innerHTML = getAgeBadge(gioiHanDoTuoi);
  }

  titleEl.textContent = tenPhim || 'Trailer Phim';
  metaEl.innerHTML = `
    <span><i class="fa-regular fa-clock"></i> ${thoiLuong ? thoiLuong + ' phút' : ''}</span>
  `;

  buyBtn.onclick = () => {
    closeTrailerModal();
    handleMuaVe(maPhim, tenPhim);
  };

  delete video.dataset.triedBackend;
  video.onerror = () => {
    if (!video.dataset.triedBackend) {
      video.dataset.triedBackend = '1';
      source.src = 'http://localhost:5000/' + trailerUrl;
      video.load();
      video.play().catch(() => {});
    }
  };

  source.src = trailerUrl;
  video.load();
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Browser autoplay policy might require manual interaction
    });
  }

  modal.classList.add('is-active');
  document.body.style.overflow = 'hidden';
}
window.openTrailerModal = openTrailerModal;

function closeTrailerModal() {
  const modal = document.getElementById('trailer-modal');
  const video = document.getElementById('trailer-video');
  const source = document.getElementById('trailer-source');
  if (!modal) return;

  if (video) {
    video.pause();
    video.currentTime = 0;
  }
  if (source) {
    source.src = '';
  }
  if (video) {
    video.load();
  }

  modal.classList.remove('is-active');
  document.body.style.overflow = '';
}
window.closeTrailerModal = closeTrailerModal;

// ─── Render card phim ───────────────────────────────────────────────────
function renderPhimCard(phim) {
  const the_loais = phim.TheLoai ? phim.TheLoai.split(', ') : [];
  const genreHTML = the_loais.slice(0, 2).map(t =>
    `<span class="phim-card__genre">${t}</span>`
  ).join('');

  const posterSrc = getMoviePoster(phim);
  const safeTitle = (phim.TenPhim || '').replace(/'/g, "\\'");

  return `
    <div class="phim-card">
      <div class="phim-card__poster">
        <img src="${posterSrc}" 
             alt="${phim.TenPhim}" 
             onerror="if (!this.dataset.triedFallback) { this.dataset.triedFallback = '1'; this.src = 'http://localhost:5000/' + '${posterSrc}'; } else { this.onerror = null; this.src = 'https://placehold.co/300x450/0054a6/ffffff?text=${encodeURIComponent(phim.TenPhim)}'; }" 
             style="width: 100%; height: 100%; object-fit: cover; display: block;" 
             loading="lazy" />
        ${getAgeBadge(phim.GioiHanDoTuoi)}
        
        <!-- Nút mũi tên Play xem trailer -->
        <div class="phim-card__overlay" 
             onclick="openTrailerModal('${phim.MaPhim}', '${safeTitle}', ${phim.ThoiLuong || 0}, ${phim.GioiHanDoTuoi || 0})" 
             title="Bấm để xem trailer ${safeTitle}">
          <button type="button" class="play-btn-circle" aria-label="Xem trailer ${safeTitle}">
            <i class="fa-solid fa-play"></i>
          </button>
        </div>
      </div>
      <div class="phim-card__info">
        <div class="phim-card__title" title="${phim.TenPhim}">${phim.TenPhim}</div>
        <div class="phim-card__meta">
          ${genreHTML}
        </div>
        <div class="phim-card__duration">
          <i class="fa-regular fa-clock"></i>
          ${phim.ThoiLuong} phút
        </div>
        <div class="phim-card__btn">
          <button class="btn-buy" onclick="handleMuaVe('${phim.MaPhim}', '${safeTitle}')">
            <i class="fa-solid fa-ticket"></i> MUA VÉ
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Render lịch chiếu ──────────────────────────────────────────────────
function renderScheduleCard(sc) {
  return `
    <div class="schedule-card">
      <div class="schedule-card__time">
        <div class="time-start">${formatTime(sc.ThoiGianBatDau)}</div>
        <div class="time-end">→ ${formatTime(sc.ThoiGianKetThuc)}</div>
      </div>
      <div class="schedule-card__info">
        <div class="schedule-card__movie">${sc.TenPhim}</div>
        <div class="schedule-card__meta">
          <span><i class="fa-solid fa-door-open"></i> ${sc.TenPhong}</span>
          <span><i class="fa-solid fa-video"></i> ${sc.LoaiPhong}</span>
          <span>${getStatusBadge(sc.TrangThai)}</span>
        </div>
      </div>
      <div class="schedule-card__seats">
        <div class="seats-count">${sc.SoGheConTrong}</div>
        <div class="seats-label">ghế trống</div>
      </div>
      <div class="schedule-card__action">
        <!-- Điều hướng trực tiếp sang booking.html kèm mã phim và suất chiếu -->
        <button class="btn-buy" style="padding:8px 16px;font-size:.8rem;white-space:nowrap;"
          onclick="handleDatVe('${sc.MaPhim}', '${(sc.TenPhim || '').replace(/'/g, "\\'")}', '${sc.MaSuatChieu}')">
          <i class="fa-solid fa-ticket"></i> Đặt vé
        </button>
      </div>
    </div>
  `;
}

// ─── Tải và render phim ─────────────────────────────────────────────────
async function loadPhim(trangThai) {
  const grid    = document.getElementById('phim-grid');
  const spinner = document.getElementById('loading-spinner');
  const errEl   = document.getElementById('error-msg');

  if (!grid) return;

  spinner.style.display = 'flex';
  grid.style.display    = 'none';
  errEl.style.display   = 'none';

  try {
    const result = await Api.getPhim(trangThai);
    const phims  = result.data || [];

    if (phims.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;grid-column:1/-1;">Không có phim nào.</p>';
    } else {
      grid.innerHTML = phims.map(renderPhimCard).join('');
    }

    spinner.style.display = 'none';
    grid.style.display    = 'grid';
  } catch (err) {
    spinner.style.display = 'none';
    errEl.style.display   = 'block';
    errEl.innerHTML = `
      <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;margin-bottom:8px;"></i><br/>
      <strong>Không thể kết nối tới server!</strong><br/>
      <small>Hãy đảm bảo backend đang chạy tại <code>http://localhost:5000</code></small><br/>
      <small style="color:#888;">${err.message}</small>
    `;
  }
}

// ─── Tải lịch chiếu hôm nay ─────────────────────────────────────────────
async function loadScheduleToday() {
  const listEl   = document.getElementById('schedule-list');
  const spinnerEl = document.getElementById('schedule-loading');
  if (!listEl) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await Api.getSuatChieu({ ngay: today });
    const items  = result.data || [];

    spinnerEl.style.display = 'none';
    listEl.style.display    = 'flex';

    if (items.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Không có suất chiếu nào hôm nay.</p>';
    } else {
      listEl.innerHTML = items.map(renderScheduleCard).join('');
    }
  } catch (err) {
    spinnerEl.style.display = 'none';
    listEl.style.display    = 'flex';
    listEl.innerHTML = `<p style="color:#c62828;padding:20px;"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi tải lịch chiếu: ${err.message}</p>`;
  }
}

// Điều hướng sang trang booking.html đặt vé kèm tham số
function handleDatVe(maPhim, tenPhim, maSuatChieu = '') {
  let url = `booking.html?movieId=${encodeURIComponent(maPhim)}&title=${encodeURIComponent(tenPhim)}`;
  if (maSuatChieu) {
    url += `&showtimeId=${encodeURIComponent(maSuatChieu)}`;
  }
  window.location.href = url;
}
window.handleDatVe = handleDatVe;

// Xử lý nút MUA VÉ - Điều hướng sang booking.html kèm tham số
function handleMuaVe(maPhim, tenPhim, maSuatChieu = '') {
  handleDatVe(maPhim, tenPhim, maSuatChieu);
}
window.handleMuaVe = handleMuaVe;

// // FIX: Kiểm tra trạng thái đăng nhập và cập nhật thanh Header
function checkAuthState() {
  const headerActions = document.getElementById('header-actions') || document.querySelector('.header-actions');
  const mainNav = document.querySelector('.main-nav');

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userName = localStorage.getItem('userName') || 'Thành viên PTIT';
  const userRole = localStorage.getItem('userRole') || 'khach_hang';

  // Điều chỉnh các mục trong menu chính theo phân quyền (Nhân viên vs Khách hàng)
  if (mainNav) {
    const historyLinks = mainNav.querySelectorAll('a[href*="booking-history.html"]');
    if (isLoggedIn && userRole === 'nhan_vien') {
      // Nhân viên soát vé: Ẩn "Lịch sử đặt vé" vì nhân viên không dùng trang cá nhân này
      historyLinks.forEach(link => link.style.display = 'none');
      
      // Thêm nút "Soát vé / Check-in" vào thanh menu nếu chưa có
      if (!mainNav.querySelector('a[href*="checkin.html"]')) {
        const checkinNav = document.createElement('a');
        checkinNav.href = 'checkin.html';
        checkinNav.className = 'nav-link' + (window.location.pathname.includes('checkin.html') ? ' active' : '');
        checkinNav.innerHTML = '<i class="fa-solid fa-qrcode"></i> Soát vé / Check-in';
        mainNav.appendChild(checkinNav);
      }

      // Thêm nút "Quản lý NV" cho nhân viên có chức vụ Quản lý / Quản lý ca
      const user = Api.getUser();
      const viTri = (user && user.viTriCongViec) ? user.viTriCongViec.toLowerCase() : '';
      const isAdmin = viTri.includes('quản lý') || viTri.includes('quản trị') || viTri.includes('admin') || viTri.includes('chủ hệ thống');
      if (isAdmin && !mainNav.querySelector('a[href*="nhanvien.html"]')) {
        const nvNav = document.createElement('a');
        nvNav.href = 'nhanvien.html';
        nvNav.className = 'nav-link' + (window.location.pathname.includes('nhanvien.html') ? ' active' : '');
        nvNav.innerHTML = '<i class="fa-solid fa-user-tie"></i> Quản lý NV';
        mainNav.appendChild(nvNav);
      }
    } else {
      // Khách hàng hoặc chưa đăng nhập: Giữ hiển thị bình thường
      historyLinks.forEach(link => link.style.display = '');
    }
  }

  if (!headerActions) return;

  if (isLoggedIn) {
    let actionBtnHtml = '';
    if (userRole === 'nhan_vien') {
      const user = Api.getUser();
      const viTri = (user && user.viTriCongViec) ? user.viTriCongViec.toLowerCase() : '';
      const isAdmin = viTri.includes('quản lý') || viTri.includes('quản trị') || viTri.includes('admin') || viTri.includes('chủ hệ thống');
      if (isAdmin) {
        actionBtnHtml = `
          <a href="nhanvien.html" class="btn-nav-action btn-manage">
            <i class="fa-solid fa-user-tie"></i> Quản lý NV
          </a>
          <a href="checkin.html" class="btn-nav-action btn-checkin">
            <i class="fa-solid fa-qrcode"></i> Soát vé
          </a>
        `;
      } else {
        actionBtnHtml = `
          <a href="checkin.html" class="btn-nav-action btn-checkin">
            <i class="fa-solid fa-qrcode"></i> Bàn làm việc Soát vé
          </a>
        `;
      }
    } else {
      actionBtnHtml = `
        <a href="booking-history.html" class="btn-nav-action btn-history">
          <i class="fa-solid fa-clock-rotate-left"></i> Lịch sử đặt vé
        </a>
      `;
    }

    headerActions.innerHTML = `
      <div class="user-greeting">
        <i class="fa-solid fa-circle-user user-avatar-icon"></i>
        <span class="user-name-text">Xin chào, <strong>${userName}</strong>${userRole === 'nhan_vien' ? ' <span class="role-badge role-badge--nv">NV</span>' : ''}</span>
      </div>
      <div class="user-action-buttons">
        ${actionBtnHtml}
        <button class="btn-logout" onclick="handleLogout()">
          <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
        </button>
      </div>
    `;
  }
}

// // FIX: Hàm xử lý Đăng xuất
function handleLogout() {
  if (window.Api && window.Api.clearAuth) {
    window.Api.clearAuth();
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
  }
  window.location.reload();
}

// ─── Tab switching ──────────────────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      if (tab === 'dang-chieu') {
        loadPhim('Đang chiếu');
      } else if (tab === 'sap-chieu') {
        loadPhim('Sắp chiếu');
      }
    });
  });
}

// ─── Bootstrap ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // FIX: Kiểm tra trạng thái đăng nhập ngay khi tải trang
  checkAuthState();

  initTabs();
  loadPhim('Đang chiếu');   // Load tab mặc định
  loadScheduleToday();       // Load lịch chiếu hôm nay
});
