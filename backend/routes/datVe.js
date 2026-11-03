const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Tự động hủy các đơn 'Chưa thanh toán' đã quá hạn giữ chỗ (15 phút)
 * để giải phóng ghế cho khách hàng khác.
 */
async function autoCancelExpired(connOrDb) {
  try {
    await connOrDb.query(`
      UPDATE DAT_VE SET TrangThaiThanhToan = 'Đã hủy'
      WHERE TrangThaiThanhToan = 'Chưa thanh toán'
        AND ThoiGianDat < NOW() - INTERVAL 15 MINUTE
    `);
    await connOrDb.query(`
      UPDATE VE v
      JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
      SET v.TrangThaiVe = 'Đã hủy'
      WHERE dv.TrangThaiThanhToan = 'Đã hủy' AND v.TrangThaiVe = 'Chưa sử dụng'
    `);
  } catch (err) {
    console.error('Lỗi khi tự động hủy vé quá hạn:', err);
  }
}

/**
 * POST /api/dat-ve  hoặc  POST /api/bookings
 * Bước A: Tạo đơn đặt vé mới (Trạng thái: 'Chưa thanh toán', giữ ghế trong 15 phút)
 */
router.post('/', authenticateToken, requireRole('khach_hang'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const maKhachHang = req.user.userId;
    const {
      maSuatChieu,
      danhSachMaGhe,
      danhSachSanPham = [],
      phuongThucThanhToan = 'VNPAY',
      tenRap = 'PTIT Cinema Hà Đông',
      maKhuyenMai = null
    } = req.body;

    // 1. Kiểm tra dữ liệu đầu vào cơ bản
    if (!maSuatChieu) {
      return res.status(400).json({ success: false, message: 'Thiếu mã suất chiếu!' });
    }
    if (!Array.isArray(danhSachMaGhe) || danhSachMaGhe.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 ghế ngồi!' });
    }

    // Bắt đầu Transaction
    await conn.beginTransaction();

    // Dọn dẹp vé hết hạn trước khi kiểm tra ghế
    await autoCancelExpired(conn);

    // 2. Kiểm tra suất chiếu
    const [scRows] = await conn.execute(
      `SELECT sc.*, p.TenPhim, pc.TenPhong, pc.SucChuaToiDa 
       FROM SUAT_CHIEU sc 
       JOIN PHIM p ON p.MaPhim = sc.MaPhim 
       JOIN PHONG_CHIEU pc ON pc.MaPhong = sc.MaPhong 
       WHERE sc.MaSuatChieu = ?`,
      [maSuatChieu]
    );

    if (scRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Suất chiếu không tồn tại!' });
    }

    const suatChieu = scRows[0];
    if (suatChieu.TrangThai === 'Đã hủy') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Suất chiếu này đã bị hủy!' });
    }

    // 3. Khóa và kiểm tra ghế đã đặt trong cùng suất chiếu
    const seatPlaceholders = danhSachMaGhe.map(() => '?').join(',');
    const [alreadyBooked] = await conn.query(
      `SELECT v.MaGhe, g.HangGhe, g.SoGhe 
       FROM VE v
       JOIN DAT_VE dv ON dv.MaDatVe = v.MaDatVe
       JOIN GHE g ON g.MaGhe = v.MaGhe
       WHERE dv.MaSuatChieu = ?
         AND dv.TrangThaiThanhToan <> 'Đã hủy'
         AND v.TrangThaiVe <> 'Đã hủy'
         AND v.MaGhe IN (${seatPlaceholders})
       FOR UPDATE`,
      [maSuatChieu, ...danhSachMaGhe]
    );

    if (alreadyBooked.length > 0) {
      await conn.rollback();
      const bookedSeatNames = alreadyBooked.map(s => `${s.HangGhe}${s.SoGhe}`).join(', ');
      return res.status(409).json({
        success: false,
        message: `Ghế [${bookedSeatNames}] đã được khách hàng khác giữ chỗ hoặc đặt mua. Vui lòng chọn ghế khác!`
      });
    }

    // 4. Lấy thông tin & đơn giá ghế từ database (không tin tưởng giá từ frontend)
    const [seatRows] = await conn.query(
      `SELECT g.MaGhe, g.HangGhe, g.SoGhe, lg.TenLoaiGhe, lg.DonGiaCoBan
       FROM GHE g
       JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
       WHERE g.MaPhong = ? AND g.MaGhe IN (${seatPlaceholders})`,
      [suatChieu.MaPhong, ...danhSachMaGhe]
    );

    if (seatRows.length !== danhSachMaGhe.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Có ghế không hợp lệ hoặc không thuộc phòng chiếu này!'
      });
    }

    let tongTienVe = 0;
    const ticketDetails = seatRows.map(seat => {
      const gia = parseFloat(seat.DonGiaCoBan);
      tongTienVe += gia;
      return {
        maGhe: seat.MaGhe,
        hangGhe: seat.HangGhe,
        soGhe: seat.SoGhe,
        tenLoaiGhe: seat.TenLoaiGhe,
        giaVe: gia
      };
    });

    // 5. Kiểm tra và tính giá bắp nước từ database
    let tongTienSanPham = 0;
    const snackDetails = [];

    if (Array.isArray(danhSachSanPham) && danhSachSanPham.length > 0) {
      const validSnacks = danhSachSanPham.filter(s => s && s.maSanPham && s.soLuong > 0);
      if (validSnacks.length > 0) {
        const snackIds = validSnacks.map(s => s.maSanPham);
        const snackPlaceholders = snackIds.map(() => '?').join(',');

        const [spRows] = await conn.query(
          `SELECT MaSanPham, TenSanPham, LoaiSanPham, DonGia, SoLuongTonKho, TrangThaiKinhDoanh 
           FROM SAN_PHAM 
           WHERE MaSanPham IN (${snackPlaceholders})`,
          snackIds
        );

        const spMap = new Map(spRows.map(sp => [sp.MaSanPham, sp]));

        for (const item of validSnacks) {
          const sp = spMap.get(item.maSanPham);
          if (!sp) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: `Sản phẩm mã ${item.maSanPham} không tồn tại!` });
          }
          if (sp.TrangThaiKinhDoanh !== 'Đang bán') {
            await conn.rollback();
            return res.status(400).json({ success: false, message: `Sản phẩm ${sp.TenSanPham} hiện đã ngừng bán!` });
          }
          const donGia = parseFloat(sp.DonGia);
          const soLuong = parseInt(item.soLuong, 10);
          tongTienSanPham += donGia * soLuong;
          snackDetails.push({
            maSanPham: sp.MaSanPham,
            tenSanPham: sp.TenSanPham,
            loaiSanPham: sp.LoaiSanPham,
            soLuong,
            donGiaTaiThoiDiemMua: donGia,
            thanhTien: donGia * soLuong
          });
        }
      }
    }

    const tongSoTien = tongTienVe + tongTienSanPham;

    // 6. Xử lý khuyến mãi nếu có
    let soTienGiamGia = 0;
    let maKMValid = null;
    if (maKhuyenMai) {
      const [kmRows] = await conn.execute(
        `SELECT * FROM KHUYEN_MAI 
         WHERE MaKhuyenMai = ? 
           AND CURDATE() BETWEEN NgayBatDau AND NgayKetThuc`,
        [maKhuyenMai]
      );
      if (kmRows.length > 0) {
        const km = kmRows[0];
        if (tongSoTien >= parseFloat(km.GiaTriDonHangToiThieu)) {
          soTienGiamGia = Math.min(parseFloat(km.GiaTriGiamGia), tongSoTien);
          maKMValid = km.MaKhuyenMai;
        }
      }
    }

    const soTienPhaiThanhToan = tongSoTien - soTienGiamGia;

    // 7. Sinh MaDatVe (DV001, DV002...)
    const [dvMax] = await conn.query(`
      SELECT MaDatVe FROM DAT_VE 
      WHERE MaDatVe LIKE 'DV%' 
      ORDER BY CAST(SUBSTRING(MaDatVe, 3) AS UNSIGNED) DESC 
      LIMIT 1 
      FOR UPDATE
    `);
    let nextDVNum = 1;
    if (dvMax.length > 0) {
      const curNum = parseInt(dvMax[0].MaDatVe.replace('DV', ''), 10);
      if (!isNaN(curNum)) nextDVNum = curNum + 1;
    }
    const maDatVe = 'DV' + String(nextDVNum).padStart(3, '0');

    // 8. Chèn vào DAT_VE với TrangThaiThanhToan = 'Chưa thanh toán' (Giữ chỗ 15 phút)
    await conn.execute(
      `INSERT INTO DAT_VE (
        MaDatVe, MaKhachHang, MaSuatChieu, ThoiGianDat, 
        TongSoTien, SoTienGiamGia, SoTienPhaiThanhToan, 
        TrangThaiThanhToan, MaKhuyenMai, PhuongThucThanhToan, TenRap
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, 'Chưa thanh toán', ?, ?, ?)`,
      [
        maDatVe,
        maKhachHang,
        maSuatChieu,
        tongSoTien,
        soTienGiamGia,
        soTienPhaiThanhToan,
        maKMValid,
        phuongThucThanhToan,
        tenRap
      ]
    );

    // 9. Sinh và chèn vé vào VE (V001, V002...) với TrangThaiVe = 'Chưa sử dụng'
    const [veMax] = await conn.query(`
      SELECT MaVe FROM VE 
      WHERE MaVe LIKE 'V%' 
      ORDER BY CAST(SUBSTRING(MaVe, 2) AS UNSIGNED) DESC 
      LIMIT 1 
      FOR UPDATE
    `);
    let nextVeNum = 1;
    if (veMax.length > 0) {
      const curVe = parseInt(veMax[0].MaVe.replace('V', ''), 10);
      if (!isNaN(curVe)) nextVeNum = curVe + 1;
    }

    const createdTickets = [];
    for (const seat of ticketDetails) {
      const maVe = 'V' + String(nextVeNum++).padStart(3, '0');
      await conn.execute(
        `INSERT INTO VE (MaVe, MaDatVe, MaGhe, GiaVeTaiThoiDiemMua, TrangThaiVe)
         VALUES (?, ?, ?, ?, 'Chưa sử dụng')`,
        [maVe, maDatVe, seat.maGhe, seat.giaVe]
      );
      createdTickets.push({
        maVe,
        maGhe: seat.maGhe,
        hangGhe: seat.hangGhe,
        soGhe: seat.soGhe,
        tenLoaiGhe: seat.tenLoaiGhe,
        giaVe: seat.giaVe,
        trangThaiVe: 'Chưa sử dụng'
      });
    }

    // 10. Chèn bắp nước vào MUA_KEM nếu có
    for (const snack of snackDetails) {
      await conn.execute(
        `INSERT INTO MUA_KEM (MaDatVe, MaSanPham, SoLuong, DonGiaTaiThoiDiemMua, TrangThaiNhan)
         VALUES (?, ?, ?, ?, 'Chưa nhận')`,
        [maDatVe, snack.maSanPham, snack.soLuong, snack.donGiaTaiThoiDiemMua]
      );
    }

    // Hoàn tất Transaction
    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Tạo đơn đặt vé thành công! Vui lòng hoàn tất thanh toán trong 15 phút.',
      data: {
        maDatVe,
        phim: suatChieu.TenPhim,
        phong: suatChieu.TenPhong,
        rap: tenRap,
        thoiGianBatDau: suatChieu.ThoiGianBatDau,
        thoiGianKetThuc: suatChieu.ThoiGianKetThuc,
        tongTienVe,
        tongTienSanPham,
        tongSoTien,
        soTienGiamGia,
        soTienPhaiThanhToan,
        phuongThucThanhToan,
        trangThaiThanhToan: 'Chưa thanh toán',
        ve: createdTickets,
        sanPham: snackDetails
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi POST /api/dat-ve:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý tạo đơn đặt vé: ' + err.message });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/dat-ve/:maDatVe  hoặc  GET /api/bookings/:maDatVe
 * Bước B: Lấy chi tiết đơn đặt vé phục vụ trang Xác nhận thanh toán (payment.html)
 */
router.get('/:maDatVe', authenticateToken, async (req, res) => {
  try {
    const { maDatVe } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Tự động kiểm tra hủy đơn nếu quá 15 phút
    await autoCancelExpired(db);

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
        p.Poster,
        p.Trailer,
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

    // Kiểm tra quyền sở hữu đơn đặt vé (khách hàng chỉ xem được đơn của mình, nhân viên xem được hết)
    if (userRole !== 'nhan_vien' && dv.MaKhachHang !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập thông tin đơn đặt vé của người khác!'
      });
    }

    // Lấy danh sách ghế
    const [tickets] = await db.execute(
      `SELECT 
        v.MaVe,
        v.MaGhe,
        v.GiaVeTaiThoiDiemMua,
        v.TrangThaiVe,
        g.HangGhe,
        g.SoGhe,
        lg.TenLoaiGhe
       FROM VE v
       JOIN GHE g ON g.MaGhe = v.MaGhe
       JOIN LOAI_GHE lg ON lg.MaLoaiGhe = g.MaLoaiGhe
       WHERE v.MaDatVe = ?
       ORDER BY g.HangGhe, g.SoGhe`,
      [maDatVe]
    );

    // Lấy danh sách bắp nước
    const [snacks] = await db.execute(
      `SELECT 
        mk.MaSanPham,
        mk.SoLuong,
        mk.DonGiaTaiThoiDiemMua,
        (mk.SoLuong * mk.DonGiaTaiThoiDiemMua) AS ThanhTien,
        mk.TrangThaiNhan,
        sp.TenSanPham,
        sp.LoaiSanPham,
        sp.HinhAnh
       FROM MUA_KEM mk
       JOIN SAN_PHAM sp ON sp.MaSanPham = mk.MaSanPham
       WHERE mk.MaDatVe = ?`,
      [maDatVe]
    );

    // Tính thời gian đếm ngược (15 phút kể từ lúc đặt)
    const orderTime = new Date(dv.ThoiGianDat).getTime();
    const expireTime = orderTime + 15 * 60 * 1000;
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((expireTime - now) / 1000));
    const isExpired = dv.TrangThaiThanhToan === 'Chưa thanh toán' && remainingSeconds <= 0;

    const formattedTickets = tickets.map(t => ({
      maVe: t.MaVe,
      maGhe: t.MaGhe,
      ghe: `${t.HangGhe}${t.SoGhe}`,
      hangGhe: t.HangGhe,
      soGhe: t.SoGhe,
      tenLoaiGhe: t.TenLoaiGhe,
      giaVe: parseFloat(t.GiaVeTaiThoiDiemMua),
      trangThaiVe: t.TrangThaiVe
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
        thanhTien: parseFloat(s.ThanhTien),
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
        thoiGianHetHan: new Date(expireTime).toISOString(),
        conLaiGiay: remainingSeconds,
        daHetHan: isExpired,
        phim: {
          maPhim: dv.MaPhim,
          tenPhim: dv.TenPhim,
          thoiLuong: dv.ThoiLuong,
          gioiHanDoTuoi: dv.GioiHanDoTuoi,
          poster: dv.Poster,
          trailer: dv.Trailer
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
    console.error('Lỗi GET /api/dat-ve/:maDatVe:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết đơn đặt vé: ' + err.message });
  }
});

/**
 * PUT /api/dat-ve/:maDatVe/pay  hoặc  PUT /api/bookings/:maDatVe/pay
 * Bước B: Xác nhận thanh toán đơn đặt vé
 */
const handlePay = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { maDatVe } = req.params;
    const { phuongThucThanhToan = 'VNPAY' } = req.body;
    const userId = req.user.userId;

    await conn.beginTransaction();

    // Khóa bản ghi đơn đặt vé
    const [dvRows] = await conn.query(
      `SELECT * FROM DAT_VE WHERE MaDatVe = ? FOR UPDATE`,
      [maDatVe]
    );

    if (dvRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt vé!' });
    }

    const dv = dvRows[0];

    // Kiểm tra quyền
    if (dv.MaKhachHang !== userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thanh toán đơn này!' });
    }

    if (dv.TrangThaiThanhToan === 'Đã thanh toán') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Đơn đặt vé này đã được thanh toán trước đó!' });
    }

    if (dv.TrangThaiThanhToan === 'Đã hủy') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Đơn đặt vé này đã bị hủy, không thể thanh toán!' });
    }

    // Kiểm tra thời gian giữ chỗ (quá 15 phút)
    const orderTime = new Date(dv.ThoiGianDat).getTime();
    if (Date.now() - orderTime > 15 * 60 * 1000) {
      // Tự động hủy
      await conn.execute(`UPDATE DAT_VE SET TrangThaiThanhToan = 'Đã hủy' WHERE MaDatVe = ?`, [maDatVe]);
      await conn.execute(`UPDATE VE SET TrangThaiVe = 'Đã hủy' WHERE MaDatVe = ?`, [maDatVe]);
      await conn.commit();
      return res.status(400).json({
        success: false,
        message: 'Đã hết thời gian giữ chỗ (quá 15 phút). Đơn đặt vé đã bị hủy tự động, vui lòng chọn lại ghế!'
      });
    }

    // Cập nhật trạng thái thành Đã thanh toán và lưu phương thức thanh toán
    await conn.execute(
      `UPDATE DAT_VE 
       SET TrangThaiThanhToan = 'Đã thanh toán', 
           PhuongThucThanhToan = ?
       WHERE MaDatVe = ?`,
      [phuongThucThanhToan, maDatVe]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Xác nhận thanh toán thành công!',
      data: {
        maDatVe,
        trangThaiThanhToan: 'Đã thanh toán',
        phuongThucThanhToan
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi thanh toán vé:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xác nhận thanh toán: ' + err.message });
  } finally {
    conn.release();
  }
};

