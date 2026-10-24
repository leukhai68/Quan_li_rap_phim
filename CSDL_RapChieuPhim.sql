
CREATE DATABASE IF NOT EXISTS QuanLyRapChieuPhim_Final
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QuanLyRapChieuPhim_Final;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS CHECK_IN;
DROP TABLE IF EXISTS MUA_KEM;
DROP TABLE IF EXISTS VE;
DROP TABLE IF EXISTS DAT_VE;
DROP TABLE IF EXISTS SUAT_CHIEU;
DROP TABLE IF EXISTS GHE;
DROP TABLE IF EXISTS LOAI_GHE;
DROP TABLE IF EXISTS PHIM_THE_LOAI;
DROP TABLE IF EXISTS KHUYEN_MAI;
DROP TABLE IF EXISTS NHAN_VIEN;
DROP TABLE IF EXISTS KHACH_HANG;
DROP TABLE IF EXISTS SAN_PHAM;
DROP TABLE IF EXISTS PHONG_CHIEU;
DROP TABLE IF EXISTS THE_LOAI;
DROP TABLE IF EXISTS PHIM;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. THE_LOAI
CREATE TABLE THE_LOAI (
    MaTheLoai VARCHAR(10) PRIMARY KEY,
    TenTheLoai VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2. PHIM
CREATE TABLE PHIM (
    MaPhim VARCHAR(10) PRIMARY KEY,
    TenPhim VARCHAR(200) NOT NULL,
    ThoiLuong INT NOT NULL,
    QuocGia VARCHAR(100),
    NgonNgu VARCHAR(100),
    GioiHanDoTuoi INT,
    NgayKhoiChieu DATE,
    NgayKetThuc DATE,
    TrangThai ENUM('Sắp chiếu','Đang chiếu','Ngừng chiếu') NOT NULL,
    Poster VARCHAR(500),
    Trailer VARCHAR(500),
    CHECK (ThoiLuong > 0),
    CHECK (GioiHanDoTuoi IS NULL OR GioiHanDoTuoi >= 0),
    CHECK (NgayKetThuc IS NULL OR NgayKhoiChieu IS NULL OR NgayKetThuc >= NgayKhoiChieu)
) ENGINE=InnoDB;

-- 3. PHIM_THE_LOAI: quan he nhieu-nhieu giua PHIM va THE_LOAI
CREATE TABLE PHIM_THE_LOAI (
    MaPhim VARCHAR(10) NOT NULL,
    MaTheLoai VARCHAR(10) NOT NULL,
    PRIMARY KEY (MaPhim, MaTheLoai),
    FOREIGN KEY (MaPhim) REFERENCES PHIM(MaPhim),
    FOREIGN KEY (MaTheLoai) REFERENCES THE_LOAI(MaTheLoai)
) ENGINE=InnoDB;

-- 4. PHONG_CHIEU
CREATE TABLE PHONG_CHIEU (
    MaPhong VARCHAR(10) PRIMARY KEY,
    TenPhong VARCHAR(100) NOT NULL,
    LoaiPhong VARCHAR(50),
    SucChuaToiDa INT NOT NULL,
    CHECK (SucChuaToiDa > 0)
) ENGINE=InnoDB;

-- 5. LOAI_GHE
CREATE TABLE LOAI_GHE (
    MaLoaiGhe VARCHAR(10) PRIMARY KEY,
    TenLoaiGhe ENUM('Thường','VIP','Đôi') NOT NULL UNIQUE,
    DonGiaCoBan DECIMAL(12,2) NOT NULL DEFAULT 0,
    CHECK (DonGiaCoBan >= 0)
) ENGINE=InnoDB;

-- 6. GHE
CREATE TABLE GHE (
    MaGhe VARCHAR(10) PRIMARY KEY,
    HangGhe VARCHAR(5) NOT NULL,
    SoGhe INT NOT NULL,
    MaPhong VARCHAR(10) NOT NULL,
    MaLoaiGhe VARCHAR(10) NOT NULL,
    UNIQUE (MaPhong, HangGhe, SoGhe),
    CHECK (SoGhe > 0),
    FOREIGN KEY (MaPhong) REFERENCES PHONG_CHIEU(MaPhong),
    FOREIGN KEY (MaLoaiGhe) REFERENCES LOAI_GHE(MaLoaiGhe)
) ENGINE=InnoDB;

-- 7. SUAT_CHIEU
CREATE TABLE SUAT_CHIEU (
    MaSuatChieu VARCHAR(10) PRIMARY KEY,
    ThoiGianBatDau DATETIME NOT NULL,
    ThoiGianKetThuc DATETIME NOT NULL,
    TrangThai ENUM('Sắp chiếu','Đang chiếu','Đã chiếu','Đã hủy') NOT NULL,
    MaPhim VARCHAR(10) NOT NULL,
    MaPhong VARCHAR(10) NOT NULL,
    CHECK (ThoiGianKetThuc > ThoiGianBatDau),
    FOREIGN KEY (MaPhim) REFERENCES PHIM(MaPhim),
    FOREIGN KEY (MaPhong) REFERENCES PHONG_CHIEU(MaPhong),
    INDEX idx_suatchieu_phong_thoigian (MaPhong, ThoiGianBatDau, ThoiGianKetThuc)
) ENGINE=InnoDB;

-- 8. KHACH_HANG
CREATE TABLE KHACH_HANG (
    MaKhachHang VARCHAR(10) PRIMARY KEY,
    HoTen VARCHAR(150) NOT NULL,
    SoDienThoai VARCHAR(20) UNIQUE,
    Email VARCHAR(150) UNIQUE,
    NgaySinh DATE,
    NgayDangKy DATE NOT NULL
) ENGINE=InnoDB;

-- 9. NHAN_VIEN
CREATE TABLE NHAN_VIEN (
    MaNhanVien VARCHAR(10) PRIMARY KEY,
    HoTen VARCHAR(150) NOT NULL,
    NgaySinh DATE,
    SoDienThoai VARCHAR(20),
    DiaChi VARCHAR(255),
    NgayVaoLam DATE,
    ViTriCongViec VARCHAR(100),
    LuongCoBan DECIMAL(12,2) NOT NULL,
    CHECK (LuongCoBan >= 0)
) ENGINE=InnoDB;

-- 10. KHUYEN_MAI
-- GiaTriGiamGia la so tien giam co dinh cho moi don dat ve.
CREATE TABLE KHUYEN_MAI (
    MaKhuyenMai VARCHAR(10) PRIMARY KEY,
    TenKhuyenMai VARCHAR(150) NOT NULL,
    GiaTriGiamGia DECIMAL(12,2) NOT NULL,
    GiaTriDonHangToiThieu DECIMAL(12,2) NOT NULL DEFAULT 0,
    NgayBatDau DATE NOT NULL,
    NgayKetThuc DATE NOT NULL,
    SoLuotSuDungToiDa INT NOT NULL,
    CHECK (GiaTriGiamGia >= 0),
    CHECK (GiaTriDonHangToiThieu >= 0),
    CHECK (SoLuotSuDungToiDa >= 0),
    CHECK (NgayKetThuc >= NgayBatDau)
) ENGINE=InnoDB;

-- 11. SAN_PHAM
CREATE TABLE SAN_PHAM (
    MaSanPham VARCHAR(10) PRIMARY KEY,
    TenSanPham VARCHAR(150) NOT NULL,
    LoaiSanPham ENUM('Bỏng','Nước uống','Combo','Khác') NOT NULL,
    DonGia DECIMAL(12,2) NOT NULL,
    SoLuongTonKho INT NOT NULL DEFAULT 0,
    TrangThaiKinhDoanh ENUM('Đang bán','Ngừng bán') NOT NULL DEFAULT 'Đang bán',
    CHECK (DonGia >= 0),
    CHECK (SoLuongTonKho >= 0)
) ENGINE=InnoDB;

-- 12. DAT_VE
-- Moi dat ve gan voi dung mot khach hang va mot suat chieu.
CREATE TABLE DAT_VE (
    MaDatVe VARCHAR(10) PRIMARY KEY,
    MaKhachHang VARCHAR(10) NOT NULL,
    MaSuatChieu VARCHAR(10) NOT NULL,
    ThoiGianDat DATETIME NOT NULL,
    TongSoTien DECIMAL(12,2) NOT NULL DEFAULT 0,
    SoTienGiamGia DECIMAL(12,2) NOT NULL DEFAULT 0,
    SoTienPhaiThanhToan DECIMAL(12,2) NOT NULL DEFAULT 0,
    TrangThaiThanhToan ENUM('Chưa thanh toán','Đã thanh toán','Đã hủy') NOT NULL,
    MaKhuyenMai VARCHAR(10) NULL,
    CHECK (TongSoTien >= 0),
    CHECK (SoTienGiamGia >= 0),
    CHECK (SoTienPhaiThanhToan >= 0),
    CHECK (SoTienGiamGia <= TongSoTien),
    CHECK (SoTienPhaiThanhToan = TongSoTien - SoTienGiamGia),
    FOREIGN KEY (MaKhachHang) REFERENCES KHACH_HANG(MaKhachHang),
    FOREIGN KEY (MaSuatChieu) REFERENCES SUAT_CHIEU(MaSuatChieu),
    FOREIGN KEY (MaKhuyenMai) REFERENCES KHUYEN_MAI(MaKhuyenMai),
    INDEX idx_datve_thoigian_trangthai (ThoiGianDat, TrangThaiThanhToan)
) ENGINE=InnoDB;

-- 13. VE
-- Suat chieu cua ve duoc xac dinh qua DAT_VE.MaSuatChieu.
-- UNIQUE(MaDatVe, MaGhe) tranh trung ghe trong cung don.
-- Trigger can bo sung de tranh ban cung ghe cho hai don cua cung suat.
CREATE TABLE VE (
    MaVe VARCHAR(12) PRIMARY KEY,
    MaDatVe VARCHAR(10) NOT NULL,
    MaGhe VARCHAR(10) NOT NULL,
    GiaVeTaiThoiDiemMua DECIMAL(12,2) NOT NULL,
    TrangThaiVe ENUM('Chưa sử dụng','Đã check-in','Đã hủy') NOT NULL DEFAULT 'Chưa sử dụng',
    CHECK (GiaVeTaiThoiDiemMua >= 0),
    UNIQUE (MaDatVe, MaGhe),
    FOREIGN KEY (MaDatVe) REFERENCES DAT_VE(MaDatVe),
    FOREIGN KEY (MaGhe) REFERENCES GHE(MaGhe)
) ENGINE=InnoDB;

-- 14. MUA_KEM
-- Luu gia va so luong tai thoi diem mua.
CREATE TABLE MUA_KEM (
    MaDatVe VARCHAR(10) NOT NULL,
    MaSanPham VARCHAR(10) NOT NULL,
    SoLuong INT NOT NULL,
    DonGiaTaiThoiDiemMua DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (MaDatVe, MaSanPham),
    CHECK (SoLuong > 0),
    CHECK (DonGiaTaiThoiDiemMua >= 0),
    FOREIGN KEY (MaDatVe) REFERENCES DAT_VE(MaDatVe),
    FOREIGN KEY (MaSanPham) REFERENCES SAN_PHAM(MaSanPham)
) ENGINE=InnoDB;

-- 15. CHECK_IN
-- UNIQUE(MaVe) dam bao moi ve chi co toi da mot ban ghi check-in.
-- Dieu kien ve da thanh toan/chua huy can duoc kiem tra bang trigger/transaction.
CREATE TABLE CHECK_IN (
    MaCheckIn VARCHAR(10) PRIMARY KEY,
    MaVe VARCHAR(12) NOT NULL UNIQUE,
    MaNhanVien VARCHAR(10) NOT NULL,
    ThoiGianCheckIn DATETIME NOT NULL,
    FOREIGN KEY (MaVe) REFERENCES VE(MaVe),
    FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien),
    INDEX idx_checkin_thoigian_nhanvien (ThoiGianCheckIn, MaNhanVien)
) ENGINE=InnoDB;

