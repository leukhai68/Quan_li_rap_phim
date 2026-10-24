const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /api/bao-cao/doanh-thu-phim
 * Báo cáo doanh thu phim + số vé bán (vé + sản phẩm kèm)
 * Query: ?tuNgay=2026-10-01&denNgay=2026-10-31
 */
router.get('/doanh-thu-phim', async (req, res) => {
  try {
    const tuNgay = req.query.tuNgay || '2026-01-01';
    const denNgay = req.query.denNgay || '2026-12-31';

    const [rows] = await db.execute(`
      SELECT p.MaPhim, p.TenPhim,
             COALESCE(v.SoVeDaBan, 0) AS SoVeDaBan,
             COALESCE(v.DoanhThuVe, 0) AS DoanhThuVe,
             COALESCE(s.DoanhThuSanPham, 0) AS DoanhThuSanPham,
             COALESCE(v.DoanhThuVe, 0) + COALESCE(s.DoanhThuSanPham, 0) AS TongDoanhThu
      FROM PHIM p
      LEFT JOIN (
        SELECT sc.MaPhim,
               COUNT(v.MaVe) AS SoVeDaBan,
               SUM(v.GiaVeTaiThoiDiemMua) AS DoanhThuVe
        FROM SUAT_CHIEU sc
        JOIN DAT_VE dv ON dv.MaSuatChieu = sc.MaSuatChieu
        JOIN VE v ON v.MaDatVe = dv.MaDatVe
        WHERE dv.TrangThaiThanhToan = 'Đã thanh toán'
          AND v.TrangThaiVe <> 'Đã hủy'
          AND dv.ThoiGianDat >= ?
          AND dv.ThoiGianDat < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY sc.MaPhim
      ) v ON v.MaPhim = p.MaPhim
      LEFT JOIN (
        SELECT sc.MaPhim,
               SUM(mk.SoLuong * mk.DonGiaTaiThoiDiemMua) AS DoanhThuSanPham
        FROM SUAT_CHIEU sc
        JOIN DAT_VE dv ON dv.MaSuatChieu = sc.MaSuatChieu
        JOIN MUA_KEM mk ON mk.MaDatVe = dv.MaDatVe
        WHERE dv.TrangThaiThanhToan = 'Đã thanh toán'
          AND dv.ThoiGianDat >= ?
          AND dv.ThoiGianDat < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY sc.MaPhim
      ) s ON s.MaPhim = p.MaPhim
      ORDER BY TongDoanhThu DESC
    `, [tuNgay, denNgay, tuNgay, denNgay]);

    res.json({ success: true, tuNgay, denNgay, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/bao-cao/doanh-thu-phim:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/bao-cao/lap-day-ghe
 * Báo cáo tỉ lệ lấp đầy ghế theo suất chiếu
 */
router.get('/lap-day-ghe', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT sc.MaSuatChieu, p.TenPhim, pc.TenPhong,
             sc.ThoiGianBatDau, sc.ThoiGianKetThuc,
             g.TongSoGhe,
             COALESCE(v.SoVeDaBan, 0) AS SoVeDaBan,
             GREATEST(g.TongSoGhe - COALESCE(v.SoVeDaBan, 0), 0) AS SoGheConTrong,
             ROUND(100 * COALESCE(v.SoVeDaBan, 0) / NULLIF(g.TongSoGhe, 0), 2) AS TyLeLapDayPhanTram
      FROM SUAT_CHIEU sc
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
      JOIN (
        SELECT MaPhong, COUNT(*) AS TongSoGhe FROM GHE GROUP BY MaPhong
      ) g ON g.MaPhong = sc.MaPhong
      LEFT JOIN (
        SELECT dv.MaSuatChieu, COUNT(v.MaVe) AS SoVeDaBan
        FROM DAT_VE dv
        JOIN VE v ON v.MaDatVe = dv.MaDatVe
        WHERE dv.TrangThaiThanhToan = 'Đã thanh toán'
          AND v.TrangThaiVe <> 'Đã hủy'
        GROUP BY dv.MaSuatChieu
      ) v ON v.MaSuatChieu = sc.MaSuatChieu
      ORDER BY TyLeLapDayPhanTram DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/bao-cao/lap-day-ghe:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/bao-cao/top-khach-hang
 * Top 10 khách hàng chi tiêu nhiều nhất
 * Query: ?tuNgay=2026-10-01&denNgay=2026-10-31
 */
router.get('/top-khach-hang', async (req, res) => {
  try {
    const tuNgay = req.query.tuNgay || '2026-01-01';
    const denNgay = req.query.denNgay || '2026-12-31';

    const [rows] = await db.execute(`
      SELECT kh.MaKhachHang, kh.HoTen, kh.Email,
             COUNT(dv.MaDatVe) AS SoLanDatVe,
             SUM(dv.SoTienPhaiThanhToan) AS TongTienChiTieu
      FROM KHACH_HANG kh
      JOIN DAT_VE dv ON dv.MaKhachHang = kh.MaKhachHang
      WHERE dv.TrangThaiThanhToan = 'Đã thanh toán'
        AND dv.ThoiGianDat >= ?
        AND dv.ThoiGianDat < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY kh.MaKhachHang, kh.HoTen, kh.Email
      ORDER BY TongTienChiTieu DESC
      LIMIT 10
    `, [tuNgay, denNgay]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/bao-cao/top-khach-hang:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/bao-cao/doanh-thu-loai-ghe
 * Doanh thu theo loại ghế và phim
 */
router.get('/doanh-thu-loai-ghe', async (req, res) => {
  try {
    const tuNgay = req.query.tuNgay || '2026-01-01';
    const denNgay = req.query.denNgay || '2026-12-31';

    const [rows] = await db.execute(`
      SELECT lg.MaLoaiGhe, lg.TenLoaiGhe, p.MaPhim, p.TenPhim,
             COUNT(v.MaVe) AS SoVeDaBan,
             SUM(v.GiaVeTaiThoiDiemMua) AS DoanhThuVe
      FROM LOAI_GHE lg
      JOIN GHE g ON g.MaLoaiGhe = lg.MaLoaiGhe
      JOIN VE v ON v.MaGhe = g.MaGhe
      JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
      JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      WHERE dv.TrangThaiThanhToan = 'Đã thanh toán'
        AND v.TrangThaiVe <> 'Đã hủy'
        AND dv.ThoiGianDat >= ?
        AND dv.ThoiGianDat < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY lg.MaLoaiGhe, lg.TenLoaiGhe, p.MaPhim, p.TenPhim
      ORDER BY DoanhThuVe DESC
    `, [tuNgay, denNgay]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/bao-cao/doanh-thu-loai-ghe:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/bao-cao/san-pham-theo-thang
 * Doanh thu sản phẩm theo tháng
 */
router.get('/san-pham-theo-thang', async (req, res) => {
  try {
    const tuNgay = req.query.tuNgay || '2026-01-01';
    const denNgay = req.query.denNgay || '2026-12-31';

    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(dv.ThoiGianDat, '%Y-%m') AS Thang,
             sp.MaSanPham, sp.TenSanPham,
             SUM(mk.SoLuong) AS TongSoLuongDaBan,
             SUM(mk.SoLuong * mk.DonGiaTaiThoiDiemMua) AS DoanhThu
      FROM MUA_KEM mk
      JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
      JOIN DAT_VE dv ON dv.MaDatVe = mk.MaDatVe
      WHERE dv.TrangThaiThanhToan = 'Đã thanh toán'
        AND dv.ThoiGianDat >= ?
        AND dv.ThoiGianDat < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY DATE_FORMAT(dv.ThoiGianDat, '%Y-%m'), sp.MaSanPham, sp.TenSanPham
      ORDER BY Thang, DoanhThu DESC
    `, [tuNgay, denNgay]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/bao-cao/san-pham-theo-thang:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
