const db = require('../config/db');

async function migrate() {
  try {
    const [cols] = await db.execute('DESCRIBE PHIM');
    const colNames = cols.map(c => c.Field);
    
    if (!colNames.includes('Poster')) {
      console.log('Adding Poster column...');
      await db.execute('ALTER TABLE PHIM ADD COLUMN Poster VARCHAR(500) NULL');
    }
    if (!colNames.includes('Trailer')) {
      console.log('Adding Trailer column...');
      await db.execute('ALTER TABLE PHIM ADD COLUMN Trailer VARCHAR(500) NULL');
    }

    const movies = [
      {
        id: 'P001',
        poster: 'anh_video/digger.jpg',
        trailer: 'anh_video/DIGGER ｜ Official Trailer.mp4'
      },
      {
        id: 'P002',
        poster: 'anh_video/quyantang4.jpg',
        trailer: 'anh_video/[OFFICIAL TEASER] “ธี่หยด： สมิงเขาขวาง”.mp4'
      },
      {
        id: 'P003',
        poster: 'anh_video/streetfighter.jpg',
        trailer: 'anh_video/Street Fighter ｜ New Trailer (2026 Movie).mp4'
      },
      {
        id: 'P004',
        poster: 'anh_video/incidentsaruondthehouse.webp',
        trailer: 'anh_video/Other Mommy ｜ Official Trailer.mp4'
      },
      {
        id: 'P005',
        poster: 'anh_video/official-poster-for-spy-x-family-code-white-v0-qz0gobx6ezpa1.webp',
        trailer: 'anh_video/SPY x FAMILY CODE： WHITE - Official Trailer (HD).mp4'
      },
      {
        id: 'P006',
        poster: 'anh_video/teaser-poster_1.jpg',
        trailer: 'anh_video/QUYẾT CUA ANH NÀY ｜ Official Trailer ｜ KHỞI CHIẾU 02.10.2026.mp4'
      },
      {
        id: 'P007',
        poster: 'anh_video/Suzume_no_Tojimari.jpg',
        trailer: 'anh_video/Suzume Trailer 1 (2023).mp4'
      },
      {
        id: 'P008',
        poster: 'anh_video/Shaun_the_Sheep_Farmageddon_poster_pillars.jpg',
        trailer: 'anh_video/Shaun the Sheep Movie 2： Farmageddon – Official Trailer.mp4'
      },
      {
        id: 'P009',
        poster: 'anh_video/The_Tale_of_the_Princess_Kaguya_(poster).jpg',
        trailer: 'anh_video/The Tale Of The Princess Kaguya - Official Trailer.mp4'
      },
      {
        id: 'P010',
        poster: 'anh_video/ME-MIN-POSTER-CONG-VIEN-KTHUOC-SOCIAL-1.jpg',
        trailer: 'anh_video/MẸ MÌN ｜ TEASER TRAILER ｜ SUẤT CHIẾU ĐẶC BIỆT TỪ 18H NGÀY 20.10.2026.mp4'
      },
      {
        id: 'P011',
        poster: 'anh_video/tran-yem-500_1778642449288.jpg',
        trailer: 'anh_video/Xóm nhỏ ｜ Trailer Official ｜ Phim ĐỜI SỐNG ĐÔ THỊ ｜ Phim VTV Mới Nhất 2026.mp4'
      },
      {
        id: 'P012',
        poster: 'anh_video/MV5BMjNlMjM4NTAtYjE5YS00ZGYyLWEyMTYtNjFlMmIxZDEzYjhhXkEyXkFqcGc@._V1_.jpg',
        trailer: 'anh_video/Clayface ｜ Official Teaser.mp4'
      },
      {
        id: 'P013',
        poster: 'anh_video/target_payoff_poster_united_kingdom_d19f38c5.jpeg',
        trailer: 'anh_video/Toy Story 5 ｜ Teaser Trailer ｜ In Theaters June 19.mp4'
      },
      {
        id: 'P014',
        poster: 'anh_video/MV5BYjk1NjgwZDMtYzI5OS00Y2Q4LWI1NmItNTE5OGU2NDVmMTAxXkEyXkFqcGc@._V1_.jpg',
        trailer: 'anh_video/Dune： Part Three ｜ Official Teaser Trailer.mp4'
      },
      {
        id: 'P015',
        poster: 'anh_video/sLYCyO58UvBuBtbHTQjPCCgJ4dG.webp',
        trailer: 'anh_video/AVENGERS 5： DOOMSDAY Official “Steve Rogers Meets New Avengers” Teaser Trailer (2026).mp4'
      },
      {
        id: 'P016',
        poster: 'anh_video/images.jpg',
        trailer: 'anh_video/ÁN MẠNG KARAOKE ｜ MAIN TRAILER ｜ DỰ KIẾN KHỞI CHIẾU 02.10.2026.mp4'
      }
    ];

    for (const m of movies) {
      await db.execute('UPDATE PHIM SET Poster = ?, Trailer = ? WHERE MaPhim = ?', [m.poster, m.trailer, m.id]);
      console.log('✅ Updated ' + m.id);
    }

    // Cập nhật ảnh cho sản phẩm Combo đôi (SP008)
    await db.execute('UPDATE SAN_PHAM SET HinhAnh = ? WHERE MaSanPham = ?', ['anh_video/snackcombodoi.jpg', 'SP008']);
    console.log('✅ Updated SP008 image');

    console.log('🎉 Migration hoàn tất!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi migration:', err);
    process.exit(1);
  }
}

migrate();
