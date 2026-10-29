const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ─── Middleware: Chỉ Quản lý / Quản trị viên mới được truy cập ─────────
async function requireAdmin(req, res, next) {
  try {
    let viTri = req.user.viTriCongViec;

    // Nếu token thiếu viTriCongViec, truy vấn trực tiếp từ MySQL
    if (!viTri) {
      const staffId = req.user.userId || req.user.maNhanVien;
      const [rows] = await db.execute(
        'SELECT ViTriCongViec, TrangThai FROM NHAN_VIEN WHERE MaNhanVien = ?',
        [staffId]
      );
      if (rows.length > 0) {
        viTri = rows[0].ViTriCongViec;
        req.user.viTriCongViec = viTri;
        if (rows[0].TrangThai === 'Nghỉ việc') {
          return res.status(403).json({
            success: false,
            message: 'Tài khoản nhân viên của bạn đã bị vô hiệu hóa!'
          });
        }
      }
    }

    const vtLower = (viTri || '').toLowerCase();
    const allowedPositions = ['quản lý', 'quản trị viên', 'chủ hệ thống', 'admin'];
    const hasAdminAccess = allowedPositions.some(p => vtLower.includes(p));

    if (!hasAdminAccess) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản Chủ hệ thống / Quản trị viên (Quản lý) mới có quyền quản lý nhân viên!'
      });
    }

    next();
  } catch (err) {
    console.error('Lỗi middleware requireAdmin:', err);
    res.status(500).json({ success: false, message: 'Lỗi xác thực quyền quản trị: ' + err.message });
  }
}

/**
 * GET /api/nhan-vien
 * Lấy danh sách nhân viên (có tìm kiếm, lọc theo vị trí và trạng thái, sắp xếp, phân trang)
 * Query params: search, viTri, trangThai, sortBy, sortOrder, page, limit
 */
