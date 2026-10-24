const pool = require('../config/db');

const movies = [
  ['P001', 'Digger', 128, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-10-02', '2026-11-30', 'Đang chiếu'],
  ['P002', 'Tee Yod: Quỷ Ăn Tạng 4: Hổ Tinh', 111, 'Thái Lan', 'Phụ đề Việt', 18, '2026-10-09', '2026-11-30', 'Đang chiếu'],
  ['P003', 'Street Fighter', 115, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-10-16', '2026-11-30', 'Đang chiếu'],
  ['P004', 'Người Mẹ Khác', 93, 'Hoa Kỳ', 'Phụ đề Việt', 18, '2026-10-09', '2026-11-20', 'Đang chiếu'],
  ['P005', 'SPY x FAMILY Code: White', 110, 'Nhật Bản', 'Lồng tiếng Việt', 13, '2026-10-23', '2026-12-15', 'Đang chiếu'],
  ['P006', 'Quyết Cua Anh Này', 115, 'Thái Lan', 'Phụ đề Việt', 13, '2026-10-02', '2026-11-15', 'Đang chiếu'],
  ['P007', 'Khóa Chặt Cửa Nào Suzume', 122, 'Nhật Bản', 'Phụ đề Việt', 0, '2026-10-02', '2026-11-10', 'Đang chiếu'],
  ['P008', 'Shaun the Sheep: Quái Lạ Ghé Nhà', 88, 'Anh', 'Lồng tiếng Việt', 0, '2026-10-16', '2026-11-30', 'Đang chiếu'],
  ['P009', 'Chuyện Công Chúa Kaguya', 137, 'Nhật Bản', 'Phụ đề Việt', 0, '2026-10-09', '2026-11-15', 'Đang chiếu'],
  ['P010', 'Mẹ Mìn', 99, 'Việt Nam', 'Tiếng Việt', 16, '2026-10-23', '2026-12-05', 'Đang chiếu'],
  ['P011', 'Trấn Yểm', 96, 'Việt Nam', 'Tiếng Việt', 18, '2026-10-30', '2026-12-15', 'Sắp chiếu'],
  ['P012', 'Clayface', 120, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-11-06', '2026-12-31', 'Sắp chiếu'],
  ['P013', 'Toy Story 5', 100, 'Hoa Kỳ', 'Lồng tiếng Việt', 0, '2026-11-20', '2027-01-15', 'Sắp chiếu'],
  ['P014', 'Dune: Part Three', 165, 'Hoa Kỳ', 'Phụ đề Việt', 16, '2026-12-18', '2027-02-28', 'Sắp chiếu'],
  ['P015', 'Avengers: Doomsday', 180, 'Hoa Kỳ', 'Phụ đề Việt', 13, '2026-12-18', '2027-02-28', 'Sắp chiếu'],
  ['P016', 'Án Mạng Karaoke', 96, 'Việt Nam', 'Tiếng Việt', 16, '2026-09-01', '2026-10-15', 'Ngừng chiếu']
];

const movieGenres = [
  ['P001', 'TL04'], // Digger: Hành động
  ['P001', 'TL08'], // Digger: Phiêu lưu
  ['P002', 'TL07'], // Tee Yod: Kinh dị
  ['P003', 'TL04'], // Street Fighter: Hành động
  ['P003', 'TL08'], // Street Fighter: Phiêu lưu
  ['P004', 'TL07'], // Người Mẹ Khác: Kinh dị
  ['P004', 'TL01'], // Người Mẹ Khác: Tâm lý
  ['P005', 'TL05'], // SPY x FAMILY: Hoạt hình
  ['P005', 'TL02'], // SPY x FAMILY: Hài
  ['P005', 'TL04'], // SPY x FAMILY: Hành động
  ['P006', 'TL02'], // Quyết Cua Anh Này: Hài
  ['P006', 'TL09'], // Quyết Cua Anh Này: Tình cảm
  ['P007', 'TL05'], // Suzume: Hoạt hình
  ['P007', 'TL08'], // Suzume: Phiêu lưu
  ['P008', 'TL05'], // Shaun the Sheep: Hoạt hình
  ['P008', 'TL03'], // Shaun the Sheep: Gia đình
  ['P009', 'TL05'], // Kaguya: Hoạt hình
  ['P009', 'TL01'], // Kaguya: Tâm lý
  ['P010', 'TL07'], // Mẹ Mìn: Kinh dị
  ['P010', 'TL01'], // Mẹ Mìn: Tâm lý
  ['P011', 'TL07'], // Trấn Yểm: Kinh dị
  ['P012', 'TL04'], // Clayface: Hành động
  ['P012', 'TL06'], // Clayface: Khoa học viễn tưởng
  ['P013', 'TL05'], // Toy Story 5: Hoạt hình
  ['P013', 'TL03'], // Toy Story 5: Gia đình
  ['P014', 'TL06'], // Dune: Part Three: Khoa học viễn tưởng
  ['P014', 'TL08'], // Dune: Part Three: Phiêu lưu
  ['P015', 'TL04'], // Avengers: Doomsday: Hành động
  ['P015', 'TL06'], // Avengers: Doomsday: Khoa học viễn tưởng
  ['P016', 'TL07'], // Án Mạng Karaoke: Kinh dị
  ['P016', 'TL02']  // Án Mạng Karaoke: Hài
];

async function updateMovies() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('🔄 Đang cập nhật bảng PHIM...');
    const insertSql = `
      INSERT INTO PHIM (MaPhim, TenPhim, ThoiLuong, QuocGia, NgonNgu, GioiHanDoTuoi, NgayKhoiChieu, NgayKetThuc, TrangThai)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        TenPhim = VALUES(TenPhim),
        ThoiLuong = VALUES(ThoiLuong),
        QuocGia = VALUES(QuocGia),
        NgonNgu = VALUES(NgonNgu),
        GioiHanDoTuoi = VALUES(GioiHanDoTuoi),
        NgayKhoiChieu = VALUES(NgayKhoiChieu),
        NgayKetThuc = VALUES(NgayKetThuc),
        TrangThai = VALUES(TrangThai)
    `;
    await conn.query(insertSql, [movies]);

    console.log('🔄 Đang cập nhật thể loại PHIM_THE_LOAI...');
    await conn.query('DELETE FROM PHIM_THE_LOAI WHERE MaPhim IN (?)', [movies.map(m => m[0])]);
    await conn.query('INSERT INTO PHIM_THE_LOAI (MaPhim, MaTheLoai) VALUES ?', [movieGenres]);

    await conn.commit();
    console.log('✅ Đã cập nhật thành công 16 phim và thể loại vào Database!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Lỗi khi cập nhật:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

updateMovies();
