const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /api/phim
 * Lấy danh sách phim kèm thể loại
 * Query: ?trangthai=Đang chiếu | Sắp chiếu | Ngừng chiếu
 */
router.get('/', async (req, res) => {
  try {
    const { trangthai } = req.query;

    let sql = `
      SELECT
        p.MaPhim,
        p.TenPhim,
        p.ThoiLuong,
        p.QuocGia,
        p.NgonNgu,
        p.GioiHanDoTuoi,
        p.NgayKhoiChieu,
        p.NgayKetThuc,
        p.TrangThai,
        p.Poster,
        p.Trailer,
        GROUP_CONCAT(tl.TenTheLoai ORDER BY tl.TenTheLoai SEPARATOR ', ') AS TheLoai
      FROM PHIM p
      LEFT JOIN PHIM_THE_LOAI ptl ON ptl.MaPhim = p.MaPhim
      LEFT JOIN THE_LOAI tl ON tl.MaTheLoai = ptl.MaTheLoai
    `;

    const params = [];
    if (trangthai) {
      sql += ` WHERE p.TrangThai = ?`;
      params.push(trangthai);
    }

    sql += ` GROUP BY p.MaPhim ORDER BY p.NgayKhoiChieu DESC`;

    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/phim:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/phim/:id
 * Lấy chi tiết một phim
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(`
      SELECT
        p.*,
        GROUP_CONCAT(tl.TenTheLoai ORDER BY tl.TenTheLoai SEPARATOR ', ') AS TheLoai
      FROM PHIM p
      LEFT JOIN PHIM_THE_LOAI ptl ON ptl.MaPhim = p.MaPhim
      LEFT JOIN THE_LOAI tl ON tl.MaTheLoai = ptl.MaTheLoai
      WHERE p.MaPhim = ?
      GROUP BY p.MaPhim
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Lỗi GET /api/phim/:id:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
