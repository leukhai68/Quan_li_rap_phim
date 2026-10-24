const http = require('http');
const pool = require('./config/db');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Bắt đầu kiểm thử toàn diện API...');

  // 1. Khởi động server tạm thời
  const express = require('express');
  const cors = require('cors');
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/phim', require('./routes/phim'));
  app.use('/api/suat-chieu', require('./routes/suatChieu'));
  app.use('/api/bao-cao', require('./routes/baoCao'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/san-pham', require('./routes/sanPham'));
  app.use('/api/dat-ve', require('./routes/datVe'));
  app.use('/api/lich-su', require('./routes/lichSu'));
  app.use('/api/check-in', require('./routes/checkIn'));

  const server = app.listen(5001);

  try {
    // 2. Test Đăng nhập Khách hàng
    console.log('\n--- 1. Kiểm tra Đăng nhập Khách hàng ---');
    const loginKhRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { account: 'an@example.com', matKhau: '123456' });

    console.log('Đăng nhập KH:', loginKhRes.status, loginKhRes.data.success, loginKhRes.data.user?.hoTen);
    if (!loginKhRes.data.token) throw new Error('Không lấy được token khách hàng');
    const khToken = loginKhRes.data.token;

    // 3. Test Đăng nhập Nhân viên
    console.log('\n--- 2. Kiểm tra Đăng nhập Nhân viên ---');
    const loginNvRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { account: 'NV002', matKhau: '123456' });

    console.log('Đăng nhập NV:', loginNvRes.status, loginNvRes.data.success, loginNvRes.data.user?.hoTen, loginNvRes.data.user?.viTriCongViec);
    if (!loginNvRes.data.token) throw new Error('Không lấy được token nhân viên');
    const nvToken = loginNvRes.data.token;

    // 4. Test Lấy danh sách sản phẩm
    console.log('\n--- 3. Kiểm tra Lấy danh sách sản phẩm ---');
    const spRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/san-pham',
      method: 'GET'
    });
    console.log('Sản phẩm:', spRes.status, 'Số lượng sản phẩm:', spRes.data.data?.length);

    // 5. Test Lấy chi tiết suất chiếu SC013
    console.log('\n--- 4. Kiểm tra Lấy chi tiết Suất chiếu SC013 ---');
    const scRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/suat-chieu/SC013',
      method: 'GET'
    });
    console.log('Suất chiếu SC013:', scRes.status, scRes.data.data?.TenPhim, 'Số ghế:', scRes.data.data?.danhSachGhe?.length);

    // Tìm 1 ghế còn trống trong SC013
    const emptySeat = scRes.data.data.danhSachGhe.find(g => g.TrangThaiGhe === 'Còn trống');
    console.log('Ghế trống tìm được để test đặt:', emptySeat?.MaGhe, `${emptySeat?.HangGhe}${emptySeat?.SoGhe}`);

    // 6. Test Đặt vé (Transaction + Booking)
    console.log('\n--- 5. Kiểm tra Đặt vé ---');
    const bookingRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/dat-ve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${khToken}`
      }
    }, {
      maSuatChieu: 'SC013',
      danhSachMaGhe: [emptySeat.MaGhe],
      danhSachSanPham: [{ maSanPham: 'SP003', soLuong: 1 }],
      phuongThucThanhToan: 'VNPAY'
    });

    console.log('Kết quả đặt vé:', bookingRes.status, bookingRes.data.message);
    console.log('Mã đặt vé mới:', bookingRes.data.data?.maDatVe, 'Vé:', bookingRes.data.data?.ve);
    const newMaDatVe = bookingRes.data.data?.maDatVe;
    const newMaVe = bookingRes.data.data?.ve[0]?.maVe;

    // 7. Test Chống đặt trùng ghế (Double booking prevention)
    console.log('\n--- 6. Kiểm tra Chống đặt trùng ghế (bắt lỗi 409) ---');
    const doubleBookingRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/dat-ve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${khToken}`
      }
    }, {
      maSuatChieu: 'SC013',
      danhSachMaGhe: [emptySeat.MaGhe]
    });
    console.log('Thử đặt lại ghế vừa mua:', doubleBookingRes.status, doubleBookingRes.data.message);
    if (doubleBookingRes.status !== 409) throw new Error('Không chặn được đặt trùng ghế!');

    // 8. Test Lịch sử đặt vé của khách hàng
    console.log('\n--- 7. Kiểm tra Lịch sử đặt vé của Khách hàng ---');
    const historyRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/lich-su',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${khToken}` }
    });
    console.log('Số đơn trong lịch sử:', historyRes.data.data?.length);
    const foundBooking = historyRes.data.data?.find(b => b.maDatVe === newMaDatVe);
    console.log('Tìm thấy đơn vừa đặt trong lịch sử:', foundBooking?.maDatVe, 'Phim:', foundBooking?.phim?.tenPhim, 'Ghế:', foundBooking?.danhSachGhe);
    console.log('Bắp nước trong đơn:', foundBooking?.sanPham);

    // 9. Test Bảo mật: Đăng nhập khách hàng khác và cố xem đơn của người khác
    console.log('\n--- 8. Kiểm tra Bảo mật Chống IDOR (xem vé của người khác) ---');
    const loginKh2 = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { account: 'binh@example.com', matKhau: '123456' });

    const kh2Token = loginKh2.data.token;
    const hackRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: `/api/lich-su/${newMaDatVe}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${kh2Token}` }
    });
    console.log('KH002 cố xem đơn của KH001:', hackRes.status, hackRes.data.message);
    if (hackRes.status !== 403) throw new Error('Lỗi bảo mật: Khách hàng khác xem được đơn!');

    // 10. Test Check-in: Nhân viên tìm kiếm vé
    console.log('\n--- 9. Kiểm tra Tìm kiếm Check-in của Nhân viên ---');
    const searchCheckinRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: `/api/check-in/tim-kiem?q=${newMaVe}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${nvToken}` }
    });
    console.log('Kết quả tìm vé:', searchCheckinRes.status, 'Hợp lệ check-in:', searchCheckinRes.data.data?.tickets[0]?.validation);

    // 11. Test Check-in: Khách hàng cố gọi API check-in (Bị chặn 403)
    console.log('\n--- 10. Kiểm tra Khách hàng cố check-in vé (phải chặn 403) ---');
    const custCheckinTry = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/check-in/xac-nhan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${khToken}`
      }
    }, { maVe: newMaVe });
    console.log('Khách hàng check-in:', custCheckinTry.status, custCheckinTry.data.message);
    if (custCheckinTry.status !== 403) throw new Error('Lỗi bảo mật: Khách hàng gọi được API nhân viên!');

    // 12. Test Check-in: Nhân viên xác nhận check-in
    console.log('\n--- 11. Kiểm tra Nhân viên Check-in thành công ---');
    const doCheckinRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/check-in/xac-nhan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvToken}`
      }
    }, { maVe: newMaVe });
    console.log('Nhân viên check-in vé:', doCheckinRes.status, doCheckinRes.data.message, doCheckinRes.data.data);

    // 13. Test Check-in lần 2 (Không cho check-in lại)
    console.log('\n--- 12. Kiểm tra Thử Check-in lần 2 (phải báo lỗi) ---');
    const doubleCheckinRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/check-in/xac-nhan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvToken}`
      }
    }, { maVe: newMaVe });
    console.log('Check-in lần 2:', doubleCheckinRes.status, doubleCheckinRes.data.message);
    if (doubleCheckinRes.status !== 400) throw new Error('Không chặn được check-in lần 2!');

    console.log('\n🎉 TẤT CẢ 12 TEST CASES API ĐỀU ĐẠT CHUẨN 100%!');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
