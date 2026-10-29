const pool = require('../config/db.js');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    // 1. DAT_VE: PhuongThucThanhToan & TenRap
    const [colsDV] = await pool.query("SHOW COLUMNS FROM DAT_VE LIKE 'PhuongThucThanhToan'");
    if (colsDV.length === 0) {
      await pool.query("ALTER TABLE DAT_VE ADD COLUMN PhuongThucThanhToan VARCHAR(50) NOT NULL DEFAULT 'VNPAY'");
      console.log('✅ Added PhuongThucThanhToan to DAT_VE');
    }

    const [colsTR] = await pool.query("SHOW COLUMNS FROM DAT_VE LIKE 'TenRap'");
    if (colsTR.length === 0) {
      await pool.query("ALTER TABLE DAT_VE ADD COLUMN TenRap VARCHAR(150) NOT NULL DEFAULT 'PTIT Cinema Hà Đông'");
      console.log('✅ Added TenRap to DAT_VE');
    }

    // 2. KHACH_HANG: MatKhau
    const [colsKH] = await pool.query("SHOW COLUMNS FROM KHACH_HANG LIKE 'MatKhau'");
    if (colsKH.length === 0) {
      await pool.query("ALTER TABLE KHACH_HANG ADD COLUMN MatKhau VARCHAR(255) NOT NULL DEFAULT '123456'");
      console.log('✅ Added MatKhau to KHACH_HANG');
    }

    // 3. NHAN_VIEN: MatKhau
    const [colsNV] = await pool.query("SHOW COLUMNS FROM NHAN_VIEN LIKE 'MatKhau'");
    if (colsNV.length === 0) {
      await pool.query("ALTER TABLE NHAN_VIEN ADD COLUMN MatKhau VARCHAR(255) NOT NULL DEFAULT '123456'");
      console.log('✅ Added MatKhau to NHAN_VIEN');
    }

    // 3b. NHAN_VIEN: TrangThai & NV009
    const [colsNVTrangThai] = await pool.query("SHOW COLUMNS FROM NHAN_VIEN LIKE 'TrangThai'");
    if (colsNVTrangThai.length === 0) {
      await pool.query("ALTER TABLE NHAN_VIEN ADD COLUMN TrangThai ENUM('Đang làm', 'Nghỉ việc') NOT NULL DEFAULT 'Đang làm'");
      console.log('✅ Added TrangThai to NHAN_VIEN');
    }

    // Ensure NV009 exists
    await pool.query(`
      INSERT INTO NHAN_VIEN (MaNhanVien, HoTen, NgaySinh, SoDienThoai, DiaChi, NgayVaoLam, ViTriCongViec, LuongCoBan, MatKhau, TrangThai)
      VALUES ('NV009', 'Dương Quang Huy', '2006-01-01', '0123456789', 'Thái Tử Hà Thành', '2026-10-26', 'Soát vé', 100000, '123456', 'Nghỉ việc')
      ON DUPLICATE KEY UPDATE TrangThai = 'Nghỉ việc'
    `);

    // 4. MUA_KEM: TrangThaiNhan
    const [colsMK] = await pool.query("SHOW COLUMNS FROM MUA_KEM LIKE 'TrangThaiNhan'");
    if (colsMK.length === 0) {
      await pool.query("ALTER TABLE MUA_KEM ADD COLUMN TrangThaiNhan ENUM('Chưa nhận','Đã nhận') NOT NULL DEFAULT 'Chưa nhận'");
      console.log('✅ Added TrangThaiNhan to MUA_KEM');
    }

    // 5. SAN_PHAM: HinhAnh
    const [colsSP] = await pool.query("SHOW COLUMNS FROM SAN_PHAM LIKE 'HinhAnh'");
    if (colsSP.length === 0) {
      await pool.query("ALTER TABLE SAN_PHAM ADD COLUMN HinhAnh VARCHAR(255) NULL");
      console.log('✅ Added HinhAnh to SAN_PHAM');
    }

    // 6. Update images for products if null
    await pool.query(`
      UPDATE SAN_PHAM SET HinhAnh = CASE 
        WHEN LoaiSanPham = 'Combo' THEN 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=300&auto=format&fit=crop'
        WHEN LoaiSanPham = 'Bỏng' THEN 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=300&auto=format&fit=crop'
        WHEN LoaiSanPham = 'Nước uống' THEN 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=300&auto=format&fit=crop'
      END
      WHERE HinhAnh IS NULL
    `);
    console.log('✅ Updated default product images');

    // 7. Index
    const [idx] = await pool.query("SHOW INDEX FROM DAT_VE WHERE Key_name = 'idx_datve_khachhang'");
    if (idx.length === 0) {
      await pool.query("CREATE INDEX idx_datve_khachhang ON DAT_VE(MaKhachHang)");
      console.log('✅ Created index idx_datve_khachhang');
    }

    console.log('🎉 Database migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
