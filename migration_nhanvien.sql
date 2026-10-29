-- =========================================================
-- MIGRATION: Thêm cột TrangThai cho bảng NHAN_VIEN
-- Mục đích: Hỗ trợ vô hiệu hóa nhân viên (đánh dấu "Nghỉ việc")
--           thay vì xóa dữ liệu khi nhân viên đã có lịch sử check-in.
-- An toàn: Tự kiểm tra nếu chưa có cột mới thêm, không gây lỗi khi chạy lại.
-- =========================================================

USE QuanLyRapChieuPhim_Final;

-- Kiểm tra xem cột TrangThai đã tồn tại trong bảng NHAN_VIEN chưa
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'NHAN_VIEN' 
      AND COLUMN_NAME = 'TrangThai'
);

-- Nếu chưa tồn tại (@col_exists = 0) thì thực thi ALTER TABLE
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE NHAN_VIEN ADD COLUMN TrangThai ENUM(\'Đang làm\', \'Nghỉ việc\') NOT NULL DEFAULT \'Đang làm\';', 
    'SELECT \'Cột TrangThai đã tồn tại trong bảng NHAN_VIEN, không cần thêm lại.\' AS ThongBao;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Đảm bảo tất cả nhân viên hiện có có giá trị 'Đang làm' nếu đang NULL
UPDATE NHAN_VIEN SET TrangThai = 'Đang làm' WHERE TrangThai IS NULL;

-- Đảm bảo có nhân viên NV009 (Dương Quang Huy - Nghỉ việc)
INSERT INTO NHAN_VIEN (MaNhanVien, HoTen, NgaySinh, SoDienThoai, DiaChi, NgayVaoLam, ViTriCongViec, LuongCoBan, MatKhau, TrangThai)
VALUES ('NV009', 'Dương Quang Huy', '2006-01-01', '0123456789', 'Thái Tử Hà Thành', '2026-10-26', 'Soát vé', 100000, '123456', 'Nghỉ việc')
ON DUPLICATE KEY UPDATE TrangThai = 'Nghỉ việc';

-- Xác nhận kết quả
SELECT 'Migration thành công!' AS KetQua;
SELECT MaNhanVien, HoTen, ViTriCongViec, TrangThai FROM NHAN_VIEN;
