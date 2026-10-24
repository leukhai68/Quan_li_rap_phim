const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /api/suat-chieu
 * Lấy danh sách suất chiếu
 * Query: ?maPhim=P001 | ?ngay=2026-10-22 | ?maPhong=PC01
 */
router.get('/', async (req, res) => {
  try {
    const { maPhim, ngay, maPhong, trangthai } = req.query;

    let sql = `
      SELECT
        sc.MaSuatChieu,
        sc.ThoiGianBatDau,
        sc.ThoiGianKetThuc,
        sc.TrangThai,
        sc.MaPhim,
        p.TenPhim,
        p.ThoiLuong,
        p.GioiHanDoTuoi,
        p.Poster,
        p.Trailer,
        sc.MaPhong,
        pc.TenPhong,
        pc.LoaiPhong,
        pc.SucChuaToiDa,
        COALESCE(sold.SoVeDaBan, 0) AS SoVeDaBan,
        (pc.SucChuaToiDa - COALESCE(sold.SoVeDaBan, 0)) AS SoGheConTrong
      FROM SUAT_CHIEU sc
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
      LEFT JOIN (
        SELECT dv.MaSuatChieu, COUNT(v.MaVe) AS SoVeDaBan
        FROM DAT_VE dv
        JOIN VE v ON v.MaDatVe = dv.MaDatVe
        WHERE dv.TrangThaiThanhToan = 'Đã thanh toán'
          AND v.TrangThaiVe <> 'Đã hủy'
        GROUP BY dv.MaSuatChieu
      ) sold ON sold.MaSuatChieu = sc.MaSuatChieu
      WHERE 1=1
    `;

    const params = [];

    if (maPhim) {
      sql += ` AND sc.MaPhim = ?`;
      params.push(maPhim);
    }
    if (maPhong) {
      sql += ` AND sc.MaPhong = ?`;
      params.push(maPhong);
    }
    if (ngay) {
      sql += ` AND DATE(sc.ThoiGianBatDau) = ?`;
      params.push(ngay);
    }
    if (trangthai) {
      sql += ` AND sc.TrangThai = ?`;
      params.push(trangthai);
    }

    sql += ` ORDER BY sc.ThoiGianBatDau ASC`;

    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/suat-chieu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/suat-chieu/:id
 * Chi tiết suất chiếu + danh sách ghế
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[sc]] = await db.execute(`
      SELECT sc.*, p.TenPhim, p.ThoiLuong, p.GioiHanDoTuoi, p.Poster, p.Trailer,
             pc.TenPhong, pc.LoaiPhong
      FROM SUAT_CHIEU sc
      JOIN PHIM p ON p.MaPhim = sc.MaPhim
      JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
      WHERE sc.MaSuatChieu = ?
    `, [id]);

    if (!sc) return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu' });

    // Lấy danh sách ghế của phòng + trạng thái đã bán
    const [ghes] = await db.execute(`
      SELECT g.MaGhe, g.HangGhe, g.SoGhe, lg.TenLoaiGhe, lg.DonGiaCoBan,
             CASE WHEN v.MaVe IS NOT NULL THEN 'Đã bán' ELSE 'Còn trống' END AS TrangThaiGhe
      FROM GHE g
      JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
      LEFT JOIN VE v ON v.MaGhe = g.MaGhe
        AND v.MaDatVe IN (
          SELECT MaDatVe FROM DAT_VE
          WHERE MaSuatChieu = ? AND TrangThaiThanhToan <> 'Đã hủy'
        )
        AND v.TrangThaiVe <> 'Đã hủy'
      WHERE g.MaPhong = ?
      ORDER BY g.HangGhe, g.SoGhe
    `, [id, sc.MaPhong]);

    res.json({ success: true, data: { ...sc, danhSachGhe: ghes } });
  } catch (err) {
    console.error('Lỗi GET /api/suat-chieu/:id:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
