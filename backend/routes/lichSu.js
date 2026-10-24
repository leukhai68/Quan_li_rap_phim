const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/lich-su
 * Lấy danh sách lịch sử đặt vé của khách hàng đang đăng nhập
 * Query: ?page=1&limit=10&tuNgay=&denNgay=&maPhim=&trangThaiVe=&search=
 */
router.get('/', authenticateToken, requireRole('khach_hang'), async (req, res) => {
  try {
    const maKhachHang = req.user.userId;
    const {
      page = 1,
      limit = 10,
      tuNgay,
      denNgay,
      maPhim,
      trangThaiVe,
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Xây dựng điều kiện WHERE cho DAT_VE
    let whereClauses = [`dv.MaKhachHang = ?`];
    let params = [maKhachHang];

    if (tuNgay) {
      whereClauses.push(`DATE(dv.ThoiGianDat) >= ?`);
      params.push(tuNgay);
    }
    if (denNgay) {
      whereClauses.push(`DATE(dv.ThoiGianDat) <= ?`);
      params.push(denNgay);
    }
    if (maPhim) {
      whereClauses.push(`sc.MaPhim = ?`);
      params.push(maPhim);
    }
    if (trangThaiVe) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM VE v_filter 
        WHERE v_filter.MaDatVe = dv.MaDatVe AND v_filter.TrangThaiVe = ?
      )`);
      params.push(trangThaiVe);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClauses.push(`(
        dv.MaDatVe LIKE ? 
        OR p.TenPhim LIKE ? 
        OR EXISTS (SELECT 1 FROM VE v_s WHERE v_s.MaDatVe = dv.MaDatVe AND v_s.MaVe LIKE ?)
      )`);
      params.push(q, q, q);
    }

    const whereSql = whereClauses.join(' AND ');

    // Đếm tổng số bản ghi
    const countSql = `
      SELECT COUNT(DISTINCT dv.MaDatVe) AS total
      FROM DAT_VE dv
      JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      WHERE ${whereSql}
    `;
    const [[countResult]] = await db.execute(countSql, params);
    const totalRecords = countResult.total || 0;

    // Lấy danh sách mã đặt vé trang hiện tại
    const listSql = `
      SELECT 
        dv.MaDatVe,
        dv.ThoiGianDat,
        dv.TongSoTien,
        dv.SoTienGiamGia,
        dv.SoTienPhaiThanhToan,
        dv.TrangThaiThanhToan,
        dv.PhuongThucThanhToan,
        dv.TenRap,
        dv.MaKhuyenMai,
        sc.MaSuatChieu,
        sc.ThoiGianBatDau,
        sc.ThoiGianKetThuc,
        p.MaPhim,
        p.TenPhim,
        p.ThoiLuong,
        p.GioiHanDoTuoi,
        pc.TenPhong,
        pc.LoaiPhong
      FROM DAT_VE dv
      JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
      WHERE ${whereSql}
      ORDER BY dv.ThoiGianDat DESC
      LIMIT ? OFFSET ?
    `;

    // mysql2 execute với LIMIT/OFFSET dạng số nguyên
    const queryParams = [...params, String(limitNum), String(offset)];
    const [bookings] = await db.query(listSql, [...params, limitNum, offset]);

    if (bookings.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limitNum)
        }
      });
    }

    const maDatVeList = bookings.map(b => b.MaDatVe);
    const placeholders = maDatVeList.map(() => '?').join(',');

    // Lấy danh sách Vé của các đơn đặt vé này
    const [tickets] = await db.query(
      `SELECT 
        v.MaVe,
        v.MaDatVe,
        v.MaGhe,
        v.GiaVeTaiThoiDiemMua,
        v.TrangThaiVe,
        g.HangGhe,
        g.SoGhe,
        lg.TenLoaiGhe,
        ci.MaCheckIn,
        ci.ThoiGianCheckIn,
        nv.HoTen AS TenNhanVienCheckIn
       FROM VE v
       JOIN GHE g ON g.MaGhe = v.MaGhe
       JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
       LEFT JOIN CHECK_IN ci ON ci.MaVe = v.MaVe
       LEFT JOIN NHAN_VIEN nv ON nv.MaNhanVien = ci.MaNhanVien
       WHERE v.MaDatVe IN (${placeholders})
       ORDER BY g.HangGhe, g.SoGhe`,
      maDatVeList
    );

    // Lấy danh sách Bắp Nước của các đơn đặt vé này
    const [snacks] = await db.query(
      `SELECT 
        mk.MaDatVe,
        mk.MaSanPham,
        mk.SoLuong,
        mk.DonGiaTaiThoiDiemMua,
        mk.TrangThaiNhan,
        sp.TenSanPham,
        sp.LoaiSanPham,
        sp.HinhAnh
       FROM MUA_KEM mk
       JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
       WHERE mk.MaDatVe IN (${placeholders})`,
      maDatVeList
    );

    // Gom nhóm tickets và snacks theo MaDatVe
    const ticketMap = {};
    for (const t of tickets) {
      if (!ticketMap[t.MaDatVe]) ticketMap[t.MaDatVe] = [];
      ticketMap[t.MaDatVe].push({
        maVe: t.MaVe,
        maGhe: t.MaGhe,
        ghe: `${t.HangGhe}${t.SoGhe}`,
        hangGhe: t.HangGhe,
        soGhe: t.SoGhe,
        loaiGhe: t.TenLoaiGhe,
        giaVe: parseFloat(t.GiaVeTaiThoiDiemMua),
        trangThaiVe: t.TrangThaiVe,
        checkIn: t.MaCheckIn ? {
          maCheckIn: t.MaCheckIn,
          thoiGianCheckIn: t.ThoiGianCheckIn,
          nhanVien: t.TenNhanVienCheckIn
        } : null
      });
    }

    const snackMap = {};
    for (const s of snacks) {
      if (!snackMap[s.MaDatVe]) snackMap[s.MaDatVe] = [];
      const donGia = parseFloat(s.DonGiaTaiThoiDiemMua);
      const thanhTien = donGia * s.SoLuong;
      snackMap[s.MaDatVe].push({
        maSanPham: s.MaSanPham,
        tenSanPham: s.TenSanPham,
        loaiSanPham: s.LoaiSanPham,
        hinhAnh: s.HinhAnh,
        soLuong: s.SoLuong,
        donGiaTaiThoiDiemMua: donGia,
        thanhTien,
        trangThaiNhan: s.TrangThaiNhan || 'Chưa nhận'
      });
    }

    // Ghép dữ liệu trả về
    const result = bookings.map(b => {
      const bTickets = ticketMap[b.MaDatVe] || [];
      const bSnacks = snackMap[b.MaDatVe] || [];
      const tienVe = bTickets.reduce((sum, t) => sum + t.giaVe, 0);
      const tienBapNuoc = bSnacks.reduce((sum, s) => sum + s.thanhTien, 0);

      // Trạng thái tổng quát của vé trong đơn
      let trangThaiVeDon = 'Chưa sử dụng';
      if (bTickets.length > 0) {
        const daCheckInCount = bTickets.filter(t => t.trangThaiVe === 'Đã check-in').length;
        const daHuyCount = bTickets.filter(t => t.trangThaiVe === 'Đã hủy').length;
        if (daHuyCount === bTickets.length) {
          trangThaiVeDon = 'Đã hủy';
        } else if (daCheckInCount === bTickets.length) {
          trangThaiVeDon = 'Đã check-in';
        } else if (daCheckInCount > 0) {
          trangThaiVeDon = `Check-in ${daCheckInCount}/${bTickets.length}`;
        }
      }

      return {
        maDatVe: b.MaDatVe,
        thoiGianDat: b.ThoiGianDat,
        phim: {
          maPhim: b.MaPhim,
          tenPhim: b.TenPhim,
          thoiLuong: b.ThoiLuong,
          gioiHanDoTuoi: b.GioiHanDoTuoi
        },
        suatChieu: {
          maSuatChieu: b.MaSuatChieu,
          thoiGianBatDau: b.ThoiGianBatDau,
          thoiGianKetThuc: b.ThoiGianKetThuc,
          phong: b.TenPhong,
          loaiPhong: b.LoaiPhong
        },
        rap: b.TenRap || 'PTIT Cinema Hà Đông',
        danhSachGhe: bTickets.map(t => t.ghe).join(', '),
        loaiGhe: [...new Set(bTickets.map(t => t.loaiGhe))].join(', '),
        soLuongVe: bTickets.length,
        tienVe,
        tienBapNuoc,
        tongSoTien: parseFloat(b.TongSoTien),
        soTienGiamGia: parseFloat(b.SoTienGiamGia),
        soTienPhaiThanhToan: parseFloat(b.SoTienPhaiThanhToan),
        phuongThucThanhToan: b.PhuongThucThanhToan || 'VNPAY',
        trangThaiThanhToan: b.TrangThaiThanhToan,
        trangThaiVe: trangThaiVeDon,
        ve: bTickets,
        sanPham: bSnacks
      };
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum)
      }
    });
  } catch (err) {
    console.error('Lỗi GET /api/lich-su:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử đặt vé: ' + err.message });
  }
});

/**
 * GET /api/lich-su/bap-nuoc/danh-sach
 * Lấy riêng lịch sử mua bắp nước / combo của khách hàng
 */
router.get('/bap-nuoc/danh-sach', authenticateToken, requireRole('khach_hang'), async (req, res) => {
  try {
    const maKhachHang = req.user.userId;

    const [rows] = await db.query(
      `SELECT 
        mk.MaDatVe,
        mk.MaSanPham,
        mk.SoLuong,
        mk.DonGiaTaiThoiDiemMua,
        mk.TrangThaiNhan,
        (mk.SoLuong * mk.DonGiaTaiThoiDiemMua) AS ThanhTien,
        sp.TenSanPham,
        sp.LoaiSanPham,
        sp.HinhAnh,
        dv.ThoiGianDat,
        dv.TrangThaiThanhToan,
        p.TenPhim
       FROM MUA_KEM mk
       JOIN DAT_VE dv ON dv.MaDatVe = mk.MaDatVe
       JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
       JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
       JOIN PHIM p ON p.MaPhim = sc.MaPhim
       WHERE dv.MaKhachHang = ?
       ORDER BY dv.ThoiGianDat DESC`,
      [maKhachHang]
    );

    const data = rows.map(r => ({
      maDatVe: r.MaDatVe,
      maSanPham: r.MaSanPham,
      tenSanPham: r.TenSanPham,
      loaiSanPham: r.LoaiSanPham,
      hinhAnh: r.HinhAnh,
      soLuong: r.SoLuong,
      donGiaTaiThoiDiemMua: parseFloat(r.DonGiaTaiThoiDiemMua),
      thanhTien: parseFloat(r.ThanhTien),
      trangThaiNhan: r.TrangThaiNhan || 'Chưa nhận',
      thoiGianDat: r.ThoiGianDat,
      trangThaiThanhToan: r.TrangThaiThanhToan,
      tenPhim: r.TenPhim
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Lỗi GET /api/lich-su/bap-nuoc/danh-sach:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/lich-su/:maDatVe
 * Xem chi tiết 1 đơn đặt vé (Kiểm tra bảo mật quyền sở hữu đơn hàng)
 */
router.get('/:maDatVe', authenticateToken, requireRole('khach_hang'), async (req, res) => {
  try {
    const { maDatVe } = req.params;
    const maKhachHang = req.user.userId;

    // Lấy thông tin đơn đặt vé và kiểm tra quyền sở hữu
    const [dvRows] = await db.execute(
      `SELECT 
        dv.*,
        sc.MaSuatChieu,
        sc.ThoiGianBatDau,
        sc.ThoiGianKetThuc,
        p.MaPhim,
        p.TenPhim,
        p.ThoiLuong,
        p.GioiHanDoTuoi,
        pc.TenPhong,
        pc.LoaiPhong
       FROM DAT_VE dv
       JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
       JOIN PHIM p ON p.MaPhim = sc.MaPhim
       JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
       WHERE dv.MaDatVe = ?`,
      [maDatVe]
    );

    if (dvRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt vé!' });
    }

    const dv = dvRows[0];

    // BẢO MẬT: Chặn xem đơn của người khác
    if (dv.MaKhachHang !== maKhachHang) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thông tin đơn đặt vé của khách hàng khác!'
      });
    }

    // Lấy chi tiết vé
    const [tickets] = await db.execute(
      `SELECT 
        v.MaVe,
        v.MaGhe,
        v.GiaVeTaiThoiDiemMua,
        v.TrangThaiVe,
        g.HangGhe,
        g.SoGhe,
        lg.TenLoaiGhe,
        ci.MaCheckIn,
        ci.ThoiGianCheckIn,
        nv.HoTen AS TenNhanVienCheckIn
       FROM VE v
       JOIN GHE g ON g.MaGhe = v.MaGhe
       JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
       LEFT JOIN CHECK_IN ci ON ci.MaVe = v.MaVe
       LEFT JOIN NHAN_VIEN nv ON nv.MaNhanVien = ci.MaNhanVien
       WHERE v.MaDatVe = ?
       ORDER BY g.HangGhe, g.SoGhe`,
      [maDatVe]
    );

    // Lấy chi tiết bắp nước
    const [snacks] = await db.execute(
      `SELECT 
        mk.MaSanPham,
        mk.SoLuong,
        mk.DonGiaTaiThoiDiemMua,
        mk.TrangThaiNhan,
        sp.TenSanPham,
        sp.LoaiSanPham,
        sp.HinhAnh
       FROM MUA_KEM mk
       JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
       WHERE mk.MaDatVe = ?`,
      [maDatVe]
    );

    const formattedTickets = tickets.map(t => ({
      maVe: t.MaVe,
      maGhe: t.MaGhe,
      ghe: `${t.HangGhe}${t.SoGhe}`,
      hangGhe: t.HangGhe,
      soGhe: t.SoGhe,
      loaiGhe: t.TenLoaiGhe,
      giaVe: parseFloat(t.GiaVeTaiThoiDiemMua),
      trangThaiVe: t.TrangThaiVe,
      checkIn: t.MaCheckIn ? {
        maCheckIn: t.MaCheckIn,
        thoiGianCheckIn: t.ThoiGianCheckIn,
        nhanVien: t.TenNhanVienCheckIn
      } : null
    }));

    const formattedSnacks = snacks.map(s => {
      const donGia = parseFloat(s.DonGiaTaiThoiDiemMua);
      return {
        maSanPham: s.MaSanPham,
        tenSanPham: s.TenSanPham,
        loaiSanPham: s.LoaiSanPham,
        hinhAnh: s.HinhAnh,
        soLuong: s.SoLuong,
        donGiaTaiThoiDiemMua: donGia,
        thanhTien: donGia * s.SoLuong,
        trangThaiNhan: s.TrangThaiNhan || 'Chưa nhận'
      };
    });

    const tienVe = formattedTickets.reduce((sum, t) => sum + t.giaVe, 0);
    const tienBapNuoc = formattedSnacks.reduce((sum, s) => sum + s.thanhTien, 0);

    res.json({
      success: true,
      data: {
        maDatVe: dv.MaDatVe,
        thoiGianDat: dv.ThoiGianDat,
        phim: {
          maPhim: dv.MaPhim,
          tenPhim: dv.TenPhim,
          thoiLuong: dv.ThoiLuong,
          gioiHanDoTuoi: dv.GioiHanDoTuoi
        },
        suatChieu: {
          maSuatChieu: dv.MaSuatChieu,
          thoiGianBatDau: dv.ThoiGianBatDau,
          thoiGianKetThuc: dv.ThoiGianKetThuc,
          phong: dv.TenPhong,
          loaiPhong: dv.LoaiPhong
        },
        rap: dv.TenRap || 'PTIT Cinema Hà Đông',
        tienVe,
        tienBapNuoc,
        tongSoTien: parseFloat(dv.TongSoTien),
        soTienGiamGia: parseFloat(dv.SoTienGiamGia),
        soTienPhaiThanhToan: parseFloat(dv.SoTienPhaiThanhToan),
        phuongThucThanhToan: dv.PhuongThucThanhToan || 'VNPAY',
        trangThaiThanhToan: dv.TrangThaiThanhToan,
        ve: formattedTickets,
        sanPham: formattedSnacks
      }
    });
  } catch (err) {
    console.error('Lỗi GET /api/lich-su/:maDatVe:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết vé: ' + err.message });
  }
});

module.exports = router;
