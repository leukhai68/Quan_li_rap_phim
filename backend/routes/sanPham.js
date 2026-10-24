const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /api/san-pham
 * Lấy danh sách sản phẩm bắp nước & combo đang kinh doanh
 */
router.get('/', async (req, res) => {
  try {
    const { loai } = req.query;
    let sql = `
      SELECT MaSanPham, TenSanPham, LoaiSanPham, DonGia, SoLuongTonKho, TrangThaiKinhDoanh, HinhAnh
      FROM SAN_PHAM
      WHERE TrangThaiKinhDoanh = 'Đang bán'
    `;
    const params = [];
    if (loai) {
      sql += ` AND LoaiSanPham = ?`;
      params.push(loai);
    }
    sql += ` ORDER BY FIELD(LoaiSanPham, 'Combo', 'Bỏng', 'Nước uống', 'Khác'), DonGia ASC`;

    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Lỗi GET /api/san-pham:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
