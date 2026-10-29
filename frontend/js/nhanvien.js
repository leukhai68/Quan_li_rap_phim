/**
 * nhanvien.js — Frontend logic cho trang Quản lý Nhân viên
 * Dành cho tài khoản Quản lý / Quản trị viên
 */

// ─── State ──────────────────────────────────────────────────────────────
let currentPage = 1;
let currentLimit = 10;
let searchDebounce = null;

// ─── Helper: Format tiền VND ────────────────────────────────────────────
function fmtVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// ─── Helper: Format ngày ────────────────────────────────────────────────
function fmtDate(dtString) {
  if (!dtString) return '—';
  const d = new Date(dtString);
  return d.toLocaleDateString('vi-VN');
}

// ─── Toast notification ─────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── Kiểm tra quyền ────────────────────────────────────────────────────
function checkPermission() {
  const userRole = localStorage.getItem('userRole');
  const user = Api.getUser();

  if (!Api.isLoggedIn() || userRole !== 'nhan_vien') {
    alert('Bạn cần đăng nhập với tài khoản Quản lý / Quản trị viên để truy cập trang này!');
    window.location.href = 'login.html';
    return false;
  }

  // Cập nhật thông tin profile trên header
  const staffName = document.getElementById('staff-name');
  const staffRole = document.getElementById('staff-role');
  if (staffName && user) staffName.textContent = user.hoTen || 'Quản lý';
  if (staffRole && user) staffRole.textContent = 'Vị trí: ' + (user.viTriCongViec || 'Quản lý');

  return true;
}

// ─── Lấy tham số tìm kiếm & lọc hiện tại ───────────────────────────────
function getQueryParams() {
  const search = document.getElementById('search-input') ? document.getElementById('search-input').value.trim() : '';
  const viTri = document.getElementById('filter-vitri') ? document.getElementById('filter-vitri').value : '';
  const trangThai = document.getElementById('filter-trangthai') ? document.getElementById('filter-trangthai').value : '';
  const sortVal = document.getElementById('sort-select') ? document.getElementById('sort-select').value : 'NgayVaoLam-DESC';
  const [sortBy, sortOrder] = sortVal.split('-');

  return { search, viTri, trangThai, sortBy, sortOrder, page: currentPage, limit: currentLimit };
}

// ─── Tải danh sách nhân viên ────────────────────────────────────────────
async function loadNhanVien() {
  const tbody = document.getElementById('nv-table-body');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;"></i><br/>Đang tải...</td></tr>';

  try {
    const params = getQueryParams();
    const queryString = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();

    const res = await Api.request(`/nhan-vien?${queryString}`);

    if (!res.success) throw new Error(res.message);

    const { data, pagination, positions, kpi } = res;

    // Cập nhật bộ lọc vị trí
    if (positions) updatePositionFilter(positions);

    // Cập nhật KPI trực tiếp từ backend
    if (kpi) updateKPI(kpi);

    // Render bảng danh sách
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-inbox" style="font-size:2rem; margin-bottom:8px;"></i><br/>Không tìm thấy nhân viên nào phù hợp với bộ lọc.</td></tr>';
    } else {
      tbody.innerHTML = data.map(nv => renderRow(nv)).join('');
    }

    // Render phân trang
    renderPagination(pagination);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:#dc2626;"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</td></tr>`;

    // Nếu lỗi 403 (không đủ quyền)
    if (err.status === 403) {
      showToast('Bạn không có quyền Quản lý nhân viên! Chỉ Quản lý / Quản trị viên mới được phép truy cập.', 'error');
    }
  }
}