-- =========================================================
-- DU LIEU MAU DA GOP: du lieu goc va du lieu mo rong trong cung INSERT
-- Moi bang chi co mot lenh INSERT, khong can chay phan bo sung rieng.
-- =========================================================

INSERT INTO THE_LOAI (MaTheLoai, TenTheLoai) VALUES
('TL01','Tâm lý'),
('TL02','Hài'),
('TL03','Gia đình'),
('TL04','Hành động'),
('TL05','Hoạt hình'),
('TL06','Khoa học viễn tưởng'),
('TL07','Kinh dị'),
('TL08','Phiêu lưu'),
('TL09','Tình cảm'),
('TL10','Tài liệu');

INSERT INTO PHIM (MaPhim, TenPhim, ThoiLuong, QuocGia, NgonNgu, GioiHanDoTuoi, NgayKhoiChieu, NgayKetThuc, TrangThai, Poster, Trailer) VALUES
('P001', 'Digger', 128, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-10-02', '2026-11-30', 'Đang chiếu', 'anh_video/digger.jpg', 'anh_video/DIGGER ｜ Official Trailer.mp4'),
('P002', 'Tee Yod: Quỷ Ăn Tạng 4: Hổ Tinh', 111, 'Thái Lan', 'Phụ đề Việt', 18, '2026-10-09', '2026-11-30', 'Đang chiếu', 'anh_video/quyantang4.jpg', 'anh_video/[OFFICIAL TEASER] “ธี่หยด： สมิงเขาขวาง”.mp4'),
('P003', 'Street Fighter', 115, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-10-16', '2026-11-30', 'Đang chiếu', 'anh_video/streetfighter.jpg', 'anh_video/Street Fighter ｜ New Trailer (2026 Movie).mp4'),
('P004', 'Người Mẹ Khác', 93, 'Hoa Kỳ', 'Phụ đề Việt', 18, '2026-10-09', '2026-11-20', 'Đang chiếu', 'anh_video/incidentsaruondthehouse.webp', 'anh_video/Other Mommy ｜ Official Trailer.mp4'),
('P005', 'SPY x FAMILY Code: White', 110, 'Nhật Bản', 'Lồng tiếng Việt', 13, '2026-10-23', '2026-12-15', 'Đang chiếu', 'anh_video/official-poster-for-spy-x-family-code-white-v0-qz0gobx6ezpa1.webp', 'anh_video/SPY x FAMILY CODE： WHITE - Official Trailer (HD).mp4'),
('P006', 'Quyết Cua Anh Này', 115, 'Thái Lan', 'Phụ đề Việt', 13, '2026-10-02', '2026-11-15', 'Đang chiếu', 'anh_video/teaser-poster_1.jpg', 'anh_video/QUYẾT CUA ANH NÀY ｜ Official Trailer ｜ KHỞI CHIẾU 02.10.2026.mp4'),
('P007', 'Khóa Chặt Cửa Nào Suzume', 122, 'Nhật Bản', 'Phụ đề Việt', 0, '2026-10-02', '2026-11-10', 'Đang chiếu', 'anh_video/Suzume_no_Tojimari.jpg', 'anh_video/Suzume Trailer 1 (2023).mp4'),
('P008', 'Shaun the Sheep: Quái Lạ Ghé Nhà', 88, 'Anh', 'Lồng tiếng Việt', 0, '2026-10-16', '2026-11-30', 'Đang chiếu', 'anh_video/Shaun_the_Sheep_Farmageddon_poster_pillars.jpg', 'anh_video/Shaun the Sheep Movie 2： Farmageddon – Official Trailer.mp4'),
('P009', 'Chuyện Công Chúa Kaguya', 137, 'Nhật Bản', 'Phụ đề Việt', 0, '2026-10-09', '2026-11-15', 'Đang chiếu', 'anh_video/The_Tale_of_the_Princess_Kaguya_(poster).jpg', 'anh_video/The Tale Of The Princess Kaguya - Official Trailer.mp4'),
('P010', 'Mẹ Mìn', 99, 'Việt Nam', 'Tiếng Việt', 16, '2026-10-23', '2026-12-05', 'Đang chiếu', 'anh_video/ME-MIN-POSTER-CONG-VIEN-KTHUOC-SOCIAL-1.jpg', 'anh_video/MẸ MÌN ｜ TEASER TRAILER ｜ SUẤT CHIẾU ĐẶC BIỆT TỪ 18H NGÀY 20.10.2026.mp4'),
('P011', 'Trấn Yểm', 96, 'Việt Nam', 'Tiếng Việt', 18, '2026-10-30', '2026-12-15', 'Sắp chiếu', 'anh_video/tran-yem-500_1778642449288.jpg', 'anh_video/Xóm nhỏ ｜ Trailer Official ｜ Phim ĐỜI SỐNG ĐÔ THỊ ｜ Phim VTV Mới Nhất 2026.mp4'),
('P012', 'Clayface', 120, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-11-06', '2026-12-31', 'Sắp chiếu', 'anh_video/MV5BMjNlMjM4NTAtYjE5YS00ZGYyLWEyMTYtNjFlMmIxZDEzYjhhXkEyXkFqcGc@._V1_.jpg', 'anh_video/Clayface ｜ Official Teaser.mp4'),
('P013', 'Toy Story 5', 100, 'Hoa Kỳ', 'Lồng tiếng Việt', 0, '2026-11-20', '2027-01-15', 'Sắp chiếu', 'anh_video/target_payoff_poster_united_kingdom_d19f38c5.jpeg', 'anh_video/Toy Story 5 ｜ Teaser Trailer ｜ In Theaters June 19.mp4'),
('P014', 'Dune: Part Three', 165, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-12-18', '2027-02-28', 'Sắp chiếu', 'anh_video/MV5BYjk1NjgwZDMtYzI5OS00Y2Q4LWI1NmItNTE5OGU2NDVmMTAxXkEyXkFqcGc@._V1_.jpg', 'anh_video/Dune： Part Three ｜ Official Teaser Trailer.mp4'),
('P015', 'Avengers: Doomsday', 180, 'Hoa Kỳ', 'Phụ đề Việt', 13, '2026-12-18', '2027-02-28', 'Sắp chiếu', 'anh_video/sLYCyO58UvBuBtbHTQjPCCgJ4dG.webp', 'anh_video/AVENGERS 5： DOOMSDAY Official “Steve Rogers Meets New Avengers” Teaser Trailer (2026).mp4'),
('P016', 'Án Mạng Karaoke', 96, 'Việt Nam', 'Tiếng Việt', 16, '2026-09-01', '2026-10-15', 'Ngừng chiếu', 'anh_video/images.jpg', 'anh_video/ÁN MẠNG KARAOKE ｜ MAIN TRAILER ｜ DỰ KIẾN KHỞI CHIẾU 02.10.2026.mp4');

INSERT INTO PHIM_THE_LOAI (MaPhim, MaTheLoai) VALUES
('P001','TL04'),
('P001','TL08'),
('P002','TL07'),
('P003','TL04'),
('P003','TL08'),
('P004','TL07'),
('P004','TL01'),
('P005','TL05'),
('P005','TL02'),
('P005','TL04'),
('P006','TL02'),
('P006','TL09'),
('P007','TL05'),
('P007','TL08'),
('P008','TL05'),
('P008','TL03'),
('P009','TL05'),
('P009','TL01'),
('P010','TL07'),
('P010','TL01'),
('P011','TL07'),
('P012','TL04'),
('P012','TL06'),
('P013','TL05'),
('P013','TL03'),
('P014','TL06'),
('P014','TL08'),
('P015','TL04'),
('P015','TL06'),
('P016','TL07'),
('P016','TL02');
('P016','TL08');

INSERT INTO PHONG_CHIEU (MaPhong, TenPhong, LoaiPhong, SucChuaToiDa) VALUES
('PC01','Phòng 1','2D',100),
('PC02','Phòng 2','3D',50),
('PC03','Phòng 3','2D',60),
('PC04','Phòng 4','3D',80),
('PC05','Phòng 5','IMAX',120),
('PC06','Phòng 6','2D',40);

INSERT INTO LOAI_GHE (MaLoaiGhe, TenLoaiGhe, DonGiaCoBan) VALUES
('LG01','Thường',75000),
('LG02','VIP',100000),
('LG03','Đôi',130000);

INSERT INTO GHE (MaGhe, HangGhe, SoGhe, MaPhong, MaLoaiGhe) VALUES
('G001','A',1,'PC01','LG01'),
('G002','A',2,'PC01','LG02'),
('G003','A',3,'PC01','LG01'),
('G004','A',4,'PC01','LG02'),
('G005','B',1,'PC01','LG01'),
('G006','B',2,'PC01','LG01'),
('G007','A',1,'PC02','LG02'),
('G008','A',2,'PC02','LG01'),
('G01C01','C',1,'PC01','LG01'),
('G01C02','C',2,'PC01','LG01'),
('G01C03','C',3,'PC01','LG01'),
('G01C04','C',4,'PC01','LG02'),
('G01C05','C',5,'PC01','LG02'),
('G01C06','C',6,'PC01','LG01'),
('G01C07','C',7,'PC01','LG01'),
('G01C08','C',8,'PC01','LG01'),
('G01D01','D',1,'PC01','LG01'),
('G01D02','D',2,'PC01','LG01'),
('G01D03','D',3,'PC01','LG01'),
('G01D04','D',4,'PC01','LG01'),
('G01D05','D',5,'PC01','LG01'),
('G01D06','D',6,'PC01','LG01'),
('G01D07','D',7,'PC01','LG01'),
('G01D08','D',8,'PC01','LG01'),
('G01E01','E',1,'PC01','LG01'),
('G01E02','E',2,'PC01','LG01'),
('G01E03','E',3,'PC01','LG01'),
('G01E04','E',4,'PC01','LG01'),
('G01E05','E',5,'PC01','LG01'),
('G01E06','E',6,'PC01','LG01'),
('G01E07','E',7,'PC01','LG01'),
('G01E08','E',8,'PC01','LG03'),
('G02B01','B',1,'PC02','LG01'),
('G02B02','B',2,'PC02','LG01'),
('G02B03','B',3,'PC02','LG01'),
('G02B04','B',4,'PC02','LG02'),
('G02B05','B',5,'PC02','LG02'),
('G02B06','B',6,'PC02','LG01'),
('G02C01','C',1,'PC02','LG01'),
('G02C02','C',2,'PC02','LG01'),
('G02C03','C',3,'PC02','LG01'),
('G02C04','C',4,'PC02','LG02'),
('G02C05','C',5,'PC02','LG02'),
('G02C06','C',6,'PC02','LG01'),
('G02D01','D',1,'PC02','LG01'),
('G02D02','D',2,'PC02','LG01'),
('G02D03','D',3,'PC02','LG01'),
('G02D04','D',4,'PC02','LG01'),
('G02D05','D',5,'PC02','LG01'),
('G02D06','D',6,'PC02','LG03'),
('G03A01','A',1,'PC03','LG01'),
('G03A02','A',2,'PC03','LG01'),
('G03A03','A',3,'PC03','LG01'),
('G03A04','A',4,'PC03','LG01'),
('G03A05','A',5,'PC03','LG01'),
('G03A06','A',6,'PC03','LG01'),
('G03A07','A',7,'PC03','LG01'),
('G03A08','A',8,'PC03','LG01'),
('G03B01','B',1,'PC03','LG01'),
('G03B02','B',2,'PC03','LG01'),
('G03B03','B',3,'PC03','LG01'),
('G03B04','B',4,'PC03','LG02'),
('G03B05','B',5,'PC03','LG02'),
('G03B06','B',6,'PC03','LG01'),
('G03B07','B',7,'PC03','LG01'),
('G03B08','B',8,'PC03','LG01'),
('G03C01','C',1,'PC03','LG01'),
('G03C02','C',2,'PC03','LG01'),
('G03C03','C',3,'PC03','LG01'),
('G03C04','C',4,'PC03','LG02'),
('G03C05','C',5,'PC03','LG02'),
('G03C06','C',6,'PC03','LG01'),
('G03C07','C',7,'PC03','LG01'),
('G03C08','C',8,'PC03','LG01'),
('G03D01','D',1,'PC03','LG01'),
('G03D02','D',2,'PC03','LG01'),
('G03D03','D',3,'PC03','LG01'),
('G03D04','D',4,'PC03','LG01'),
('G03D05','D',5,'PC03','LG01'),
('G03D06','D',6,'PC03','LG01'),
('G03D07','D',7,'PC03','LG01'),
('G03D08','D',8,'PC03','LG03'),
('G04A01','A',1,'PC04','LG01'),
('G04A02','A',2,'PC04','LG01'),
('G04A03','A',3,'PC04','LG01'),
('G04A04','A',4,'PC04','LG01'),
('G04A05','A',5,'PC04','LG01'),
('G04A06','A',6,'PC04','LG01'),
('G04A07','A',7,'PC04','LG01'),
('G04A08','A',8,'PC04','LG01'),
('G04B01','B',1,'PC04','LG01'),
('G04B02','B',2,'PC04','LG01'),
('G04B03','B',3,'PC04','LG01'),
('G04B04','B',4,'PC04','LG02'),
('G04B05','B',5,'PC04','LG02'),
('G04B06','B',6,'PC04','LG01'),
('G04B07','B',7,'PC04','LG01'),
('G04B08','B',8,'PC04','LG01'),
('G04C01','C',1,'PC04','LG01'),
('G04C02','C',2,'PC04','LG01'),
('G04C03','C',3,'PC04','LG01'),
('G04C04','C',4,'PC04','LG02'),
('G04C05','C',5,'PC04','LG02'),
('G04C06','C',6,'PC04','LG01'),
('G04C07','C',7,'PC04','LG01'),
('G04C08','C',8,'PC04','LG01'),
('G04D01','D',1,'PC04','LG01'),
('G04D02','D',2,'PC04','LG01'),
('G04D03','D',3,'PC04','LG01'),
('G04D04','D',4,'PC04','LG01'),
('G04D05','D',5,'PC04','LG01'),
('G04D06','D',6,'PC04','LG01'),
('G04D07','D',7,'PC04','LG01'),
('G04D08','D',8,'PC04','LG03'),
('G05A01','A',1,'PC05','LG01'),
('G05A02','A',2,'PC05','LG01'),
('G05A03','A',3,'PC05','LG01'),
('G05A04','A',4,'PC05','LG01'),
('G05A05','A',5,'PC05','LG01'),
('G05A06','A',6,'PC05','LG01'),
('G05A07','A',7,'PC05','LG01'),
('G05A08','A',8,'PC05','LG01'),
('G05A09','A',9,'PC05','LG01'),
('G05A10','A',10,'PC05','LG01'),
('G05B01','B',1,'PC05','LG01'),
('G05B02','B',2,'PC05','LG01'),
('G05B03','B',3,'PC05','LG01'),
('G05B04','B',4,'PC05','LG02'),
('G05B05','B',5,'PC05','LG02'),
('G05B06','B',6,'PC05','LG01'),
('G05B07','B',7,'PC05','LG01'),
('G05B08','B',8,'PC05','LG01'),
('G05B09','B',9,'PC05','LG01'),
('G05B10','B',10,'PC05','LG01'),
('G05C01','C',1,'PC05','LG01'),
('G05C02','C',2,'PC05','LG01'),
('G05C03','C',3,'PC05','LG01'),
('G05C04','C',4,'PC05','LG02'),
('G05C05','C',5,'PC05','LG02'),
('G05C06','C',6,'PC05','LG01'),
('G05C07','C',7,'PC05','LG01'),
('G05C08','C',8,'PC05','LG01'),
('G05C09','C',9,'PC05','LG01'),
('G05C10','C',10,'PC05','LG01'),
('G05D01','D',1,'PC05','LG01'),
('G05D02','D',2,'PC05','LG01'),
('G05D03','D',3,'PC05','LG01'),
('G05D04','D',4,'PC05','LG01'),
('G05D05','D',5,'PC05','LG01'),
('G05D06','D',6,'PC05','LG01'),
('G05D07','D',7,'PC05','LG01'),
('G05D08','D',8,'PC05','LG01'),
('G05D09','D',9,'PC05','LG01'),
('G05D10','D',10,'PC05','LG01'),
('G05E01','E',1,'PC05','LG01'),
('G05E02','E',2,'PC05','LG01'),
('G05E03','E',3,'PC05','LG01'),
('G05E04','E',4,'PC05','LG01'),
('G05E05','E',5,'PC05','LG01'),
('G05E06','E',6,'PC05','LG01'),
('G05E07','E',7,'PC05','LG01'),
('G05E08','E',8,'PC05','LG01'),
('G05E09','E',9,'PC05','LG01'),
('G05E10','E',10,'PC05','LG03'),
('G06A01','A',1,'PC06','LG01'),
('G06A02','A',2,'PC06','LG01'),
('G06A03','A',3,'PC06','LG01'),
('G06A04','A',4,'PC06','LG01'),
('G06A05','A',5,'PC06','LG01'),
('G06A06','A',6,'PC06','LG01'),
('G06B01','B',1,'PC06','LG01'),
('G06B02','B',2,'PC06','LG01'),
('G06B03','B',3,'PC06','LG01'),
('G06B04','B',4,'PC06','LG02'),
('G06B05','B',5,'PC06','LG02'),
('G06B06','B',6,'PC06','LG01'),
('G06C01','C',1,'PC06','LG01'),
('G06C02','C',2,'PC06','LG01'),
('G06C03','C',3,'PC06','LG01'),
('G06C04','C',4,'PC06','LG02'),
('G06C05','C',5,'PC06','LG02'),
('G06C06','C',6,'PC06','LG03');

INSERT INTO SUAT_CHIEU (MaSuatChieu, ThoiGianBatDau, ThoiGianKetThuc, TrangThai, MaPhim, MaPhong) VALUES
('SC001','2026-10-20 09:00:00','2026-10-20 11:11:00','Đã chiếu','P001','PC01'),
('SC002','2026-10-20 13:00:00','2026-10-20 15:12:00','Đã chiếu','P002','PC01'),
('SC003','2026-10-21 19:00:00','2026-10-21 20:40:00','Sắp chiếu','P003','PC02'),
('SC004','2026-10-22 09:30:00','2026-10-22 11:05:00','Sắp chiếu','P004','PC02'),
('SC005','2026-10-21 10:00:00','2026-10-21 12:08:00','Đã chiếu','P005','PC03'),
('SC006','2026-10-21 14:00:00','2026-10-21 15:45:00','Đã chiếu','P006','PC04'),
('SC007','2026-10-21 17:00:00','2026-10-21 18:52:00','Đã chiếu','P008','PC06'),
('SC008','2026-10-21 20:00:00','2026-10-21 21:59:00','Sắp chiếu','P009','PC03'),
('SC009','2026-10-22 12:00:00','2026-10-22 14:04:00','Sắp chiếu','P007','PC04'),
('SC010','2026-10-22 15:00:00','2026-10-22 17:04:00','Sắp chiếu','P010','PC05'),
('SC011','2026-10-22 18:00:00','2026-10-22 19:41:00','Sắp chiếu','P012','PC06'),
('SC012','2026-10-23 09:00:00','2026-10-23 10:56:00','Sắp chiếu','P013','PC03'),
('SC013','2026-10-23 12:00:00','2026-10-23 13:43:00','Sắp chiếu','P014','PC04'),
('SC014','2026-10-23 15:00:00','2026-10-23 17:15:00','Sắp chiếu','P005','PC05'),
('SC015','2026-10-23 19:00:00','2026-10-23 21:15:00','Sắp chiếu','P015','PC03'),
('SC016','2026-10-24 10:00:00','2026-10-24 11:37:00','Sắp chiếu','P016','PC06'),
('SC017','2026-10-24 13:00:00','2026-10-24 14:32:00','Sắp chiếu','P008','PC04'),
('SC018','2026-10-24 16:00:00','2026-10-24 17:45:00','Sắp chiếu','P006','PC03'),
('SC019','2026-10-24 19:00:00','2026-10-24 21:04:00','Sắp chiếu','P010','PC05'),
('SC020','2026-10-25 09:30:00','2026-10-25 11:15:00','Sắp chiếu','P007','PC04'),
('SC021','2026-10-25 12:00:00','2026-10-25 13:41:00','Sắp chiếu','P012','PC06'),
('SC022','2026-10-25 15:00:00','2026-10-25 17:15:00','Sắp chiếu','P015','PC05'),
('SC023','2026-10-25 18:00:00','2026-10-25 19:37:00','Sắp chiếu','P016','PC03'),
('SC024','2026-10-26 20:00:00','2026-10-26 22:08:00','Sắp chiếu','P005','PC04');

INSERT INTO KHACH_HANG (MaKhachHang, HoTen, SoDienThoai, Email, NgaySinh, NgayDangKy) VALUES
('KH001','Nguyễn Văn An','0912345678','an@example.com','2000-05-10','2026-01-05'),
('KH002','Trần Thị Bình','0987654321','binh@example.com','2002-08-15','2026-02-10'),
('KH003','Lê Văn Cường','0901234567','cuong@example.com','1998-03-20','2026-03-15'),
('KH004','Hoàng Anh Thành','0910031676','khach004@example.com','1992-05-21','2026-09-13'),
('KH005','Đỗ Hương Quỳnh','0910039595','khach005@example.com','1995-12-26','2026-01-16'),
('KH006','Vũ Duy Huyền','0910047514','khach006@example.com','1998-07-04','2026-03-19'),
('KH007','Đặng Thu My','0910055433','khach007@example.com','2001-02-09','2026-05-22'),
('KH008','Bùi Gia Tâm','0910063352','khach008@example.com','2004-09-14','2026-07-25'),
('KH009','Phan Ngọc Khang','0910071271','khach009@example.com','1980-04-19','2026-09-01'),
('KH010','Ngô Phương Sơn','0910079190','khach010@example.com','1983-11-24','2026-01-04'),
('KH011','Dương Bảo Dũng','0910087109','khach011@example.com','1986-06-02','2026-03-07'),
('KH012','Lý Tú Linh','0910095028','khach012@example.com','1989-01-07','2026-05-10'),
('KH013','Mai Lan Châu','0910102947','khach013@example.com','1992-08-12','2026-07-13'),
('KH014','Đinh Quang Yến','0910110866','khach014@example.com','1995-03-17','2026-09-16'),
('KH015','Trịnh Hoài Nam','0910118785','khach015@example.com','1998-10-22','2026-01-19'),
('KH016','Tạ Đức Thịnh','0910126704','khach016@example.com','2001-05-27','2026-03-22'),
('KH017','Cao Hải Bình','0910134623','khach017@example.com','2004-12-05','2026-05-25'),
('KH018','Lâm Tuấn Vy','0910142542','khach018@example.com','1980-07-10','2026-07-01'),
('KH019','Hồ Kim Nhi','0910150461','khach019@example.com','1983-02-15','2026-09-04'),
('KH020','Tô Minh Long','0910158380','khach020@example.com','1986-09-20','2026-01-07'),
('KH021','Lưu Thảo Phúc','0910166299','khach021@example.com','1989-04-25','2026-03-10'),
('KH022','Trần Thanh Hiếu','0910174218','khach022@example.com','1992-11-03','2026-05-13'),
('KH023','Nguyễn Khánh Trang','0910182137','khach023@example.com','1995-06-08','2026-07-16'),
('KH024','Hoàng Anh Thành','0910190056','khach024@example.com','1998-01-13','2026-09-19'),
('KH025','Đỗ Hương Quỳnh','0910197975','khach025@example.com','2001-08-18','2026-01-22'),
('KH026','Vũ Duy Huyền','0910205894','khach026@example.com','2004-03-23','2026-03-25'),
('KH027','Đặng Thu My','0910213813','khach027@example.com','1980-10-01','2026-05-01'),
('KH028','Bùi Gia Tâm','0910221732','khach028@example.com','1983-05-06','2026-07-04'),
('KH029','Phan Ngọc Khang','0910229651','khach029@example.com','1986-12-11','2026-09-07'),
('KH030','Ngô Phương Sơn','0910237570','khach030@example.com','1989-07-16','2026-01-10'),
('KH031','Dương Bảo Dũng','0910245489','khach031@example.com','1992-02-21','2026-03-13'),
('KH032','Lý Tú Linh','0910253408','khach032@example.com','1995-09-26','2026-05-16'),
('KH033','Mai Lan Châu','0910261327','khach033@example.com','1998-04-04','2026-07-19');

INSERT INTO NHAN_VIEN (MaNhanVien, HoTen, NgaySinh, SoDienThoai, DiaChi, NgayVaoLam, ViTriCongViec, LuongCoBan) VALUES
('NV001','Phạm Thị Hoa','1995-04-12','0911111111','Hà Nội','2024-01-10','Thu ngân',8000000),
('NV002','Nguyễn Văn Nam','1998-09-21','0922222222','Hà Nội','2023-06-15','Soát vé',7500000),
('NV003','Trần Văn Minh','1990-02-03','0933333333','Hà Nội','2022-03-01','Quản lý',12000000),
('NV004','Lê Thị Mai','1997-05-14','0944444444','Hà Đông, Hà Nội','2024-04-01','Thu ngân',7800000),
('NV005','Phạm Quốc Bảo','1996-07-23','0955555555','Thanh Xuân, Hà Nội','2023-11-12','Soát vé',7600000),
('NV006','Nguyễn Thu Trang','1999-01-09','0966666666','Cầu Giấy, Hà Nội','2025-02-10','Chăm sóc khách hàng',7200000),
('NV007','Đỗ Minh Đức','1993-12-02','0977777777','Nam Từ Liêm, Hà Nội','2021-08-15','Kỹ thuật',9500000),
('NV008','Vũ Ngọc Anh','1994-03-18','0988888888','Hoàng Mai, Hà Nội','2022-06-20','Quản lý ca',11000000);

INSERT INTO KHUYEN_MAI (MaKhuyenMai, TenKhuyenMai, GiaTriGiamGia, GiaTriDonHangToiThieu, NgayBatDau, NgayKetThuc, SoLuotSuDungToiDa) VALUES
('KM001','Ưu đãi thành viên',10000,50000,'2026-10-01','2026-12-31',500),
('KM002','Ưu đãi sinh viên',5000,40000,'2026-10-01','2026-11-30',200),
('KM003','Giảm giá cuối tuần',15000,80000,'2026-10-01','2026-12-31',1000),
('KM004','Ưu đãi khách hàng mới',20000,100000,'2026-10-01','2026-11-30',300),
('KM005','Combo tiết kiệm',10000,60000,'2026-09-01','2026-12-31',800),
('KM006','Ưu đãi ngày lễ',25000,120000,'2026-10-20','2026-11-05',150);

INSERT INTO SAN_PHAM (MaSanPham, TenSanPham, LoaiSanPham, DonGia, SoLuongTonKho, TrangThaiKinhDoanh) VALUES
('SP001','Bắp rang','Bỏng',30000,100,'Đang bán'),
('SP002','Nước ngọt','Nước uống',20000,150,'Đang bán'),
('SP003','Combo bắp nước','Combo',45000,80,'Đang bán'),
('SP004','Bắp rang phô mai','Bỏng',35000,90,'Đang bán'),
('SP005','Bắp caramel','Bỏng',38000,75,'Đang bán'),
('SP006','Nước suối','Nước uống',15000,200,'Đang bán'),
('SP007','Trà đào','Nước uống',28000,65,'Đang bán'),
('SP008','Combo đôi','Combo',85000,45,'Đang bán'),
('SP009','Combo gia đình','Combo',150000,30,'Đang bán'),
('SP010','Kẹo dẻo','Khác',18000,100,'Đang bán'),
('SP011','Nachos phô mai','Khác',40000,55,'Đang bán'),
('SP012','Cà phê đá','Nước uống',25000,40,'Đang bán'),
('SP013','Bắp rang size lớn','Bỏng',45000,60,'Đang bán');

INSERT INTO DAT_VE (MaDatVe, MaKhachHang, MaSuatChieu, ThoiGianDat, TongSoTien, SoTienGiamGia, SoTienPhaiThanhToan, TrangThaiThanhToan, MaKhuyenMai) VALUES
('DV001','KH001','SC001','2026-10-19 10:00:00',120000,10000,110000,'Đã thanh toán','KM001'),
('DV002','KH002','SC002','2026-10-19 11:00:00',125000,0,125000,'Đã thanh toán',NULL),
('DV003','KH003','SC003','2026-10-19 12:00:00',80000,5000,75000,'Đã thanh toán','KM002'),
('DV004','KH004','SC005','2026-10-19 13:15:00',115000,15000,100000,'Đã thanh toán','KM003'),
('DV005','KH005','SC006','2026-10-20 14:15:00',70000,10000,60000,'Đã thanh toán','KM005'),
('DV006','KH006','SC007','2026-10-18 15:15:00',185000,0,185000,'Chưa thanh toán',NULL),
('DV007','KH007','SC008','2026-10-19 16:15:00',70000,0,70000,'Đã thanh toán',NULL),
('DV008','KH008','SC009','2026-10-20 17:15:00',115000,15000,100000,'Đã thanh toán','KM003'),
('DV009','KH009','SC010','2026-10-18 18:15:00',140000,0,140000,'Đã thanh toán',NULL),
('DV010','KH010','SC011','2026-10-19 09:15:00',115000,10000,105000,'Đã thanh toán','KM005'),
('DV011','KH011','SC012','2026-10-20 10:15:00',70000,0,70000,'Đã thanh toán',NULL),
('DV012','KH012','SC013','2026-10-18 11:15:00',185000,15000,170000,'Chưa thanh toán','KM003'),
('DV013','KH013','SC014','2026-10-19 12:15:00',70000,0,70000,'Đã thanh toán',NULL),
('DV014','KH014','SC015','2026-10-20 13:15:00',115000,0,115000,'Đã thanh toán',NULL),
('DV015','KH015','SC016','2026-10-18 14:15:00',140000,10000,130000,'Đã thanh toán','KM005'),
('DV016','KH016','SC017','2026-10-19 15:15:00',115000,15000,100000,'Đã thanh toán','KM003'),
('DV017','KH017','SC018','2026-10-20 16:15:00',70000,0,70000,'Đã thanh toán',NULL),
('DV018','KH018','SC019','2026-10-18 17:15:00',185000,0,185000,'Chưa thanh toán',NULL),
('DV019','KH019','SC020','2026-10-19 18:15:00',70000,0,70000,'Đã thanh toán',NULL),
('DV020','KH020','SC021','2026-10-20 09:15:00',115000,15000,100000,'Đã thanh toán','KM003'),
('DV021','KH021','SC022','2026-10-18 10:15:00',140000,0,140000,'Đã thanh toán',NULL),
('DV022','KH022','SC023','2026-10-19 11:15:00',115000,0,115000,'Đã thanh toán',NULL),
('DV023','KH023','SC024','2026-10-20 12:15:00',70000,0,70000,'Đã thanh toán',NULL);

INSERT INTO VE (MaVe, MaDatVe, MaGhe, GiaVeTaiThoiDiemMua, TrangThaiVe) VALUES
('V001','DV001','G001',70000,'Đã check-in'),
('V002','DV002','G003',80000,'Chưa sử dụng'),
('V003','DV003','G007',60000,'Chưa sử dụng'),
('V004','DV004','G03A01',70000,'Đã hủy'),
('V005','DV005','G04A02',70000,'Chưa sử dụng'),
('V006','DV006','G06A03',70000,'Chưa sử dụng'),
('V007','DV006','G06B04',70000,'Chưa sử dụng'),
('V008','DV007','G03A04',70000,'Chưa sử dụng'),
('V009','DV008','G04A01',70000,'Chưa sử dụng'),
('V010','DV009','G05A02',70000,'Đã hủy'),
('V011','DV009','G05B03',70000,'Đã hủy'),
('V012','DV010','G06A03',70000,'Chưa sử dụng'),
('V013','DV011','G03A04',70000,'Chưa sử dụng'),
('V014','DV012','G04A01',70000,'Chưa sử dụng'),
('V015','DV012','G04B02',70000,'Chưa sử dụng'),
('V016','DV013','G05A02',70000,'Chưa sử dụng'),
('V017','DV014','G03A03',70000,'Đã hủy'),
('V018','DV015','G06A04',70000,'Chưa sử dụng'),
('V019','DV015','G06B05',70000,'Chưa sử dụng'),
('V020','DV016','G04A01',70000,'Chưa sử dụng'),
('V021','DV017','G03A02',70000,'Chưa sử dụng'),
('V022','DV018','G05A03',70000,'Chưa sử dụng'),
('V023','DV018','G05B04',70000,'Chưa sử dụng'),
('V024','DV019','G04A04',70000,'Đã hủy'),
('V025','DV020','G06A01',70000,'Chưa sử dụng'),
('V026','DV021','G05A02',70000,'Chưa sử dụng'),
('V027','DV021','G05B03',70000,'Chưa sử dụng'),
('V028','DV022','G03A03',70000,'Chưa sử dụng'),
('V029','DV023','G04A04',70000,'Chưa sử dụng');

INSERT INTO MUA_KEM (MaDatVe, MaSanPham, SoLuong, DonGiaTaiThoiDiemMua) VALUES
('DV001','SP001',1,30000),
('DV001','SP002',1,20000),
('DV002','SP003',1,45000),
('DV003','SP002',1,20000),
('DV004','SP004',1,35000),
('DV004','SP001',1,30000),
('DV006','SP007',1,28000),
('DV008','SP010',1,18000),
('DV008','SP001',1,30000),
('DV010','SP006',1,15000),
('DV012','SP008',1,85000),
('DV012','SP001',1,30000),
('DV014','SP004',1,35000),
('DV016','SP007',1,28000),
('DV016','SP001',1,30000),
('DV018','SP010',1,18000),
('DV020','SP006',1,15000),
('DV020','SP001',1,30000),
('DV022','SP008',1,85000);

INSERT INTO CHECK_IN (MaCheckIn, MaVe, MaNhanVien, ThoiGianCheckIn) VALUES
('CI001','V001','NV002','2026-10-20 09:05:00'),
('CI002','V008','NV002','2026-10-23 13:05:00'),
('CI003','V012','NV005','2026-10-21 16:05:00'),
('CI004','V016','NV002','2026-10-24 11:05:00'),
('CI005','V020','NV005','2026-10-22 14:05:00'),
('CI006','V028','NV002','2026-10-23 12:05:00');


SELECT 'THE_LOAI' AS TenBang, COUNT(*) AS SoDong FROM THE_LOAI
UNION ALL SELECT 'PHIM', COUNT(*) FROM PHIM
UNION ALL SELECT 'PHIM_THE_LOAI', COUNT(*) FROM PHIM_THE_LOAI
UNION ALL SELECT 'PHONG_CHIEU', COUNT(*) FROM PHONG_CHIEU
UNION ALL SELECT 'LOAI_GHE', COUNT(*) FROM LOAI_GHE
UNION ALL SELECT 'GHE', COUNT(*) FROM GHE
UNION ALL SELECT 'SUAT_CHIEU', COUNT(*) FROM SUAT_CHIEU
UNION ALL SELECT 'KHACH_HANG', COUNT(*) FROM KHACH_HANG
UNION ALL SELECT 'NHAN_VIEN', COUNT(*) FROM NHAN_VIEN
UNION ALL SELECT 'KHUYEN_MAI', COUNT(*) FROM KHUYEN_MAI
UNION ALL SELECT 'SAN_PHAM', COUNT(*) FROM SAN_PHAM
UNION ALL SELECT 'DAT_VE', COUNT(*) FROM DAT_VE
UNION ALL SELECT 'VE', COUNT(*) FROM VE
UNION ALL SELECT 'MUA_KEM', COUNT(*) FROM MUA_KEM
UNION ALL SELECT 'CHECK_IN', COUNT(*) FROM CHECK_IN;
SELECT * FROM THE_LOAI;
SELECT * FROM PHIM;
SELECT * FROM PHIM_THE_LOAI;
SELECT * FROM PHONG_CHIEU;
SELECT * FROM LOAI_GHE;
SELECT * FROM GHE;
SELECT * FROM SUAT_CHIEU;
SELECT * FROM KHACH_HANG;
SELECT * FROM NHAN_VIEN;
SELECT * FROM KHUYEN_MAI;
SELECT * FROM SAN_PHAM;
SELECT * FROM DAT_VE;
SELECT * FROM VE;
SELECT * FROM MUA_KEM;
SELECT * FROM CHECK_IN;

-- =========================================================
-- CAC TRUY VAN THEO YEU CAU DE BAI
-- Sua @TuNgay, @DenNgay, @MaKhachHang neu can.
-- =========================================================
SET @TuNgay = '2026-10-01';
SET @DenNgay = '2026-10-31';
SET @MaKhachHang = 'KH001';

-- 1. Phim, so ve ban va tong doanh thu (ve + san pham)
SELECT p.MaPhim, p.TenPhim,
       COALESCE(v.SoVeDaBan,0) AS SoVeDaBan,
       COALESCE(v.DoanhThuVe,0)+COALESCE(s.DoanhThuSanPham,0) AS TongDoanhThu
FROM PHIM p
LEFT JOIN (
  SELECT sc.MaPhim, COUNT(v.MaVe) AS SoVeDaBan,
         SUM(v.GiaVeTaiThoiDiemMua) AS DoanhThuVe
  FROM SUAT_CHIEU sc JOIN DAT_VE dv ON dv.MaSuatChieu=sc.MaSuatChieu
  JOIN VE v ON v.MaDatVe=dv.MaDatVe
  WHERE dv.TrangThaiThanhToan='Đã thanh toán' AND v.TrangThaiVe<>'Đã hủy'
    AND dv.ThoiGianDat>=@TuNgay AND dv.ThoiGianDat<DATE_ADD(@DenNgay,INTERVAL 1 DAY)
  GROUP BY sc.MaPhim
) v ON v.MaPhim=p.MaPhim
LEFT JOIN (
  SELECT sc.MaPhim, SUM(mk.SoLuong*mk.DonGiaTaiThoiDiemMua) AS DoanhThuSanPham
  FROM SUAT_CHIEU sc JOIN DAT_VE dv ON dv.MaSuatChieu=sc.MaSuatChieu
  JOIN MUA_KEM mk ON mk.MaDatVe=dv.MaDatVe
  WHERE dv.TrangThaiThanhToan='Đã thanh toán'
    AND dv.ThoiGianDat>=@TuNgay AND dv.ThoiGianDat<DATE_ADD(@DenNgay,INTERVAL 1 DAY)
  GROUP BY sc.MaPhim
) s ON s.MaPhim=p.MaPhim
ORDER BY TongDoanhThu DESC;

-- 2. So ghe, so ve ban, ghe trong va ty le lap day
SELECT sc.MaSuatChieu,p.TenPhim,pc.TenPhong,sc.ThoiGianBatDau,sc.ThoiGianKetThuc,
       g.TongSoGhe,COALESCE(v.SoVeDaBan,0) AS SoVeDaBan,
       GREATEST(g.TongSoGhe-COALESCE(v.SoVeDaBan,0),0) AS SoGheConTrong,
       ROUND(100*COALESCE(v.SoVeDaBan,0)/NULLIF(g.TongSoGhe,0),2) AS TyLeLapDayPhanTram
FROM SUAT_CHIEU sc JOIN PHIM p ON p.MaPhim=sc.MaPhim
JOIN PHONG_CHIEU pc ON pc.MaPhong=sc.MaPhong
JOIN (SELECT MaPhong,COUNT(*) AS TongSoGhe FROM GHE GROUP BY MaPhong) g ON g.MaPhong=sc.MaPhong
LEFT JOIN (
  SELECT dv.MaSuatChieu,COUNT(v.MaVe) AS SoVeDaBan
  FROM DAT_VE dv JOIN VE v ON v.MaDatVe=dv.MaDatVe
  WHERE dv.TrangThaiThanhToan='Đã thanh toán' AND v.TrangThaiVe<>'Đã hủy'
  GROUP BY dv.MaSuatChieu
) v ON v.MaSuatChieu=sc.MaSuatChieu
ORDER BY TyLeLapDayPhanTram DESC;

-- 3. Lich su dat ve cua mot khach hang
SELECT kh.MaKhachHang,kh.HoTen,kh.SoDienThoai,kh.Email,dv.MaDatVe,dv.ThoiGianDat,
       p.TenPhim,sc.ThoiGianBatDau,dv.TongSoTien,dv.SoTienGiamGia,
       dv.SoTienPhaiThanhToan,dv.TrangThaiThanhToan,
       COALESCE(v.DanhSachVe,'Chua co ve') AS DanhSachVe,
       COALESCE(s.DanhSachSanPham,'Khong mua san pham') AS DanhSachSanPham
FROM KHACH_HANG kh LEFT JOIN DAT_VE dv ON dv.MaKhachHang=kh.MaKhachHang
LEFT JOIN SUAT_CHIEU sc ON sc.MaSuatChieu=dv.MaSuatChieu
LEFT JOIN PHIM p ON p.MaPhim=sc.MaPhim
LEFT JOIN (
  SELECT v.MaDatVe,GROUP_CONCAT(CONCAT(v.MaVe,' - Ghe ',g.MaGhe,' - ',v.TrangThaiVe,
    CASE WHEN ci.MaCheckIn IS NOT NULL THEN ' - Da check-in ' ELSE '' END,
    COALESCE(DATE_FORMAT(ci.ThoiGianCheckIn,'%d/%m/%Y %H:%i'),''))
    ORDER BY v.MaVe SEPARATOR '; ') AS DanhSachVe
  FROM VE v JOIN GHE g ON g.MaGhe=v.MaGhe LEFT JOIN CHECK_IN ci ON ci.MaVe=v.MaVe
  GROUP BY v.MaDatVe
) v ON v.MaDatVe=dv.MaDatVe
LEFT JOIN (
  SELECT mk.MaDatVe,GROUP_CONCAT(CONCAT(sp.TenSanPham,' x',mk.SoLuong,' (',
    FORMAT(mk.SoLuong*mk.DonGiaTaiThoiDiemMua,0),' VND)')
    ORDER BY sp.TenSanPham SEPARATOR '; ') AS DanhSachSanPham
  FROM MUA_KEM mk JOIN SAN_PHAM sp ON sp.MaSanPham=mk.MaSanPham GROUP BY mk.MaDatVe
) s ON s.MaDatVe=dv.MaDatVe
WHERE kh.MaKhachHang COLLATE utf8mb4_unicode_ci
      = @MaKhachHang COLLATE utf8mb4_unicode_ci
ORDER BY dv.ThoiGianDat DESC;

-- 4. Top 10 khach hang chi tieu nhieu nhat sau giam gia
SELECT kh.MaKhachHang,kh.HoTen,COUNT(dv.MaDatVe) AS SoLanDatVe,
       SUM(dv.SoTienPhaiThanhToan) AS TongTienChiTieu
FROM KHACH_HANG kh JOIN DAT_VE dv ON dv.MaKhachHang=kh.MaKhachHang
WHERE dv.TrangThaiThanhToan='Đã thanh toán'
  AND dv.ThoiGianDat>=@TuNgay AND dv.ThoiGianDat<DATE_ADD(@DenNgay,INTERVAL 1 DAY)
GROUP BY kh.MaKhachHang,kh.HoTen
ORDER BY TongTienChiTieu DESC LIMIT 10;

-- 5. So ve va doanh thu theo loai ghe, theo phim
SELECT lg.MaLoaiGhe,lg.TenLoaiGhe,p.MaPhim,p.TenPhim,COUNT(v.MaVe) AS SoVeDaBan,
       SUM(v.GiaVeTaiThoiDiemMua) AS DoanhThuVe
FROM LOAI_GHE lg JOIN GHE g ON g.MaLoaiGhe=lg.MaLoaiGhe
JOIN VE v ON v.MaGhe=g.MaGhe JOIN DAT_VE dv ON dv.MaDatVe=v.MaDatVe
JOIN SUAT_CHIEU sc ON sc.MaSuatChieu=dv.MaSuatChieu JOIN PHIM p ON p.MaPhim=sc.MaPhim
WHERE dv.TrangThaiThanhToan='Đã thanh toán' AND v.TrangThaiVe<>'Đã hủy'
  AND dv.ThoiGianDat>=@TuNgay AND dv.ThoiGianDat<DATE_ADD(@DenNgay,INTERVAL 1 DAY)
GROUP BY lg.MaLoaiGhe,lg.TenLoaiGhe,p.MaPhim,p.TenPhim
ORDER BY DoanhThuVe DESC;

-- 6. So luong va doanh thu san pham theo thang
SELECT DATE_FORMAT(dv.ThoiGianDat,'%Y-%m') AS Thang,sp.MaSanPham,sp.TenSanPham,
       SUM(mk.SoLuong) AS TongSoLuongDaBan,
       SUM(mk.SoLuong*mk.DonGiaTaiThoiDiemMua) AS DoanhThu
FROM MUA_KEM mk JOIN SAN_PHAM sp ON sp.MaSanPham=mk.MaSanPham
JOIN DAT_VE dv ON dv.MaDatVe=mk.MaDatVe
WHERE dv.TrangThaiThanhToan='Đã thanh toán'
  AND dv.ThoiGianDat>=@TuNgay AND dv.ThoiGianDat<DATE_ADD(@DenNgay,INTERVAL 1 DAY)
GROUP BY DATE_FORMAT(dv.ThoiGianDat,'%Y-%m'),sp.MaSanPham,sp.TenSanPham
ORDER BY Thang,DoanhThu DESC;

-- 7. Luot check-in va luong nhan vien theo thang
-- Thuong minh hoa: 10.000 dong/check-in hop le.
SET @ThangLuong='2026-10-01';
SET @ThuongMoiCheckIn=10000;
SELECT nv.MaNhanVien,nv.HoTen,nv.ViTriCongViec,nv.LuongCoBan,
       COUNT(ci.MaCheckIn) AS SoLuotCheckIn,
       COUNT(ci.MaCheckIn)*@ThuongMoiCheckIn AS TienThuong,
       nv.LuongCoBan+COUNT(ci.MaCheckIn)*@ThuongMoiCheckIn AS TongLuong
FROM NHAN_VIEN nv LEFT JOIN (
  SELECT ci.MaCheckIn,ci.MaNhanVien
  FROM CHECK_IN ci JOIN VE v ON v.MaVe=ci.MaVe
  JOIN DAT_VE dv ON dv.MaDatVe=v.MaDatVe
  WHERE dv.TrangThaiThanhToan='Đã thanh toán' AND v.TrangThaiVe='Đã check-in'
    AND ci.ThoiGianCheckIn>=@ThangLuong
    AND ci.ThoiGianCheckIn<DATE_ADD(@ThangLuong,INTERVAL 1 MONTH)
) ci ON ci.MaNhanVien=nv.MaNhanVien
GROUP BY nv.MaNhanVien,nv.HoTen,nv.ViTriCongViec,nv.LuongCoBan
ORDER BY TongLuong DESC;
