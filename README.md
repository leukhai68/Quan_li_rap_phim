# 🎬 Beta Cinema Clone — Full-stack Web App

Clone giao diện **Beta Cinema** với tông màu xanh dương `#0054a6`.  
Backend: **Node.js + Express.js + MySQL2** | Frontend: **HTML + CSS + JS thuần**

---

## 📁 Cấu trúc thư mục

```
BetaClone/
├── CSDL_RapChieuPhim.sql        ← File SQL gốc
├── README.md
│
├── backend/                      ← Node.js + Express API
│   ├── server.js                 ← Entry point (cổng 5000)
│   ├── .env                      ← Cấu hình DB (chỉnh DB_PASSWORD)
│   ├── package.json
│   ├── config/
│   │   └── db.js                 ← MySQL connection pool
│   └── routes/
│       ├── phim.js               ← GET /api/phim
│       ├── suatChieu.js          ← GET /api/suat-chieu
│       └── baoCao.js             ← GET /api/bao-cao/*
│
└── frontend/                     ← HTML/CSS/JS thuần
    ├── index.html                ← Trang chủ (danh sách phim, lịch chiếu)
    ├── phim.html                 ← Trang phim + filter + lịch chiếu
    ├── rap.html                  ← Hệ thống cụm rạp
    ├── giave.html                ← Bảng giá vé & quy định độ tuổi
    ├── tintuc.html               ← Tin tức & khuyến mãi
    ├── baocao.html               ← Báo cáo doanh thu & lấp đầy
    ├── login.html                ← Trang đăng nhập
    ├── register.html             ← Trang đăng ký thành viên
    ├── css/
    │   ├── style.css             ← Global styles
    │   ├── phim.css              ← Styles trang phim
    │   └── baocao.css            ← Styles trang báo cáo
    └── js/
        ├── api.js                ← Wrapper fetch API
        ├── app.js                ← Logic trang chủ
        ├── phim.js               ← Logic trang phim
        └── baocao.js             ← Logic báo cáo
```

---

## 🚀 Hướng dẫn cài đặt & chạy

### 1. Import CSDL vào MySQL

```bash
mysql -u root -p < CSDL_RapChieuPhim.sql
```

Hoặc mở MySQL Workbench / phpMyAdmin và import file `CSDL_RapChieuPhim.sql`.

### 2. Cấu hình Backend

Chỉnh file `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here   # ← thay bằng mật khẩu MySQL của bạn
DB_NAME=QuanLyRapChieuPhim_Final
PORT=5000
```

### 3. Cài dependencies & khởi chạy Backend

```bash
cd backend
npm install
npm run dev     # chạy với nodemon (tự reload)
# hoặc
npm start       # chạy production
```

Server sẽ khởi động tại: **http://localhost:5000**

### 4. Mở Frontend

Dùng **Live Server** (VS Code extension) hoặc mở file `frontend/index.html` trực tiếp trong trình duyệt.

> **Lưu ý**: Do CORS, nếu mở file HTML trực tiếp (`file://`) mà không qua server thì fetch API có thể bị chặn. Khuyến nghị dùng Live Server (cổng 3000 hoặc 5500).

---

## 🔌 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/health` | Health check |
| GET | `/api/phim` | Danh sách phim (query: `?trangthai=Đang chiếu`) |
| GET | `/api/phim/:id` | Chi tiết phim |
| GET | `/api/suat-chieu` | Lịch chiếu (query: `?maPhim=P001&ngay=2026-10-22`) |
| GET | `/api/suat-chieu/:id` | Chi tiết suất chiếu + danh sách ghế |
| GET | `/api/bao-cao/doanh-thu-phim` | Báo cáo doanh thu phim |
| GET | `/api/bao-cao/lap-day-ghe` | Báo cáo tỉ lệ lấp đầy ghế |
| GET | `/api/bao-cao/top-khach-hang` | Top 10 khách hàng chi tiêu nhiều nhất |
| GET | `/api/bao-cao/doanh-thu-loai-ghe` | Doanh thu theo loại ghế |
| GET | `/api/bao-cao/san-pham-theo-thang` | Doanh thu sản phẩm theo tháng |

---

## 🎨 Giao diện

- **Tông màu chính**: `#0054a6` (xanh dương Beta Cinema)
- **Header sticky** với logo + navigation
- **3-column layout**: Banner quảng cáo trái/phải + nội dung trung tâm
- **Card phim**: Poster placeholder, nhãn tuổi (P/T13/T16/T18), nút MUA VÉ xanh
- **Tab "Đang chiếu" / "Sắp chiếu"**
- **Lịch chiếu hôm nay** tự động tải
- **Trang báo cáo** với bảng doanh thu, lấp đầy ghế, top khách hàng
- **Responsive** cho mobile/tablet