// ─── Render một dòng nhân viên ──────────────────────────────────────────
function renderRow(nv) {
  const isInactive = nv.TrangThai === 'Nghỉ việc';
  const rowClass = isInactive ? 'row-inactive' : '';
  const statusBadge = isInactive
    ? '<span class="badge-status badge-inactive"><i class="fa-solid fa-circle-xmark"></i> Nghỉ việc</span>'
    : '<span class="badge-status badge-active"><i class="fa-solid fa-circle-check"></i> Đang làm</span>';

  const safeName = (nv.HoTen || '').replace(/'/g, "\\'");

  let actionsHtml = `
    <div class="action-group">
      <button class="btn-action btn-view" onclick="viewDetail('${nv.MaNhanVien}')" title="Xem chi tiết nhân viên">
        <i class="fa-solid fa-eye"></i> Xem
      </button>
      <button class="btn-action btn-edit" onclick="openEditModal('${nv.MaNhanVien}')" title="Chỉnh sửa thông tin">
        <i class="fa-solid fa-pen"></i> Sửa
      </button>`;

  if (isInactive) {
    actionsHtml += `
      <button class="btn-action btn-restore" onclick="restoreEmployee('${nv.MaNhanVien}', '${safeName}')" title="Khôi phục trạng thái Đang làm">
        <i class="fa-solid fa-rotate-left"></i> Khôi phục
      </button>`;
  } else {
    actionsHtml += `
      <button class="btn-action btn-delete" onclick="deleteEmployee('${nv.MaNhanVien}', '${safeName}')" title="Xóa hoặc Vô hiệu hóa">
        <i class="fa-solid fa-trash-can"></i> Xóa
      </button>`;
  }
  actionsHtml += '</div>';

  return `
    <tr class="${rowClass}">
      <td><code style="font-weight:800; color:var(--primary); font-size:.9rem;">${nv.MaNhanVien}</code></td>
      <td><strong>${nv.HoTen}</strong></td>
      <td>${fmtDate(nv.NgaySinh)}</td>
      <td><strong>${nv.SoDienThoai || '—'}</strong></td>
      <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${nv.DiaChi || ''}">${nv.DiaChi || '—'}</td>
      <td>${fmtDate(nv.NgayVaoLam)}</td>
      <td><span style="background:#e0f2fe; color:#0369a1; padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:700;">${nv.ViTriCongViec}</span></td>
      <td style="font-weight:700; color:#b45309;">${fmtVND(nv.LuongCoBan)}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center;">${actionsHtml}</td>
    </tr>
  `;
}

// ─── Cập nhật bộ lọc vị trí ─────────────────────────────────────────────
function updatePositionFilter(positions) {
  const select = document.getElementById('filter-vitri');
  if (!select) return;
  const currentVal = select.value;
  // Giữ lại option đầu tiên
  while (select.options.length > 1) {
    select.remove(1);
  }
  positions.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = pos;
    select.appendChild(opt);
  });
  select.value = currentVal;
}

// ─── Cập nhật KPI cards ─────────────────────────────────────────────────
function updateKPI(kpi) {
  if (!kpi) return;
  const elTotal = document.getElementById('kpi-total');
  const elActive = document.getElementById('kpi-active');
  const elInactive = document.getElementById('kpi-inactive');
  const elPositions = document.getElementById('kpi-positions');

  if (elTotal) elTotal.textContent = kpi.total || 0;
  if (elActive) elActive.textContent = kpi.active || 0;
  if (elInactive) elInactive.textContent = kpi.inactive || 0;
  if (elPositions) elPositions.textContent = kpi.positionsCount || 0;
}

// ─── Render phân trang ──────────────────────────────────────────────────
function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!container) return;
  const { total, page, limit, totalPages } = pagination;

  if (totalPages <= 1) {
    container.innerHTML = `<span class="page-info">Tổng cộng <strong>${total}</strong> nhân viên</span>`;
    return;
  }

  let html = '';

  // Nút Previous
  html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;

  // Page numbers
  const range = 2;
  let start = Math.max(1, page - range);
  let end = Math.min(totalPages, page + range);

  if (start > 1) {
    html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
    if (start > 2) html += `<span class="page-info">...</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span class="page-info">...</span>`;
    html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // Nút Next
  html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;

  // Info
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  html += `<span class="page-info">${from}–${to} / ${total}</span>`;

  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadNhanVien();
}

// ─── Tìm kiếm (debounce) ───────────────────────────────────────────────
function handleSearch() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentPage = 1;
    loadNhanVien();
  }, 350);
}

function handleFilter() {
  currentPage = 1;
  loadNhanVien();
}

