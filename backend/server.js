const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Cho phép tất cả origins (Live server 5500, 3000, 5173, etc.)
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files (Ảnh & Video Trailer) ────────────────────────────────────
app.use('/anh_video', express.static(path.join(__dirname, '../anh_video')));

// ─── Routes ─────────────────────────────────────────────────────────────────
const phimRouter      = require('./routes/phim');
const suatChieuRouter = require('./routes/suatChieu');
const baoCaoRouter    = require('./routes/baoCao');
const authRouter      = require('./routes/auth');
const sanPhamRouter   = require('./routes/sanPham');
const datVeRouter     = require('./routes/datVe');
const lichSuRouter    = require('./routes/lichSu');
const checkInRouter   = require('./routes/checkIn');
const nhanVienRouter  = require('./routes/nhanVien');

app.use('/api/phim',       phimRouter);
app.use('/api/suat-chieu', suatChieuRouter);
app.use('/api/bao-cao',    baoCaoRouter);
app.use('/api/auth',       authRouter);
app.use('/api/san-pham',   sanPhamRouter);
app.use('/api/dat-ve',     datVeRouter);
app.use('/api/lich-su',    lichSuRouter);
app.use('/api/check-in',   checkInRouter);
app.use('/api/nhan-vien',  nhanVienRouter);

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'PTIT Cinema API đang hoạt động 🎬',
    modules: ['Phim', 'Suất chiếu', 'Báo cáo', 'Auth', 'Sản phẩm', 'Đặt vé', 'Lịch sử', 'Check-in', 'Nhân viên'],
    timestamp: new Date()
  });
});

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} không tồn tại` });
});

// ─── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Lỗi server nội bộ', error: err.message });
});

// ─── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎬 PTIT Cinema Backend Server`);
  console.log(`🚀 Đang chạy tại: http://localhost:${PORT}`);
  console.log(`📋 API Health:   http://localhost:${PORT}/api/health`);
  console.log(`🎥 Phim API:     http://localhost:${PORT}/api/phim`);
  console.log(`🎟️  Suất chiếu:  http://localhost:${PORT}/api/suat-chieu`);
  console.log(`🍿 Bắp nước:     http://localhost:${PORT}/api/san-pham`);
  console.log(`🎫 Đặt vé:       http://localhost:${PORT}/api/dat-ve`);
  console.log(`📜 Lịch sử vé:   http://localhost:${PORT}/api/lich-su`);
  console.log(`✅ Check-in:     http://localhost:${PORT}/api/check-in/tim-kiem`);
  console.log(`👔 Nhân viên:    http://localhost:${PORT}/api/nhan-vien`);
  console.log(`📊 Báo cáo:     http://localhost:${PORT}/api/bao-cao/doanh-thu-phim\n`);
});