router.put('/:maDatVe/pay', authenticateToken, requireRole('khach_hang'), handlePay);
router.post('/:maDatVe/pay', authenticateToken, requireRole('khach_hang'), handlePay);

/**
 * PUT /api/dat-ve/:maDatVe/cancel  hoặc  PUT /api/bookings/:maDatVe/cancel
 * Hủy đơn đặt vé, giải phóng ghế ngồi
 */
const handleCancel = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { maDatVe } = req.params;
    const userId = req.user.userId;

    await conn.beginTransaction();

    const [dvRows] = await conn.query(
      `SELECT * FROM DAT_VE WHERE MaDatVe = ? FOR UPDATE`,
      [maDatVe]
    );

    if (dvRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt vé!' });
    }

    const dv = dvRows[0];

    if (dv.MaKhachHang !== userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn đặt vé này!' });
    }

    if (dv.TrangThaiThanhToan === 'Đã hủy') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Đơn đặt vé này đã được hủy trước đó!' });
    }

    // Kiểm tra xem vé đã check-in hay chưa
    const [checkedTickets] = await conn.query(
      `SELECT COUNT(*) AS checkedInCount FROM VE WHERE MaDatVe = ? AND TrangThaiVe = 'Đã check-in'`,
      [maDatVe]
    );

    if (checkedTickets[0].checkedInCount > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vé đã được check-in tại rạp, không thể hủy đơn đặt vé!'
      });
    }

    // Cập nhật DAT_VE và VE sang 'Đã hủy'
    await conn.execute(`UPDATE DAT_VE SET TrangThaiThanhToan = 'Đã hủy' WHERE MaDatVe = ?`, [maDatVe]);
    await conn.execute(`UPDATE VE SET TrangThaiVe = 'Đã hủy' WHERE MaDatVe = ?`, [maDatVe]);

    await conn.commit();

    res.json({
      success: true,
      message: 'Hủy đơn đặt vé thành công. Ghế ngồi đã được giải phóng cho khách hàng khác!'
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi hủy đơn đặt vé:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi hủy đơn đặt vé: ' + err.message });
  } finally {
    conn.release();
  }
};

router.put('/:maDatVe/cancel', authenticateToken, requireRole('khach_hang'), handleCancel);
router.post('/:maDatVe/cancel', authenticateToken, requireRole('khach_hang'), handleCancel);

module.exports = router;
