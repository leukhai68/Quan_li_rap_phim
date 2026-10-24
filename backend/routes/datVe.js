const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * POST /api/dat-ve
 * Đặt vé xem phim an toàn với Transaction + Khóa chống đặt trùng ghế
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
      return res.status(404).json({ success: false, message: 'Suất chiếu không tồn tại!' });
    }

    const suatChieu = scRows[0];
    if (suatChieu.TrangThai === 'Đã hủy') {
      return res.status(400).json({ success: false, message: 'Suất chiếu này đã bị hủy!' });
    }

    // Bắt đầu Transaction
    await conn.beginTransaction();

    // 3. Khóa và kiểm tra ghế đã đặt trong cùng suất chiếu
    // Dùng placeholders an toàn
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
        message: `Ghế [${bookedSeatNames}] đã được khách hàng khác đặt. Vui lòng chọn ghế khác!`
      });
    }

    // 4. Lấy thông tin & đơn giá ghế từ database (tuyệt đối không tin tưởng giá từ Frontend)
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

    // 7. Sinh MaDatVe an toàn (VARCHAR(10))
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

    // 8. Chèn vào DAT_VE
    await conn.execute(
      `INSERT INTO DAT_VE (
        MaDatVe, MaKhachHang, MaSuatChieu, ThoiGianDat, 
        TongSoTien, SoTienGiamGia, SoTienPhaiThanhToan, 
        TrangThaiThanhToan, MaKhuyenMai, PhuongThucThanhToan, TenRap
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, 'Đã thanh toán', ?, ?, ?)`,
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

    // 9. Sinh và chèn vé vào VE (VARCHAR(12))
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

    // 10. Chèn bắp nước vào MUA_KEM
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
      message: 'Đặt vé và thanh toán thành công!',
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
        trangThaiThanhToan: 'Đã thanh toán',
        ve: createdTickets,
        sanPham: snackDetails
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi POST /api/dat-ve:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý đặt vé: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
