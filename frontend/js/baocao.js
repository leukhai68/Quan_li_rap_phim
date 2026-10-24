/**
 * baocao.js — Logic trang báo cáo
 */

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}
function formatTime(dtString) {
  if (!dtString) return '--';
  return new Date(dtString).toLocaleString('vi-VN');
}

// ── Doanh thu phim ────────────────────────────────────────────────────────
async function loadDoanhThu() {
  const tuNgay = document.getElementById('tu-ngay').value;
  const denNgay = document.getElementById('den-ngay').value;
  const loading = document.getElementById('dt-loading');
  const content = document.getElementById('dt-content');

  loading.style.display = 'flex';
  content.style.display = 'none';

  try {
    const res = await Api.getDoanhThuPhim(tuNgay, denNgay);
    const data = res.data || [];

    const totalDT    = data.reduce((s, r) => s + Number(r.TongDoanhThu), 0);
    const totalVe    = data.reduce((s, r) => s + Number(r.SoVeDaBan), 0);
    const totalDTVe  = data.reduce((s, r) => s + Number(r.DoanhThuVe), 0);
    const totalDTSP  = data.reduce((s, r) => s + Number(r.DoanhThuSanPham), 0);

    document.getElementById('dt-summary').innerHTML = `
      <div class="summary-card">
        <div class="s-label">Tổng doanh thu</div>
        <div class="s-value">${formatVND(totalDT)}</div>
        <div class="s-sub">Giai đoạn ${tuNgay} → ${denNgay}</div>
      </div>
      <div class="summary-card" style="border-top-color:#00897b">
        <div class="s-label">Doanh thu vé</div>
        <div class="s-value" style="color:#00897b">${formatVND(totalDTVe)}</div>
        <div class="s-sub">${totalVe} vé đã bán</div>
      </div>
      <div class="summary-card" style="border-top-color:#e53935">
        <div class="s-label">Doanh thu sản phẩm</div>
        <div class="s-value" style="color:#e53935">${formatVND(totalDTSP)}</div>
        <div class="s-sub">Đồ ăn, nước uống</div>
      </div>
    `;

    const tbody = document.getElementById('dt-tbody');
    tbody.innerHTML = data.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><code>${r.MaPhim}</code></td>
        <td><strong>${r.TenPhim}</strong></td>
        <td>${r.SoVeDaBan}</td>
        <td>${formatVND(r.DoanhThuVe)}</td>
        <td>${formatVND(r.DoanhThuSanPham)}</td>
        <td><strong style="color:var(--primary)">${formatVND(r.TongDoanhThu)}</strong></td>
      </tr>
    `).join('');

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    loading.innerHTML = `<p style="color:#c62828">Lỗi: ${err.message}</p>`;
  }
}

// ── Lấp đầy ghế ──────────────────────────────────────────────────────────
async function loadLapDay() {
  const loading = document.getElementById('ld-loading');
  const content = document.getElementById('ld-content');

  loading.style.display = 'flex';
  content.style.display = 'none';

  try {
    const res  = await Api.getLapDayGhe();
    const data = res.data || [];

    const tbody = document.getElementById('ld-tbody');
    tbody.innerHTML = data.map(r => {
      const pct = parseFloat(r.TyLeLapDayPhanTram) || 0;
      const color = pct >= 80 ? '#2e7d32' : pct >= 50 ? '#f57c00' : 'var(--primary)';
      return `
        <tr>
          <td><code>${r.MaSuatChieu}</code></td>
          <td>${r.TenPhim}</td>
          <td>${r.TenPhong}</td>
          <td>${formatTime(r.ThoiGianBatDau)}</td>
          <td>${r.TongSoGhe}</td>
          <td>${r.SoVeDaBan}</td>
          <td>${r.SoGheConTrong}</td>
          <td>
            <div class="fill-bar-wrap">
              <div class="fill-bar">
                <div class="fill-bar-inner" style="width:${pct}%;background:${color}"></div>
              </div>
              <span class="fill-pct" style="color:${color}">${pct}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    loading.innerHTML = `<p style="color:#c62828">Lỗi: ${err.message}</p>`;
  }
}

// ── Top khách hàng ────────────────────────────────────────────────────────
async function loadTopKhachHang() {
  const tuNgay  = document.getElementById('tu-ngay').value;
  const denNgay = document.getElementById('den-ngay').value;
  const loading = document.getElementById('kh-loading');
  const content = document.getElementById('kh-content');

  loading.style.display = 'flex';
  content.style.display = 'none';

  try {
    const res  = await Api.getTopKhachHang(tuNgay, denNgay);
    const data = res.data || [];

    const tbody = document.getElementById('kh-tbody');
    tbody.innerHTML = data.map((r, i) => {
      const rank  = i + 1;
      const cls   = rank <= 3 ? `rank-${rank}` : 'rank-n';
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      return `
        <tr>
          <td><div class="rank-badge ${cls}">${medal}</div></td>
          <td><code>${r.MaKhachHang}</code></td>
          <td><strong>${r.HoTen}</strong></td>
          <td>${r.Email || '-'}</td>
          <td>${r.SoLanDatVe} lần</td>
          <td><strong style="color:var(--primary)">${formatVND(r.TongTienChiTieu)}</strong></td>
        </tr>
      `;
    }).join('');

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    loading.innerHTML = `<p style="color:#c62828">Lỗi: ${err.message}</p>`;
  }
}

// ── Gọi tất cả ───────────────────────────────────────────────────────────
function loadAllReports() {
  const activeTab = document.querySelector('.rtab.active').dataset.rtab;
  if (activeTab === 'doanh-thu') loadDoanhThu();
  else if (activeTab === 'lap-day') loadLapDay();
  else if (activeTab === 'top-kh') loadTopKhachHang();
}

// ── Tab switching ─────────────────────────────────────────────────────────
document.querySelectorAll('.rtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.report-panel').forEach(p => p.style.display = 'none');

    btn.classList.add('active');
    const tab = btn.dataset.rtab;
    const panel = document.getElementById(`panel-${tab}`);
    panel.style.display = 'block';

    if (tab === 'doanh-thu') loadDoanhThu();
    else if (tab === 'lap-day') loadLapDay();
    else if (tab === 'top-kh') loadTopKhachHang();
  });
});

// ── Auto load on page ready ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDoanhThu();
});