router.get('/', authenticateToken, requireRole('nhan_vien'), requireAdmin, async (req, res) => {
  try {
    const {
      search = '',
      viTri = '',
      trangThai = '',
      sortBy = 'NgayVaoLam',
      sortOrder = 'DESC',
      page = 1,
      limit = 10
    } = req.query;

    // Xây dựng điều kiện WHERE động
    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push('(nv.MaNhanVien LIKE ? OR nv.HoTen LIKE ? OR nv.SoDienThoai LIKE ?)');
      const kw = `%${search.trim()}%`;
      params.push(kw, kw, kw);
    }

    if (viTri.trim()) {
      conditions.push('nv.ViTriCongViec = ?');
      params.push(viTri.trim());
    }

    if (trangThai.trim()) {
      conditions.push('nv.TrangThai = ?');
      params.push(trangThai.trim());
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Validate cột sắp xếp an toàn
    const allowedSorts = ['NgayVaoLam', 'ViTriCongViec', 'HoTen', 'MaNhanVien', 'LuongCoBan', 'NgaySinh'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'NgayVaoLam';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Đếm tổng số bản ghi thỏa điều kiện lọc
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM NHAN_VIEN nv ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Phân trang
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Lấy danh sách nhân viên
    const [rows] = await db.execute(
      `SELECT nv.MaNhanVien, nv.HoTen, nv.NgaySinh, nv.SoDienThoai, nv.DiaChi,
              nv.NgayVaoLam, nv.ViTriCongViec, nv.LuongCoBan,
              COALESCE(nv.TrangThai, 'Đang làm') AS TrangThai
       FROM NHAN_VIEN nv
       ${whereClause}
       ORDER BY nv.${safeSortBy} ${safeSortOrder}
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    // Lấy danh sách các vị trí công việc thực tế trong hệ thống
    const [positions] = await db.execute(
      `SELECT DISTINCT ViTriCongViec FROM NHAN_VIEN WHERE ViTriCongViec IS NOT NULL AND ViTriCongViec != '' ORDER BY ViTriCongViec`
    );

    // Thống kê KPI tổng quan toàn hệ thống (không bị ảnh hưởng bởi filter)
    const [kpiRows] = await db.execute(`
      SELECT 
        COUNT(*) AS totalAll,
        SUM(CASE WHEN COALESCE(TrangThai, 'Đang làm') = 'Đang làm' THEN 1 ELSE 0 END) AS totalActive,
        SUM(CASE WHEN TrangThai = 'Nghỉ việc' THEN 1 ELSE 0 END) AS totalInactive,
        COUNT(DISTINCT ViTriCongViec) AS totalPositions
      FROM NHAN_VIEN
    `);

    const kpi = {
      total: kpiRows[0].totalAll || 0,
      active: kpiRows[0].totalActive || 0,
      inactive: kpiRows[0].totalInactive || 0,
      positionsCount: kpiRows[0].totalPositions || 0
    };

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      },
      positions: positions.map(p => p.ViTriCongViec),
      kpi
    });
  } catch (err) {
    console.error('Lỗi GET /api/nhan-vien:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

/**
 * GET /api/nhan-vien/:id
 * Xem thông tin chi tiết một nhân viên
 */
router.get('/:id', authenticateToken, requireRole('nhan_vien'), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT nv.MaNhanVien, nv.HoTen, nv.NgaySinh, nv.SoDienThoai, nv.DiaChi,
              nv.NgayVaoLam, nv.ViTriCongViec, nv.LuongCoBan,
              COALESCE(nv.TrangThai, 'Đang làm') AS TrangThai
       FROM NHAN_VIEN nv
       WHERE nv.MaNhanVien = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên với mã: ' + id });
    }

    // Thống kê số lượt check-in của nhân viên
    const [checkInCount] = await db.execute(
      `SELECT COUNT(*) AS soLuotCheckIn FROM CHECK_IN WHERE MaNhanVien = ?`,
      [id]
    );

    // Lấy 15 bản ghi lịch sử soát vé gần nhất
    const [recentCheckins] = await db.execute(
      `SELECT ci.MaCheckIn, ci.ThoiGianCheckIn, ci.MaVe,
              v.MaDatVe, v.MaGhe,
              p.TenPhim, pc.TenPhong
       FROM CHECK_IN ci
       JOIN VE v ON v.MaVe = ci.MaVe
       JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
       JOIN SUAT_CHIEU sc ON sc.MaSuatChieu = dv.MaSuatChieu
       JOIN PHIM p ON p.MaPhim = sc.MaPhim
       JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong
       WHERE ci.MaNhanVien = ?
       ORDER BY ci.ThoiGianCheckIn DESC
       LIMIT 15`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        soLuotCheckIn: checkInCount[0].soLuotCheckIn,
        lichSuCheckIn: recentCheckins
      }
    });
  } catch (err) {
    console.error('Lỗi GET /api/nhan-vien/:id:', err);
    res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
  }
});

/**
 * POST /api/nhan-vien
 * Thêm nhân viên mới (tự động tạo mã NVxxx, kiểm tra trùng lặp, mật khẩu mặc định)
 */
router.post('/', authenticateToken, requireRole('nhan_vien'), requireAdmin, async (req, res) => {
  try {
    const { hoTen, ngaySinh, soDienThoai, diaChi, ngayVaoLam, viTriCongViec, luongCoBan, matKhau } = req.body;

    // 1. Kiểm tra trường bắt buộc
    if (!hoTen || !hoTen.trim()) {
      return res.status(400).json({ success: false, message: 'Họ tên nhân viên không được để trống!' });
    }
    if (!viTriCongViec || !viTriCongViec.trim()) {
      return res.status(400).json({ success: false, message: 'Vị trí công việc không được để trống!' });
    }
    if (luongCoBan === undefined || luongCoBan === null || isNaN(luongCoBan) || Number(luongCoBan) < 0) {
      return res.status(400).json({ success: false, message: 'Lương cơ bản phải là số không âm!' });
    }

    // 2. Kiểm tra số điện thoại
    if (soDienThoai && soDienThoai.trim()) {
      const phoneClean = soDienThoai.trim();
      const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
      if (!/^0[0-9]{9,10}$/.test(phoneClean) && !phoneRegex.test(phoneClean)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ! Vui lòng nhập SĐT Việt Nam (VD: 0912345678).' });
      }

      // Kiểm tra trùng SĐT trong hệ thống
      const [dupPhone] = await db.execute(
        `SELECT MaNhanVien, HoTen FROM NHAN_VIEN WHERE SoDienThoai = ?`,
        [phoneClean]
      );
      if (dupPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Số điện thoại "${phoneClean}" đã được sử dụng bởi nhân viên ${dupPhone[0].HoTen} (${dupPhone[0].MaNhanVien})!`
        });
      }
    }

    // 3. Kiểm tra ngày sinh (nhân viên phải đủ 18 tuổi)
    if (ngaySinh) {
      const birthDate = new Date(ngaySinh);
      const today = new Date();
      if (isNaN(birthDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Ngày sinh không hợp lệ!' });
      }
      const ageDiff = today.getFullYear() - birthDate.getFullYear();
      const hasHadBirthdayThisYear = (today.getMonth() > birthDate.getMonth()) ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
      const exactAge = hasHadBirthdayThisYear ? ageDiff : ageDiff - 1;

      if (exactAge < 18) {
        return res.status(400).json({ success: false, message: 'Nhân viên phải đủ 18 tuổi trở lên theo quy định lao động!' });
      }
      if (exactAge > 80) {
        return res.status(400).json({ success: false, message: 'Ngày sinh không hợp lệ (tuổi quá lớn)!' });
      }
    }

    // 4. Sinh mã nhân viên tự động theo quy tắc NVxxx
    const [maxRows] = await db.execute(`
      SELECT MaNhanVien 
      FROM NHAN_VIEN 
      WHERE MaNhanVien LIKE 'NV%' 
      ORDER BY CAST(SUBSTRING(MaNhanVien, 3) AS UNSIGNED) DESC 
      LIMIT 1
    `);

    let nextNum = 1;
    if (maxRows.length > 0) {
      const currentNum = parseInt(maxRows[0].MaNhanVien.replace('NV', ''), 10);
      if (!isNaN(currentNum)) nextNum = currentNum + 1;
    }
    const maNhanVien = 'NV' + String(nextNum).padStart(3, '0');

    // Mật khẩu mặc định là 123456 nếu không cung cấp
    const passToSave = (matKhau && matKhau.trim()) ? matKhau.trim() : '123456';
    const ngayVaoLamVal = ngayVaoLam ? ngayVaoLam : new Date().toISOString().split('T')[0];

    await db.execute(
      `INSERT INTO NHAN_VIEN (MaNhanVien, HoTen, NgaySinh, SoDienThoai, DiaChi, NgayVaoLam, ViTriCongViec, LuongCoBan, MatKhau, TrangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Đang làm')`,
      [
        maNhanVien,
        hoTen.trim(),
        ngaySinh || null,
        soDienThoai ? soDienThoai.trim() : null,
        diaChi ? diaChi.trim() : null,
        ngayVaoLamVal,
        viTriCongViec.trim(),
        Number(luongCoBan),
        passToSave
      ]
    );

    res.status(201).json({
      success: true,
      message: `Thêm nhân viên ${maNhanVien} - ${hoTen.trim()} thành công!`,
      data: { maNhanVien }
    });
  } catch (err) {
    console.error('Lỗi POST /api/nhan-vien:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi thêm nhân viên: ' + err.message });
  }
});

