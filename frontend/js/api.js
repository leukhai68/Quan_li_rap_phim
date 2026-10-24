/**
 * api.js — Wrapper gọi API Backend PTIT Cinema
 * Base URL: http://localhost:5000/api
 */

const API_BASE = 'http://localhost:5000/api';

const Api = {
  // ─── Quản lý Token & Auth state ─────────────────────────────────────────────
  getToken() {
    return localStorage.getItem('token');
  },

  setAuth(token, user) {
    if (token) localStorage.setItem('token', token);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userName', user.hoTen || user.userName || 'Thành viên');
      localStorage.setItem('userId', user.userId || user.maKhachHang || user.maNhanVien || '');
      localStorage.setItem('userRole', user.role || 'khach_hang');
      localStorage.setItem('isLoggedIn', 'true');
    }
  },

  getUser() {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
  },

  isLoggedIn() {
    return !!this.getToken() && localStorage.getItem('isLoggedIn') === 'true';
  },

  isStaff() {
    return this.isLoggedIn() && localStorage.getItem('userRole') === 'nhan_vien';
  },

  // Helper fetch kèm Auth header & JSON parsing
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || `Lỗi HTTP ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  },

  // ─── AUTH APIS ─────────────────────────────────────────────────────────────
  async login(account, matKhau) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account, matKhau })
    });
    if (res.success && res.token) {
      this.setAuth(res.token, res.user);
    }
    return res;
  },

  async register(data) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success && res.token) {
      this.setAuth(res.token, res.user);
    }
    return res;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  // ─── PHIM & SUẤT CHIẾU ─────────────────────────────────────────────────────
  async getPhim(trangthai = '') {
    const params = trangthai ? `?trangthai=${encodeURIComponent(trangthai)}` : '';
    return this.request(`/phim${params}`);
  },

  async getPhimById(id) {
    return this.request(`/phim/${id}`);
  },

  async getSuatChieu(filters = {}) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    );
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/suat-chieu${query}`);
  },

  async getSuatChieuById(id) {
    return this.request(`/suat-chieu/${id}`);
  },

  // ─── SẢN PHẨM BẮP NƯỚC ─────────────────────────────────────────────────────
  async getSanPham(loai = '') {
    const query = loai ? `?loai=${encodeURIComponent(loai)}` : '';
    return this.request(`/san-pham${query}`);
  },

  // ─── ĐẶT VÉ ────────────────────────────────────────────────────────────────
  async datVe(bookingData) {
    return this.request('/dat-ve', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  },

  // ─── LỊCH SỬ ĐẶT VÉ & BẮP NƯỚC ─────────────────────────────────────────────
  async getLichSu(filters = {}) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''))
    );
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/lich-su${query}`);
  },

  async getChiTietDatVe(maDatVe) {
    return this.request(`/lich-su/${encodeURIComponent(maDatVe)}`);
  },

  async getLichSuBapNuoc() {
    return this.request('/lich-su/bap-nuoc/danh-sach');
  },

  // ─── CHECK-IN (DÀNH CHO NHÂN VIÊN) ─────────────────────────────────────────
  async timKiemCheckIn(keyword) {
    return this.request(`/check-in/tim-kiem?q=${encodeURIComponent(keyword)}`);
  },

  async xacNhanCheckIn(maVe, giaoDoAn = false) {
    return this.request('/check-in/xac-nhan', {
      method: 'POST',
      body: JSON.stringify({ maVe, giaoDoAn })
    });
  },

  async xacNhanNhanSanPham(maDatVe, maSanPham = null) {
    return this.request('/check-in/xac-nhan-san-pham', {
      method: 'POST',
      body: JSON.stringify({ maDatVe, maSanPham })
    });
  },

  async getCheckInHomNay() {
    return this.request('/check-in/danh-sach-hom-nay');
  },

  async getDanhSachChoDuyet(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/check-in/danh-sach-cho-duyet${query}`);
  },

  async getDanhSachKhachHang(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/check-in/danh-sach-khach-hang${query}`);
  },

  // ─── BÁO CÁO ───────────────────────────────────────────────────────────────
  async getDoanhThuPhim(tuNgay, denNgay) {
    const params = new URLSearchParams({ tuNgay, denNgay });
    return this.request(`/bao-cao/doanh-thu-phim?${params}`);
  },

  async getLapDayGhe() {
    return this.request('/bao-cao/lap-day-ghe');
  },

  async getTopKhachHang(tuNgay, denNgay) {
    const params = new URLSearchParams({ tuNgay, denNgay });
    return this.request(`/bao-cao/top-khach-hang?${params}`);
  },
};

window.Api = Api;