function handleSort() {
  currentPage = 1;
  loadNhanVien();
}

// ─── Modal helpers ──────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
  document.body.style.overflow = '';
}

// Đóng modal khi click overlay
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Đóng modal khi nhấn ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});

// ─── Mở modal THÊM nhân viên ────────────────────────────────────────────
function openAddModal() {
  document.getElementById('modal-form-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> Thêm nhân viên mới';
  document.getElementById('form-mode').value = 'add';
  document.getElementById('form-id').value = '';
  document.getElementById('btn-form-submit').innerHTML = '<i class="fa-solid fa-plus"></i> Thêm mới';

  // Ẩn trường hiển thị mã nhân viên khi thêm mới (vì hệ thống tự sinh mã NVxxx)
  const groupMaNV = document.getElementById('form-group-manv');
  if (groupMaNV) groupMaNV.style.display = 'none';

  // Cấu hình trường mật khẩu
  const matKhauInput = document.getElementById('form-matkhau');
  const matKhauHelp = document.getElementById('matkhau-help');
  if (matKhauInput) matKhauInput.placeholder = 'Mặc định: 123456';
  if (matKhauHelp) matKhauHelp.textContent = 'Để trống sẽ tự động đặt mật khẩu mặc định là 123456';

  // Reset form
  document.getElementById('nv-form').reset();
  document.getElementById('form-ngayvaolam').value = new Date().toISOString().split('T')[0];

  openModal('modal-form');
}

// ─── Mở modal SỬA nhân viên ────────────────────────────────────────────
async function openEditModal(maNV) {
  try {
    const res = await Api.request(`/nhan-vien/${maNV}`);
    if (!res.success) throw new Error(res.message);

    const nv = res.data;

    document.getElementById('modal-form-title').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Sửa nhân viên: ${nv.MaNhanVien}`;
    document.getElementById('form-mode').value = 'edit';
    document.getElementById('form-id').value = nv.MaNhanVien;
    document.getElementById('btn-form-submit').innerHTML = '<i class="fa-solid fa-check"></i> Cập nhật';

    // Hiển thị mã nhân viên nhưng KHÔNG cho phép sửa (bảo toàn khóa ngoại)
    const groupMaNV = document.getElementById('form-group-manv');
    const displayMaNV = document.getElementById('form-display-manv');
    if (groupMaNV && displayMaNV) {
      groupMaNV.style.display = 'block';
      displayMaNV.value = nv.MaNhanVien;
    }

    // Cấu hình trường mật khẩu
    const matKhauInput = document.getElementById('form-matkhau');
    const matKhauHelp = document.getElementById('matkhau-help');
    if (matKhauInput) {
      matKhauInput.value = '';
      matKhauInput.placeholder = 'Để trống nếu không đổi mật khẩu';
    }
    if (matKhauHelp) matKhauHelp.textContent = 'Chỉ nhập nếu muốn đổi mật khẩu mới cho nhân viên này';

    // Điền dữ liệu cũ vào biểu mẫu
    document.getElementById('form-hoten').value = nv.HoTen || '';
    document.getElementById('form-ngaysinh').value = nv.NgaySinh ? nv.NgaySinh.split('T')[0] : '';
    document.getElementById('form-sdt').value = nv.SoDienThoai || '';
    document.getElementById('form-diachi').value = nv.DiaChi || '';
    document.getElementById('form-ngayvaolam').value = nv.NgayVaoLam ? nv.NgayVaoLam.split('T')[0] : '';
    document.getElementById('form-vitri').value = nv.ViTriCongViec || '';
    document.getElementById('form-luong').value = nv.LuongCoBan ? Math.round(nv.LuongCoBan) : 0;

    // Nếu vị trí không có sẵn trong danh sách select, bổ sung thêm
    const selectVT = document.getElementById('form-vitri');
    if (nv.ViTriCongViec && !Array.from(selectVT.options).some(o => o.value === nv.ViTriCongViec)) {
      const opt = document.createElement('option');
      opt.value = nv.ViTriCongViec;
      opt.textContent = nv.ViTriCongViec;
      selectVT.appendChild(opt);
      selectVT.value = nv.ViTriCongViec;
    }

    openModal('modal-form');
  } catch (err) {
    showToast('Lỗi tải thông tin nhân viên: ' + err.message, 'error');
  }
}

// ─── Xử lý submit form Thêm / Sửa ──────────────────────────────────────
async function handleFormSubmit(event) {
  event.preventDefault();

  const mode = document.getElementById('form-mode').value;
  const id = document.getElementById('form-id').value;

  const payload = {
    hoTen: document.getElementById('form-hoten').value.trim(),
    ngaySinh: document.getElementById('form-ngaysinh').value || null,
    soDienThoai: document.getElementById('form-sdt').value.trim() || null,
    diaChi: document.getElementById('form-diachi').value.trim() || null,
    ngayVaoLam: document.getElementById('form-ngayvaolam').value || null,
    viTriCongViec: document.getElementById('form-vitri').value,
    luongCoBan: Number(document.getElementById('form-luong').value) || 0
  };

  const matKhauVal = document.getElementById('form-matkhau') ? document.getElementById('form-matkhau').value.trim() : '';
  if (matKhauVal) {
    payload.matKhau = matKhauVal;
  }

  // Client-side validation
  if (!payload.hoTen) {
    showToast('Vui lòng nhập họ tên nhân viên!', 'error');
    return;
  }
  if (!payload.viTriCongViec) {
    showToast('Vui lòng chọn vị trí công việc!', 'error');
    return;
  }
  if (payload.luongCoBan < 0) {
    showToast('Lương cơ bản không được âm!', 'error');
    return;
  }
  if (payload.soDienThoai && !/^0[0-9]{9,10}$/.test(payload.soDienThoai)) {
    showToast('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại 10-11 số.', 'error');
    return;
  }

  const submitBtn = document.getElementById('btn-form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

  try {
    let res;
    if (mode === 'add') {
      res = await Api.request('/nhan-vien', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } else {
      res = await Api.request(`/nhan-vien/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    }

    showToast(res.message || 'Thao tác thành công!', 'success');
    closeModal('modal-form');
    loadNhanVien();
  } catch (err) {
    showToast(err.message || 'Có lỗi xảy ra!', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = mode === 'add'
      ? '<i class="fa-solid fa-plus"></i> Thêm mới'
      : '<i class="fa-solid fa-check"></i> Cập nhật';
  }
}

// ─── Xem chi tiết nhân viên ─────────────────────────────────────────────
async function viewDetail(maNV) {
  const body = document.getElementById('modal-detail-body');
  body.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;"></i><br/>Đang tải chi tiết...</div>';
  openModal('modal-detail');

  try {
    const res = await Api.request(`/nhan-vien/${maNV}`);
    if (!res.success) throw new Error(res.message);

    const nv = res.data;
    const isActive = nv.TrangThai !== 'Nghỉ việc';
    const statusBadge = isActive
      ? '<span class="badge-status badge-active"><i class="fa-solid fa-circle-check"></i> Đang làm việc</span>'
      : '<span class="badge-status badge-inactive"><i class="fa-solid fa-circle-xmark"></i> Đã nghỉ việc</span>';

    let html = `
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Mã nhân viên</div>
          <div class="detail-value" style="color:var(--primary); font-size:1.15rem; font-family:monospace;">${nv.MaNhanVien}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Trạng thái làm việc</div>
          <div class="detail-value">${statusBadge}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Họ và tên</div>
          <div class="detail-value" style="font-size:1.05rem;">${nv.HoTen}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Ngày sinh</div>
          <div class="detail-value">${fmtDate(nv.NgaySinh)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Số điện thoại</div>
          <div class="detail-value">${nv.SoDienThoai || '—'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Địa chỉ</div>
          <div class="detail-value">${nv.DiaChi || '—'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Ngày vào làm</div>
          <div class="detail-value">${fmtDate(nv.NgayVaoLam)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Vị trí công việc</div>
          <div class="detail-value">
            <span style="background:#e0f2fe; color:#0369a1; padding:4px 12px; border-radius:12px; font-weight:700;">${nv.ViTriCongViec}</span>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Lương cơ bản</div>
          <div class="detail-value" style="color:#b45309; font-size:1.1rem;">${fmtVND(nv.LuongCoBan)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Tổng lượt soát vé / Check-in</div>
          <div class="detail-value" style="color:#16a34a; font-size:1.1rem;">
            <i class="fa-solid fa-ticket"></i> ${nv.soLuotCheckIn || 0} lượt
          </div>
        </div>
      </div>
    `;

    // Lịch sử soát vé / check-in
    if (nv.lichSuCheckIn && nv.lichSuCheckIn.length > 0) {
      html += `
        <div class="detail-section-title"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử soát vé / check-in gần nhất (Tối đa 15 lượt)</div>
        <div style="overflow-x:auto;">
          <table class="checkin-history-table">
            <thead>
              <tr>
                <th>Mã CI</th>
                <th>Thời gian</th>
                <th>Mã vé</th>
                <th>Ghế</th>
                <th>Phim</th>
                <th>Phòng</th>
              </tr>
            </thead>
            <tbody>
              ${nv.lichSuCheckIn.map(ci => `
                <tr>
                  <td><code>${ci.MaCheckIn}</code></td>
                  <td>${new Date(ci.ThoiGianCheckIn).toLocaleString('vi-VN')}</td>
                  <td><strong style="color:var(--text); font-family:monospace;">${ci.MaVe}</strong></td>
                  <td><span style="background:var(--primary); color:#fff; padding:1px 6px; border-radius:4px; font-size:.75rem;">${ci.MaGhe}</span></td>
                  <td><strong>${ci.TenPhim}</strong></td>
                  <td>${ci.TenPhong}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      html += `
        <div class="detail-section-title"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử soát vé / check-in</div>
        <p style="color:var(--text-muted); font-size:.85rem; padding:10px 0;"><i class="fa-solid fa-info-circle"></i> Nhân viên này chưa thực hiện lượt check-in nào trong hệ thống.</p>
      `;
    }

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div style="text-align:center; padding:30px; color:#dc2626;"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</div>`;
  }
}

// ─── Xóa / Vô hiệu hóa nhân viên ──────────────────────────────────────
async function deleteEmployee(maNV, hoTen) {
  const confirmed = confirm(
    `Bạn có chắc chắn muốn xóa/vô hiệu hóa nhân viên "${hoTen}" (Mã: ${maNV})?\n\n` +
    `• Nếu nhân viên ĐÃ CÓ dữ liệu check-in trong hệ thống: Tài khoản sẽ được chuyển sang trạng thái "Nghỉ việc" để bảo toàn lịch sử và khóa quyền đăng nhập.\n` +
    `• Nếu nhân viên CHƯA CÓ dữ liệu liên quan: Hệ thống sẽ xóa vĩnh viễn khỏi cơ sở dữ liệu.`
  );

  if (!confirmed) return;

  try {
    const res = await Api.request(`/nhan-vien/${maNV}`, { method: 'DELETE' });

    if (res.action === 'deactivated') {
      showToast(res.message, 'info');
    } else {
      showToast(res.message, 'success');
    }
    loadNhanVien();
  } catch (err) {
    showToast(err.message || 'Có lỗi xảy ra khi xóa nhân viên!', 'error');
  }
}

// ─── Khôi phục nhân viên ────────────────────────────────────────────────
async function restoreEmployee(maNV, hoTen) {
  if (!confirm(`Khôi phục nhân viên "${hoTen}" (${maNV}) về trạng thái "Đang làm"? Tài khoản sẽ được phép đăng nhập lại bình thường.`)) return;

  try {
    const res = await Api.request(`/nhan-vien/${maNV}/khoi-phuc`, { method: 'PATCH' });
    showToast(res.message, 'success');
    loadNhanVien();
  } catch (err) {
    showToast(err.message || 'Có lỗi khi khôi phục nhân viên!', 'error');
  }
}

// ─── Bootstrap ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!checkPermission()) return;
  loadNhanVien();
});
