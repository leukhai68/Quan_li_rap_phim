const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Đăng nhập cho Khách hàng hoặc Nhân viên
 */
router.post('/login', async (req, res) => {
  try {
    const { account, matKhau } = req.body;

    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email, Số điện thoại hoặc Mã tài khoản!'
      });
    }

    const trimmedAccount = account.trim();
    const inputPassword = (matKhau || '').trim();

    // 1. Kiểm tra trong bảng KHACH_HANG
    const [khRows] = await db.execute(
      `SELECT * FROM KHACH_HANG 
       WHERE Email = ? OR SoDienThoai = ? OR MaKhachHang = ? 
       LIMIT 1`,
      [trimmedAccount, trimmedAccount, trimmedAccount]
    );

    if (khRows.length > 0) {
      const kh = khRows[0];
      // Kiểm tra mật khẩu (nếu chưa đổi thì mật khẩu mặc định là 123456)
      const validPass = !kh.MatKhau || kh.MatKhau === inputPassword || (!inputPassword && kh.MatKhau === '123456');
      if (!validPass && kh.MatKhau !== inputPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu không chính xác!'
        });
      }

      const payload = {
        userId: kh.MaKhachHang,
        maKhachHang: kh.MaKhachHang,
        role: 'khach_hang',
        hoTen: kh.HoTen,
        email: kh.Email,
        soDienThoai: kh.SoDienThoai
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        token,
        user: payload
      });
    }

    // 2. Kiểm tra trong bảng NHAN_VIEN
    const [nvRows] = await db.execute(
      `SELECT * FROM NHAN_VIEN 
       WHERE MaNhanVien = ? OR SoDienThoai = ? 
       LIMIT 1`,
      [trimmedAccount, trimmedAccount]
    );

    if (nvRows.length > 0) {
      const nv = nvRows[0];
      const validPass = !nv.MatKhau || nv.MatKhau === inputPassword || (!inputPassword && nv.MatKhau === '123456');
      if (!validPass && nv.MatKhau !== inputPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu nhân viên không chính xác!'
        });
      }

      const payload = {
        userId: nv.MaNhanVien,
        maNhanVien: nv.MaNhanVien,
        role: 'nhan_vien',
        hoTen: nv.HoTen,
        soDienThoai: nv.SoDienThoai,
        viTriCongViec: nv.ViTriCongViec
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Đăng nhập thành công với quyền Nhân viên!',
        token,
        user: payload
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài khoản với thông tin đã cung cấp!'
    });
  } catch (err) {
    console.error('Lỗi POST /api/auth/login:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ: ' + err.message });
  }
});

/**
 * POST /api/auth/register
 * Đăng ký tài khoản khách hàng mới
 */
router.post('/register', async (req, res) => {
  try {
    const { hoTen, soDienThoai, email, matKhau, ngaySinh } = req.body;

    if (!hoTen || !soDienThoai || !email || !matKhau) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ họ tên, số điện thoại, email và mật khẩu!'
      });
    }

    // Kiểm tra trùng SĐT hoặc Email
    const [check] = await db.execute(
      `SELECT MaKhachHang, Email, SoDienThoai FROM KHACH_HANG 
       WHERE Email = ? OR SoDienThoai = ?`,
      [email.trim(), soDienThoai.trim()]
    );

    if (check.length > 0) {
      const duplicateField = check[0].Email === email.trim() ? 'Email' : 'Số điện thoại';
      return res.status(400).json({
        success: false,
        message: `${duplicateField} này đã được đăng ký trước đó. Vui lòng đăng nhập hoặc sử dụng thông tin khác!`
      });
    }

    // Sinh MaKhachHang mới (KHxxx)
    const [maxRows] = await db.execute(`
      SELECT MaKhachHang 
      FROM KHACH_HANG 
      WHERE MaKhachHang LIKE 'KH%' 
      ORDER BY CAST(SUBSTRING(MaKhachHang, 3) AS UNSIGNED) DESC 
      LIMIT 1
    `);

    let nextNum = 1;
    if (maxRows.length > 0) {
      const currentNum = parseInt(maxRows[0].MaKhachHang.replace('KH', ''), 10);
      if (!isNaN(currentNum)) nextNum = currentNum + 1;
    }
    const nextMaKH = 'KH' + String(nextNum).padStart(3, '0');

    const ngayDangKy = new Date().toISOString().split('T')[0];

    await db.execute(
      `INSERT INTO KHACH_HANG (MaKhachHang, HoTen, SoDienThoai, Email, NgaySinh, NgayDangKy, MatKhau)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nextMaKH,
        hoTen.trim(),
        soDienThoai.trim(),
        email.trim(),
        ngaySinh || null,
        ngayDangKy,
        matKhau.trim()
      ]
    );

    const payload = {
      userId: nextMaKH,
      maKhachHang: nextMaKH,
      role: 'khach_hang',
      hoTen: hoTen.trim(),
      email: email.trim(),
      soDienThoai: soDienThoai.trim()
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành viên thành công!',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Lỗi POST /api/auth/register:', err);
    res.status(500).json({ success: false, message: 'Lỗi đăng ký tài khoản: ' + err.message });
  }
});

/**
 * GET /api/auth/me
 * Lấy thông tin tài khoản hiện tại từ Token
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'khach_hang') {
      const [rows] = await db.execute(
        `SELECT MaKhachHang, HoTen, SoDienThoai, Email, NgaySinh, NgayDangKy 
         FROM KHACH_HANG WHERE MaKhachHang = ?`,
        [req.user.userId]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
      return res.json({ success: true, user: { ...rows[0], role: 'khach_hang' } });
    } else {
      const [rows] = await db.execute(
        `SELECT MaNhanVien, HoTen, SoDienThoai, DiaChi, ViTriCongViec 
         FROM NHAN_VIEN WHERE MaNhanVien = ?`,
        [req.user.userId]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
      return res.json({ success: true, user: { ...rows[0], role: 'nhan_vien' } });
    }
  } catch (err) {
    console.error('Lỗi GET /api/auth/me:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
