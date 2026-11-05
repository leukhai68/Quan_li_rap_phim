-- =========================================================
-- MIGRATION: Cập nhật bảng NHAN_VIEN
-- 1. Thêm cột TrangThai (nếu chưa có)
-- 2. Xóa cột TongLuong (nếu còn tồn tại) để bảng chỉ lưu LuongCoBan chuẩn hóa,
--    Tổng Lương sẽ được tính động từ LuongCoBan + (Số lượt check-in * 10.000đ).
-- =========================================================

USE QuanLyRapChieuPhim_Final;

-- 1. Kiểm tra & thêm cột TrangThai nếu chưa có
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'NHAN_VIEN' 
      AND COLUMN_NAME = 'TrangThai'
);

SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE NHAN_VIEN ADD COLUMN TrangThai ENUM(\'Đang làm\', \'Nghỉ việc\') NOT NULL DEFAULT \'Đang làm\';', 
    'SELECT \'Cột TrangThai đã tồn tại trong bảng NHAN_VIEN.\' AS ThongBao;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Kiểm tra & xóa cột TongLuong nếu còn tồn tại
SET @col_tongluong_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'NHAN_VIEN' 
      AND COLUMN_NAME = 'TongLuong'
);

SET @sql_tl := IF(@col_tongluong_exists > 0, 
    'ALTER TABLE NHAN_VIEN DROP COLUMN TongLuong;', 
    'SELECT \'Bảng NHAN_VIEN đã chuẩn hóa (không có cột TongLuong tĩnh).\' AS ThongBao;'
);

PREPARE stmt_tl FROM @sql_tl;
EXECUTE stmt_tl;
DEALLOCATE PREPARE stmt_tl;

-- 3. Đảm bảo tất cả nhân viên hiện có có giá trị 'Đang làm' nếu đang NULL
UPDATE NHAN_VIEN SET TrangThai = 'Đang làm' WHERE TrangThai IS NULL;

-- 4. Đảm bảo có nhân viên NV009 (Dương Quang Huy - Nghỉ việc)
INSERT INTO NHAN_VIEN (MaNhanVien, HoTen, NgaySinh, SoDienThoai, DiaChi, NgayVaoLam, ViTriCongViec, LuongCoBan, MatKhau, TrangThai)
VALUES ('NV009', 'Dương Quang Huy', '2006-01-01', '0123456789', 'Thái Tử Hà Thành', '2026-10-26', 'Soát vé', 100000, '123456', 'Nghỉ việc')
ON DUPLICATE KEY UPDATE TrangThai = 'Nghỉ việc';

-- Xác nhận kết quả
SELECT 'Migration chuẩn hóa NHAN_VIEN thành công!' AS KetQua;
SELECT MaNhanVien, HoTen, ViTriCongViec, LuongCoBan, TrangThai FROM NHAN_VIEN;
