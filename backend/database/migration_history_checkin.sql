-- Migration: Bổ sung các cột phục vụ Quản lý Lịch sử Đặt vé & Check-in
USE QuanLyRapChieuPhim_Final;

-- 1. Thêm phương thức thanh toán vào bảng DAT_VE (nếu chưa có)
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'QuanLyRapChieuPhim_Final' 
      AND TABLE_NAME = 'DAT_VE' 
      AND COLUMN_NAME = 'PhuongThucThanhToan'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE DAT_VE ADD COLUMN PhuongThucThanhToan VARCHAR(50) NOT NULL DEFAULT \'VNPAY\';', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Thêm mật khẩu cho KHACH_HANG (nếu chưa có)
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'QuanLyRapChieuPhim_Final' 
      AND TABLE_NAME = 'KHACH_HANG' 
      AND COLUMN_NAME = 'MatKhau'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE KHACH_HANG ADD COLUMN MatKhau VARCHAR(255) NOT NULL DEFAULT \'123456\';', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Thêm mật khẩu cho NHAN_VIEN (nếu chưa có)
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'QuanLyRapChieuPhim_Final' 
      AND TABLE_NAME = 'NHAN_VIEN' 
      AND COLUMN_NAME = 'MatKhau'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE NHAN_VIEN ADD COLUMN MatKhau VARCHAR(255) NOT NULL DEFAULT \'123456\';', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Thêm trạng thái nhận hàng cho MUA_KEM (nếu chưa có)
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'QuanLyRapChieuPhim_Final' 
      AND TABLE_NAME = 'MUA_KEM' 
      AND COLUMN_NAME = 'TrangThaiNhan'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE MUA_KEM ADD COLUMN TrangThaiNhan ENUM(\'Chưa nhận\',\'Đã nhận\') NOT NULL DEFAULT \'Chưa nhận\';', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Thêm hình ảnh cho SAN_PHAM (nếu chưa có)
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'QuanLyRapChieuPhim_Final' 
      AND TABLE_NAME = 'SAN_PHAM' 
      AND COLUMN_NAME = 'HinhAnh'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE SAN_PHAM ADD COLUMN HinhAnh VARCHAR(255) NULL;', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Index tối ưu tìm kiếm theo khách hàng trên DAT_VE (nếu chưa có)
SET @idx_exists := (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'QuanLyRapChieuPhim_Final' 
      AND TABLE_NAME = 'DAT_VE' 
      AND INDEX_NAME = 'idx_datve_khachhang'
);
SET @sql := IF(@idx_exists = 0, 
    'CREATE INDEX idx_datve_khachhang ON DAT_VE(MaKhachHang);', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