/**
 * PUT /api/nhan-vien/:id
 * Sửa thông tin nhân viên (không cho phép sửa mã nhân viên làm hỏng khóa ngoại)
 */
router.put('/:id', authenticateToken, requireRole('nhan_vien'), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { hoTen, ngaySinh, soDienThoai, diaChi, ngayVaoLam, viTriCongViec, luongCoBan, matKhau } = req.body;

    // Kiểm tra nhân viên tồn tại
    const [existing] = await db.execute(
      `SELECT MaNhanVien, HoTen, MatKhau FROM NHAN_VIEN WHERE MaNhanVien = ?`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên với mã: ' + id });
    }

    // Validate
    if (!hoTen || !hoTen.trim()) {
      return res.status(400).json({ success: false, message: 'Họ tên không được để trống!' });
    }
    if (!viTriCongViec || !viTriCongViec.trim()) {
      return res.status(400).json({ success: false, message: 'Vị trí công việc không được để trống!' });
    }
    if (luongCoBan === undefined || luongCoBan === null || isNaN(luongCoBan) || Number(luongCoBan) < 0) {
      return res.status(400).json({ success: false, message: 'Lương cơ bản phải là số không âm!' });
    }

    // Validate số điện thoại (tránh trùng với nhân viên khác)
    if (soDienThoai && soDienThoai.trim()) {
      const phoneClean = soDienThoai.trim();
      const [dupPhone] = await db.execute(
        `SELECT MaNhanVien, HoTen FROM NHAN_VIEN WHERE SoDienThoai = ? AND MaNhanVien != ?`,
        [phoneClean, id]
      );
      if (dupPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Số điện thoại "${phoneClean}" đã được sử dụng bởi nhân viên ${dupPhone[0].HoTen} (${dupPhone[0].MaNhanVien})!`
        });
      }
    }

    // Validate ngày sinh
    if (ngaySinh) {
      const birthDate = new Date(ngaySinh);
      const today = new Date();
      if (!isNaN(birthDate.getTime())) {
        const ageDiff = today.getFullYear() - birthDate.getFullYear();
        if (ageDiff < 18) {
          return res.status(400).json({ success: false, message: 'Nhân viên phải đủ 18 tuổi!' });
        }
      }
    }

    // Nếu có truyền mật khẩu mới thì cập nhật mật khẩu, không thì giữ nguyên
    let updateSql = `
      UPDATE NHAN_VIEN SET 
        HoTen = ?, NgaySinh = ?, SoDienThoai = ?, DiaChi = ?, 
        NgayVaoLam = ?, ViTriCongViec = ?, LuongCoBan = ?
    `;
    const updateParams = [
      hoTen.trim(),
      ngaySinh || null,
      soDienThoai ? soDienThoai.trim() : null,
      diaChi ? diaChi.trim() : null,
      ngayVaoLam || null,
      viTriCongViec.trim(),
      Number(luongCoBan)
    ];

    if (matKhau && matKhau.trim()) {
      updateSql += `, MatKhau = ?`;
      updateParams.push(matKhau.trim());
    }

    updateSql += ` WHERE MaNhanVien = ?`;
    updateParams.push(id);

    await db.execute(updateSql, updateParams);

    res.json({
      success: true,
      message: `Cập nhật thông tin nhân viên ${id} - ${hoTen.trim()} thành công!`
    });
  } catch (err) {
    console.error('Lỗi PUT /api/nhan-vien/:id:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật: ' + err.message });
  }
});

/**
 * DELETE /api/nhan-vien/:id
 * Xóa hoặc vô hiệu hóa nhân viên
 * - Kiểm tra nhân viên có tồn tại không
 * - Không cho phép tự xóa chính mình
 * - Kiểm tra dữ liệu liên quan trong bảng CHECK_IN
 * - Nếu có dữ liệu liên quan: Vô hiệu hóa (chuyển sang 'Nghỉ việc') để bảo toàn dữ liệu lịch sử
 * - Nếu không có dữ liệu liên quan: Xóa vĩnh viễn khỏi bảng NHAN_VIEN
 */
router.delete('/:id', authenticateToken, requireRole('nhan_vien'), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Kiểm tra tồn tại
    const [existing] = await db.execute(
      `SELECT MaNhanVien, HoTen, TrangThai FROM NHAN_VIEN WHERE MaNhanVien = ?`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên với mã: ' + id });
    }

    // 2. Không cho phép tự xóa/vô hiệu hóa tài khoản đang đăng nhập
    const currentStaffId = req.user.maNhanVien || req.user.userId;
    if (currentStaffId === id) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự xóa hoặc vô hiệu hóa tài khoản quản trị của chính mình!'
      });
    }

    // 3. Kiểm tra dữ liệu liên quan trong bảng CHECK_IN
    const [checkInRefs] = await db.execute(
      `SELECT COUNT(*) AS count FROM CHECK_IN WHERE MaNhanVien = ?`,
      [id]
    );

    const relatedCount = checkInRefs[0].count;

    if (relatedCount > 0) {
      // Có dữ liệu liên quan: Chuyển trạng thái sang "Nghỉ việc"
      await db.execute(
        `UPDATE NHAN_VIEN SET TrangThai = 'Nghỉ việc' WHERE MaNhanVien = ?`,
        [id]
      );

      return res.json({
        success: true,
        action: 'deactivated',
        message: `Nhân viên "${existing[0].HoTen}" (${id}) đã có ${relatedCount} lượt soát vé/check-in trong lịch sử. Hệ thống đã chuyển trạng thái sang "Nghỉ việc" và vô hiệu hóa tài khoản để bảo toàn toàn vẹn dữ liệu.`
      });
    } else {
      // Không có ràng buộc dữ liệu: Xóa hẳn
      await db.execute(
        `DELETE FROM NHAN_VIEN WHERE MaNhanVien = ?`,
        [id]
      );

      return res.json({
        success: true,
        action: 'deleted',
        message: `Đã xóa vĩnh viễn nhân viên "${existing[0].HoTen}" (${id}) khỏi hệ thống!`
      });
    }
  } catch (err) {
    console.error('Lỗi DELETE /api/nhan-vien/:id:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa nhân viên: ' + err.message });
  }
});

/**
 * PATCH /api/nhan-vien/:id/khoi-phuc
 * Khôi phục trạng thái "Đang làm" cho nhân viên đã nghỉ việc
 */
router.patch('/:id/khoi-phuc', authenticateToken, requireRole('nhan_vien'), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute(
      `SELECT MaNhanVien, HoTen, COALESCE(TrangThai, 'Đang làm') AS TrangThai 
       FROM NHAN_VIEN WHERE MaNhanVien = ?`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên!' });
    }

    if (existing[0].TrangThai === 'Đang làm') {
      return res.status(400).json({ success: false, message: 'Nhân viên này đang ở trạng thái "Đang làm", không cần khôi phục!' });
    }

    await db.execute(
      `UPDATE NHAN_VIEN SET TrangThai = 'Đang làm' WHERE MaNhanVien = ?`,
      [id]
    );

    res.json({
      success: true,
      message: `Đã khôi phục nhân viên "${existing[0].HoTen}" (${id}) về trạng thái "Đang làm"! Tài khoản có thể đăng nhập lại bình thường.`
    });
  } catch (err) {
    console.error('Lỗi PATCH /api/nhan-vien/:id/khoi-phuc:', err);
    res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
  }
});

module.exports = router;
