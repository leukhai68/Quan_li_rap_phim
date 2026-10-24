const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/check-in/tim-kiem
 * Tìm kiếm vé cần check-in theo:
 * - Mã vé (Vxxx)
 * - Mã đặt vé (DVxxx)
 * - Tên khách hàng
 * - SĐT khách hàng
 * - Tên phim
 * Yêu cầu quyền Nhân viên
 */
router.get('/tim-kiem', authenticateToken, requireRole('nhan_vien'), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập từ khóa tìm kiếm (Mã vé, mã đơn, tên khách, SĐT)!' });
    }

    const keyword = q.trim();
    const likeKeyword = `%${keyword}%`;

    const sql = `
      SELECT 
        v.MaVe,
        v.MaDatVe,
        v.MaGhe,
        v.GiaVeTaiThoiDiemMua,
        v.TrangThaiVe,
        g.HangGhe,
        g.SoGhe,
        lg.TenLoaiGhe,
        dv.ThoiGianDat,
        dv.TongSoTien,
        dv.SoTienGiamGia,
        dv.SoTienPhaiThanhToan,
        dv.TrangThaiThanhToan,
        dv.PhuongThucThanhToan,
        dv.TenRap,
        kh.MaKhachHang,
        kh.HoTen AS TenKhachHang,
        kh.SoDienThoai AS SdtKhachHang,
        sc.MaSuatChieu,
        sc.ThoiGianBatDau,
        sc.ThoiGianKetThuc,
        sc.TrangThai AS TrangThaiSuatChieu,
        p.MaPhim,
        p.TenPhim,
        p.ThoiLuong,
        p.GioiHanDoTuoi,
        pc.TenPhong,
        pc.LoaiPhong,
        ci.MaCheckIn,
        ci.ThoiGianCheckIn,
        nv.HoTen AS TenNhanVienCheckIn
      FROM VE v
      JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
      JOIN KHACH_HANG kh ON kh.MaKhachHang = dv.MaKhachHang
      JOIN GHE g ON g.MaGhe = v.MaGhe
      JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
      JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
      LEFT JOIN CHECK_IN ci ON ci.MaVe = v.MaVe
      LEFT JOIN NHAN_VIEN nv ON nv.MaNhanVien = ci.MaNhanVien
      WHERE v.MaVe = ? 
         OR v.MaDatVe = ? 
         OR kh.HoTen LIKE ? 
         OR kh.SoDienThoai LIKE ? 
         OR kh.MaKhachHang = ?
         OR p.TenPhim LIKE ?
      ORDER BY dv.ThoiGianDat DESC, v.MaVe ASC
      LIMIT 50
    `;

    const [rows] = await db.execute(sql, [keyword, keyword, likeKeyword, likeKeyword, keyword, likeKeyword]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy thông tin vé hoặc khách hàng khớp với từ khóa "${keyword}"`
      });
    }

    // Lấy bắp nước đính kèm đơn nếu có
    const maDatVeList = [...new Set(rows.map(r => r.MaDatVe))];
    const placeholders = maDatVeList.map(() => '?').join(',');
    const [snacks] = await db.query(
      `SELECT mk.*, sp.TenSanPham, sp.LoaiSanPham, sp.HinhAnh
       FROM MUA_KEM mk
       JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
       WHERE mk.MaDatVe IN (${placeholders})`,
      maDatVeList
    );

    const snackMap = {};
    snacks.forEach(s => {
      if (!snackMap[s.MaDatVe]) snackMap[s.MaDatVe] = [];
      snackMap[s.MaDatVe].push({
        maSanPham: s.MaSanPham,
        tenSanPham: s.TenSanPham,
        loaiSanPham: s.LoaiSanPham,
        hinhAnh: s.HinhAnh,
        soLuong: s.SoLuong,
        donGiaTaiThoiDiemMua: parseFloat(s.DonGiaTaiThoiDiemMua),
        thanhTien: parseFloat(s.DonGiaTaiThoiDiemMua) * s.SoLuong,
        trangThaiNhan: s.TrangThaiNhan || 'Chưa nhận'
      });
    });

    // Đánh giá tính hợp lệ cho từng vé
    const tickets = rows.map(r => {
      let isCheckinValid = false;
      let reason = '';

      if (r.TrangThaiThanhToan !== 'Đã thanh toán') {
        isCheckinValid = false;
        reason = `Đơn đặt vé chưa thanh toán (Trạng thái: ${r.TrangThaiThanhToan})`;
      } else if (r.TrangThaiVe === 'Đã check-in') {
        isCheckinValid = false;
        reason = `Vé này đã được check-in lúc ${new Date(r.ThoiGianCheckIn).toLocaleString('vi-VN')} bởi ${r.TenNhanVienCheckIn || 'nhân viên rạp'}`;
      } else if (r.TrangThaiVe === 'Đã hủy') {
        isCheckinValid = false;
        reason = 'Vé này đã bị hủy, không thể sử dụng!';
      } else if (r.TrangThaiSuatChieu === 'Đã hủy') {
        isCheckinValid = false;
        reason = 'Suất chiếu của vé này đã bị hủy!';
      } else {
        isCheckinValid = true;
        reason = 'Vé hợp lệ, sẵn sàng check-in!';
      }

      return {
        maVe: r.MaVe,
        maDatVe: r.MaDatVe,
        maGhe: r.MaGhe,
        ghe: `${r.HangGhe}${r.SoGhe}`,
        hangGhe: r.HangGhe,
        soGhe: r.SoGhe,
        tenLoaiGhe: r.TenLoaiGhe,
        giaVe: parseFloat(r.GiaVeTaiThoiDiemMua),
        trangThaiVe: r.TrangThaiVe,
        khachHang: {
          maKhachHang: r.MaKhachHang,
          hoTen: r.TenKhachHang,
          soDienThoai: r.SdtKhachHang
        },
        phim: {
          maPhim: r.MaPhim,
          tenPhim: r.TenPhim,
          thoiLuong: r.ThoiLuong,
          gioiHanDoTuoi: r.GioiHanDoTuoi
        },
        suatChieu: {
          maSuatChieu: r.MaSuatChieu,
          thoiGianBatDau: r.ThoiGianBatDau,
          thoiGianKetThuc: r.ThoiGianKetThuc,
          phong: r.TenPhong,
          loaiPhong: r.LoaiPhong
        },
        rap: r.TenRap || 'PTIT Cinema Hà Đông',
        thoiGianDat: r.ThoiGianDat,
        trangThaiThanhToan: r.TrangThaiThanhToan,
        phuongThucThanhToan: r.PhuongThucThanhToan,
        tongTien: parseFloat(r.SoTienPhaiThanhToan || 0),
        soTienGiamGia: parseFloat(r.SoTienGiamGia || 0),
        tongSoTienGoc: parseFloat(r.TongSoTien || 0),
        tienBapNuoc: (snackMap[r.MaDatVe] || []).reduce((sum, s) => sum + (s.soLuong * s.donGiaTaiThoiDiemMua), 0),
        checkIn: r.MaCheckIn ? {
          maCheckIn: r.MaCheckIn,
          thoiGianCheckIn: r.ThoiGianCheckIn,
          nhanVien: r.TenNhanVienCheckIn
        } : null,
        validation: {
          isValid: isCheckinValid,
          reason
        },
        sanPham: snackMap[r.MaDatVe] || []
      };
    });

    res.json({
      success: true,
      data: {
        tickets,
        sanPham: snackMap[rows[0].MaDatVe] || []
      }
    });
  } catch (err) {
    console.error('Lỗi GET /api/check-in/tim-kiem:', err);
    res.status(500).json({ success: false, message: 'Lỗi tra cứu vé: ' + err.message });
  }
});

/**
 * GET /api/check-in/danh-sach-cho-duyet
 * Lấy danh sách toàn bộ vé & đơn đặt vé ĐÃ THANH TOÁN đang CHỜ SOÁT VÉ (Chưa check-in)
 * Để nhân viên/admin vào duyệt hoặc check-in ngay lập tức
 */
router.get('/danh-sach-cho-duyet', authenticateToken, requireRole('nhan_vien'), async (req, res) => {
  try {
    const { search } = req.query;
    let whereSql = `v.TrangThaiVe = 'Chưa sử dụng' 
      AND dv.TrangThaiThanhToan = 'Đã thanh toán' 
      AND NOT EXISTS (SELECT 1 FROM CHECK_IN ci WHERE ci.MaVe = v.MaVe)`;
    const params = [];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereSql += ` AND (
        kh.HoTen LIKE ? 
        OR kh.SoDienThoai LIKE ? 
        OR v.MaVe LIKE ? 
        OR dv.MaDatVe LIKE ? 
        OR p.TenPhim LIKE ?
      )`;
      params.push(q, q, q, q, q);
    }

    const sql = `
      SELECT 
        v.MaVe,
        v.MaDatVe,
        v.MaGhe,
        v.GiaVeTaiThoiDiemMua,
        v.TrangThaiVe,
        g.HangGhe,
        g.SoGhe,
        lg.TenLoaiGhe,
        dv.ThoiGianDat,
        dv.TongSoTien,
        dv.SoTienPhaiThanhToan,
        dv.TrangThaiThanhToan,
        dv.PhuongThucThanhToan,
        dv.TenRap,
        kh.MaKhachHang,
        kh.HoTen AS TenKhachHang,
        kh.SoDienThoai AS SdtKhachHang,
        kh.Email AS EmailKhachHang,
        sc.MaSuatChieu,
        sc.ThoiGianBatDau,
        sc.ThoiGianKetThuc,
        p.MaPhim,
        p.TenPhim,
        p.ThoiLuong,
        pc.TenPhong,
        pc.LoaiPhong
      FROM VE v
      JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
      JOIN KHACH_HANG kh ON kh.MaKhachHang = dv.MaKhachHang
      JOIN GHE g ON g.MaGhe = v.MaGhe
      JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
      JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
      WHERE ${whereSql}
      ORDER BY dv.ThoiGianDat DESC, v.MaVe DESC
      LIMIT 100
    `;

    const [rows] = await db.query(sql, params);

    // Truy vấn thông tin bắp nước kèm theo cho từng đơn đặt vé
    const orderIds = [...new Set(rows.map(r => r.MaDatVe))];
    const snacksByOrder = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const [snackRows] = await db.query(
        `SELECT mk.MaDatVe, mk.MaSanPham, mk.SoLuong, mk.DonGiaTaiThoiDiemMua, mk.TrangThaiNhan, sp.TenSanPham, sp.LoaiSanPham
         FROM MUA_KEM mk
         JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
         WHERE mk.MaDatVe IN (${placeholders})`,
        orderIds
      );
      for (const s of snackRows) {
        if (!snacksByOrder[s.MaDatVe]) snacksByOrder[s.MaDatVe] = [];
        snacksByOrder[s.MaDatVe].push({
          maSanPham: s.MaSanPham,
          tenSanPham: s.TenSanPham,
          loaiSanPham: s.LoaiSanPham,
          soLuong: s.SoLuong,
          donGia: parseFloat(s.DonGiaTaiThoiDiemMua),
          thanhTien: s.SoLuong * parseFloat(s.DonGiaTaiThoiDiemMua),
          trangThaiNhan: s.TrangThaiNhan
        });
      }
    }

    res.json({
      success: true,
      total: rows.length,
      data: rows.map(r => {
        const orderSnacks = snacksByOrder[r.MaDatVe] || [];
        const hasSnacks = orderSnacks.length > 0;
        const hasUnreceived = orderSnacks.some(s => s.trangThaiNhan === 'Chưa nhận');
        const allReceived = hasSnacks && !hasUnreceived;
        const tienBapNuoc = orderSnacks.reduce((sum, s) => sum + (s.thanhTien || 0), 0);

        return {
          maVe: r.MaVe,
          maDatVe: r.MaDatVe,
          ghe: `${r.HangGhe}${r.SoGhe}`,
          hangGhe: r.HangGhe,
          soGhe: r.SoGhe,
          tenLoaiGhe: r.TenLoaiGhe,
          giaVe: parseFloat(r.GiaVeTaiThoiDiemMua),
          tienVe: parseFloat(r.GiaVeTaiThoiDiemMua),
          tienBapNuoc: tienBapNuoc,
          tongTien: parseFloat(r.SoTienPhaiThanhToan),
          tongSoTienGoc: parseFloat(r.TongSoTien),
          soTienGiamGia: parseFloat(r.SoTienGiamGia || 0),
          trangThaiVe: r.TrangThaiVe,
          khachHang: {
            maKhachHang: r.MaKhachHang,
            hoTen: r.TenKhachHang,
            soDienThoai: r.SdtKhachHang,
            email: r.EmailKhachHang
          },
          phim: {
            maPhim: r.MaPhim,
            tenPhim: r.TenPhim,
            thoiLuong: r.ThoiLuong
          },
          suatChieu: {
            maSuatChieu: r.MaSuatChieu,
            thoiGianBatDau: r.ThoiGianBatDau,
            thoiGianKetThuc: r.ThoiGianKetThuc,
            phong: r.TenPhong,
            loaiPhong: r.LoaiPhong
          },
          rap: r.TenRap || 'PTIT Cinema Hà Đông',
          thoiGianDat: r.ThoiGianDat,
          phuongThucThanhToan: r.PhuongThucThanhToan,
          trangThaiThanhToan: r.TrangThaiThanhToan,
          sanPham: orderSnacks,
          coBapNuoc: hasSnacks,
          trangThaiBapNuoc: !hasSnacks ? 'Không có' : (allReceived ? 'Đã nhận' : 'Chưa nhận')
        };
      })
    });
  } catch (err) {
    console.error('Lỗi GET /api/check-in/danh-sach-cho-duyet:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/check-in/danh-sach-khach-hang
 * Lấy danh sách toàn bộ tài khoản khách hàng thành viên đã đăng ký
 */
router.get('/danh-sach-khach-hang', authenticateToken, requireRole('nhan_vien'), async (req, res) => {
  try {
    const { search } = req.query;
    let whereSql = '1=1';
    const params = [];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereSql += ` AND (kh.HoTen LIKE ? OR kh.SoDienThoai LIKE ? OR kh.Email LIKE ? OR kh.MaKhachHang LIKE ?)`;
      params.push(q, q, q, q);
    }

    const sql = `
      SELECT 
        kh.MaKhachHang,
        kh.HoTen,
        kh.SoDienThoai,
        kh.Email,
        kh.NgayDangKy,
        COUNT(DISTINCT dv.MaDatVe) AS SoDonDat,
        COUNT(v.MaVe) AS TongSoVe,
        COALESCE(SUM(dv.SoTienPhaiThanhToan), 0) AS TongChiTieu
      FROM KHACH_HANG kh
      LEFT JOIN DAT_VE dv ON dv.MaKhachHang = kh.MaKhachHang AND dv.TrangThaiThanhToan = 'Đã thanh toán'
      LEFT JOIN VE v ON v.MaDatVe = dv.MaDatVe AND v.TrangThaiVe <> 'Đã hủy'
      WHERE ${whereSql}
      GROUP BY kh.MaKhachHang
      ORDER BY kh.NgayDangKy DESC, kh.MaKhachHang DESC
      LIMIT 100
    `;

    const [rows] = await db.query(sql, params);

    res.json({
      success: true,
      total: rows.length,
      data: rows.map(r => ({
        maKhachHang: r.MaKhachHang,
        hoTen: r.HoTen,
        soDienThoai: r.SoDienThoai,
        email: r.Email,
        ngayDangKy: r.NgayDangKy,
        soDonDat: r.SoDonDat,
        tongSoVe: r.TongSoVe,
        tongChiTieu: parseFloat(r.TongChiTieu)
      }))
    });
  } catch (err) {
    console.error('Lỗi GET /api/check-in/danh-sach-khach-hang:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/check-in/xac-nhan
 * Xác nhận Check-in vé (An toàn với Transaction + Row Lock chống check-in đúp)
 * Yêu cầu quyền Nhân viên
 */
router.post('/xac-nhan', authenticateToken, requireRole('nhan_vien'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const maNhanVien = req.user.userId;
    const { maVe, giaoDoAn } = req.body;

    if (!maVe) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã vé cần check-in!' });
    }

    await conn.beginTransaction();

    // 1. Khóa và lấy thông tin vé
    const [veRows] = await conn.query(
      `SELECT v.*, dv.TrangThaiThanhToan, dv.TenRap, sc.TrangThai AS TrangThaiSuatChieu,
              p.TenPhim, g.HangGhe, g.SoGhe, pc.TenPhong
       FROM VE v
       JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
       JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
       JOIN PHIM p ON p.MaPhim = sc.MaPhim
       JOIN GHE g ON g.MaGhe = v.MaGhe
       JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
       WHERE v.MaVe = ?
       FOR UPDATE`,
      [maVe]
    );

    if (veRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé xem phim!' });
    }

    const ve = veRows[0];

    // 2. Kiểm tra điều kiện nghiệp vụ
    if (ve.TrangThaiThanhToan !== 'Đã thanh toán') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Vé thuộc đơn chưa thanh toán (Trạng thái: ${ve.TrangThaiThanhToan}). Không thể check-in!`
      });
    }

    if (ve.TrangThaiVe === 'Đã check-in') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vé này đã được check-in trước đó. Không thể sử dụng lại vé!'
      });
    }

    if (ve.TrangThaiVe === 'Đã hủy') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vé này đã bị hủy, không có hiệu lực check-in!'
      });
    }

    // 3. Kiểm tra xem đã có bản ghi trong CHECK_IN chưa
    const [ciCheck] = await conn.query(
      `SELECT * FROM CHECK_IN WHERE MaVe = ? FOR UPDATE`,
      [maVe]
    );
    if (ciCheck.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vé đã được ghi nhận check-in trong hệ thống!'
      });
    }

    // 4. Sinh MaCheckIn (VARCHAR(10))
    const [maxCI] = await conn.query(`
      SELECT MaCheckIn FROM CHECK_IN 
      WHERE MaCheckIn LIKE 'CI%' 
      ORDER BY CAST(SUBSTRING(MaCheckIn, 3) AS UNSIGNED) DESC 
      LIMIT 1 
      FOR UPDATE
    `);
    let nextCINum = 1;
    if (maxCI.length > 0) {
      const curNum = parseInt(maxCI[0].MaCheckIn.replace('CI', ''), 10);
      if (!isNaN(curNum)) nextCINum = curNum + 1;
    }
    const maCheckIn = 'CI' + String(nextCINum).padStart(3, '0');

    // 5. Ghi vào bảng CHECK_IN
    const thoiGianCheckIn = new Date();
    await conn.execute(
      `INSERT INTO CHECK_IN (MaCheckIn, MaVe, MaNhanVien, ThoiGianCheckIn)
       VALUES (?, ?, ?, ?)`,
      [maCheckIn, maVe, maNhanVien, thoiGianCheckIn]
    );

    // 6. Cập nhật trạng thái vé thành 'Đã check-in'
    await conn.execute(
      `UPDATE VE SET TrangThaiVe = 'Đã check-in' WHERE MaVe = ?`,
      [maVe]
    );

    // 7. Nếu chọn đồng thời giao đồ ăn / bắp nước
    let soMonDaGiao = 0;
    if (giaoDoAn) {
      const [mkRes] = await conn.execute(
        `UPDATE MUA_KEM SET TrangThaiNhan = 'Đã nhận' WHERE MaDatVe = ?`,
        [ve.MaDatVe]
      );
      soMonDaGiao = mkRes.affectedRows || 0;
    }

    await conn.commit();

    const responseMsg = (giaoDoAn && soMonDaGiao > 0)
      ? `🎉 Check-in thành công cho vé ${maVe} (Ghế ${ve.HangGhe}${ve.SoGhe} - ${ve.TenPhim}) & Đã xác nhận giao ${soMonDaGiao} món bắp nước!`
      : `🎉 Check-in thành công cho vé ${maVe} (Ghế ${ve.HangGhe}${ve.SoGhe} - ${ve.TenPhim})!`;

    res.json({
      success: true,
      message: responseMsg,
      data: {
        maCheckIn,
        maVe,
        maDatVe: ve.MaDatVe,
        ghe: `${ve.HangGhe}${ve.SoGhe}`,
        tenPhim: ve.TenPhim,
        tenPhong: ve.TenPhong,
        rap: ve.TenRap || 'PTIT Cinema Hà Đông',
        thoiGianCheckIn,
        nhanVien: req.user.hoTen,
        daGiaoDoAn: !!giaoDoAn,
        soMonDaGiao
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi POST /api/check-in/xac-nhan:', err);
    res.status(500).json({ success: false, message: 'Lỗi xử lý check-in: ' + err.message });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/check-in/xac-nhan-san-pham
 * Xác nhận khách đã nhận bắp nước tại quầy
 */
router.post('/xac-nhan-san-pham', authenticateToken, requireRole('nhan_vien'), async (req, res) => {
  try {
    const { maDatVe, maSanPham } = req.body;
    if (!maDatVe) {
      return res.status(400).json({ success: false, message: 'Thiếu mã đơn đặt vé!' });
    }

    let sql = `UPDATE MUA_KEM SET TrangThaiNhan = 'Đã nhận' WHERE MaDatVe = ?`;
    const params = [maDatVe];
    if (maSanPham) {
      sql += ` AND MaSanPham = ?`;
      params.push(maSanPham);
    }

    const [result] = await db.execute(sql, params);

    res.json({
      success: true,
      message: 'Đã cập nhật trạng thái nhận bắp nước thành công!',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error('Lỗi POST /api/check-in/xac-nhan-san-pham:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/check-in/danh-sach-hom-nay
 * Lấy danh sách lượt check-in hôm nay
 */
router.get('/danh-sach-hom-nay', authenticateToken, requireRole('nhan_vien'), async (req, res) => {
  try {
    const sql = `
      SELECT 
        ci.MaCheckIn,
        ci.ThoiGianCheckIn,
        v.MaVe,
        v.MaDatVe,
        g.HangGhe,
        g.SoGhe,
        lg.TenLoaiGhe,
        p.TenPhim,
        pc.TenPhong,
        dv.TenRap,
        kh.HoTen AS TenKhachHang,
        nv.HoTen AS TenNhanVien
      FROM CHECK_IN ci
      JOIN VE v ON v.MaVe = ci.MaVe
      JOIN GHE g ON g.MaGhe = v.MaGhe
      JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
      JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
      JOIN KHACH_HANG kh ON kh.MaKhachHang = dv.MaKhachHang
      JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
      JOIN NHAN_VIEN nv ON nv.MaNhanVien = ci.MaNhanVien
      WHERE DATE(ci.ThoiGianCheckIn) = CURDATE()
      ORDER BY ci.ThoiGianCheckIn DESC
      LIMIT 50
    `;

    const [rows] = await db.query(sql);

    // Truy vấn thông tin bắp nước kèm theo
    const orderIds = [...new Set(rows.map(r => r.MaDatVe))];
    const snacksByOrder = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const [snackRows] = await db.query(
        `SELECT mk.MaDatVe, mk.MaSanPham, mk.SoLuong, mk.DonGiaTaiThoiDiemMua, mk.TrangThaiNhan, sp.TenSanPham, sp.LoaiSanPham
         FROM MUA_KEM mk
         JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
         WHERE mk.MaDatVe IN (${placeholders})`,
        orderIds
      );
      for (const s of snackRows) {
        if (!snacksByOrder[s.MaDatVe]) snacksByOrder[s.MaDatVe] = [];
        snacksByOrder[s.MaDatVe].push({
          maSanPham: s.MaSanPham,
          tenSanPham: s.TenSanPham,
          loaiSanPham: s.LoaiSanPham,
          soLuong: s.SoLuong,
          trangThaiNhan: s.TrangThaiNhan
        });
      }
    }

    const data = rows.map(r => {
      const orderSnacks = snacksByOrder[r.MaDatVe] || [];
      const hasSnacks = orderSnacks.length > 0;
      const hasUnreceived = orderSnacks.some(s => s.trangThaiNhan === 'Chưa nhận');
      const allReceived = hasSnacks && !hasUnreceived;

      return {
        ...r,
        sanPham: orderSnacks,
        coBapNuoc: hasSnacks,
        trangThaiBapNuoc: !hasSnacks ? 'Không có' : (allReceived ? 'Đã nhận' : 'Chưa nhận')
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Lỗi GET /api/check-in/danh-sach-hom-nay:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
