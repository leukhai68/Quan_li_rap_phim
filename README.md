# 🎬 PTIT Cinema — Hệ Thống Quản Lý Rạp Chiếu Phim

Hệ thống website quản lý rạp chiếu phim **PTIT Cinema** (tông màu xanh dương `#0054a6`), phục vụ bài tập lớn với kiến trúc Full-stack:
- **Backend**: Node.js + Express.js + MySQL2 (Promise) + JWT Authentication
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript thuần (Responsive Desktop & Mobile)
- **Database**: MySQL (`QuanLyRapChieuPhim_Final`)

---

## 📁 Cấu trúc thư mục dự án

```
BetaClone/
├── CSDL_RapChieuPhim.sql          ← Script CSDL gốc toàn bộ hệ thống
├── migration_nhanvien.sql         ← Migration bổ sung cột TrangThai cho bảng NHAN_VIEN
├── README.md                      ← Hướng dẫn cài đặt, chạy thử & tài liệu API
├── anh_video/                     ← Poster, video trailer và tài nguyên đa phương tiện
│
├── backend/                       ← Node.js & Express RESTful API
│   ├── server.js                  ← Entry point (khởi chạy cổng 5000)
│   ├── .env                       ← Biến môi trường kết nối MySQL & JWT Secret
│   ├── package.json
│   ├── config/
│   │   └── db.js                  ← MySQL Connection Pool (mysql2/promise)
│   ├── middleware/
│   │   └── auth.js                ← Middleware xác thực JWT & phân quyền vai trò
│   └── routes/
│       ├── auth.js                ← Đăng nhập, đăng ký, lấy thông tin cá nhân
│       ├── phim.js                ← Danh sách & chi tiết phim
│       ├── suatChieu.js           ← Quản lý suất chiếu & sơ đồ ghế
│       ├── sanPham.js             ← Quản lý bắp nước, combo
│       ├── datVe.js               ← Đặt vé, chọn ghế & thanh toán
│       ├── lichSu.js              ← Tra cứu lịch sử đặt vé & đơn hàng
│       ├── checkIn.js             ← Bàn làm việc soát vé, duyệt check-in vào rạp
│       ├── nhanVien.js            ← [MỚI] Quản lý nhân viên (CRUD, KPI, phân quyền)
│       └── baoCao.js              ← Thống kê doanh thu, tỷ lệ lấp đầy, top khách hàng
│
└── frontend/                      ← Giao diện người dùng (HTML/CSS/JS thuần)
    ├── index.html                 ← Trang chủ (Banner, phim đang chiếu/sắp chiếu, lịch chiếu)
    ├── phim.html                  ← Danh sách phim & bộ lọc thể loại, trạng thái
    ├── rap.html                   ← Thông tin hệ thống cụm rạp
    ├── giave.html                 ← Bảng giá vé theo loại ghế & quy định độ tuổi
    ├── tintuc.html                ← Tin tức điện ảnh & chương trình khuyến mãi
    ├── booking.html               ← Đặt vé, chọn suất chiếu, chọn ghế trực quan & bắp nước
    ├── booking-history.html       ← Lịch sử đặt vé dành cho khách hàng
    ├── checkin.html               ← Bàn làm việc Soát vé / Check-in dành cho nhân viên
    ├── nhanvien.html              ← [MỚI] Bàn làm việc Quản lý Nhân viên dành cho Quản trị viên
    ├── baocao.html                ← Báo cáo thống kê doanh thu & hiệu suất rạp
    ├── login.html                 ← Đăng nhập hệ thống (Khách hàng & Nhân viên)
    ├── register.html              ← Đăng ký tài khoản thành viên mới
    ├── css/
    │   ├── style.css              ← CSS dùng chung, layout 3 cột, header, footer, toast
    │   ├── phim.css               ← CSS trang phim
    │   └── baocao.css             ← CSS trang báo cáo
    └── js/
        ├── api.js                 ← Wrapper gọi toàn bộ API Backend & quản lý Auth Token
        ├── app.js                 ← Logic trang chủ, điều hướng header thông minh
        ├── phim.js                ← Logic trang danh sách phim
        ├── baocao.js              ← Logic biểu đồ & bảng báo cáo
        └── nhanvien.js            ← [MỚI] Logic quản lý nhân viên (CRUD, modal, tìm kiếm, lọc)
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### 1. Khởi tạo Cơ sở Dữ liệu MySQL

Mở MySQL Workbench, phpMyAdmin hoặc chạy lệnh MySQL CLI:

```bash
# 1. Import CSDL gốc
mysql -u root -p < CSDL_RapChieuPhim.sql

# 2. Chạy migration an toàn bổ sung cột TrangThai cho NHAN_VIEN
mysql -u root -p < migration_nhanvien.sql
```

> **Câu lệnh Migration an toàn**:
> ```sql
> USE QuanLyRapChieuPhim_Final;
> ALTER TABLE NHAN_VIEN
>   ADD COLUMN IF NOT EXISTS TrangThai ENUM('Đang làm', 'Nghỉ việc') NOT NULL DEFAULT 'Đang làm';
> UPDATE NHAN_VIEN SET TrangThai = 'Đang làm' WHERE TrangThai IS NULL;
> ```

### 2. Cấu hình Backend

Chỉnh sửa file `backend/.env` cho phù hợp với tài khoản MySQL máy của bạn:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here   # Thay bằng mật khẩu MySQL của bạn (hoặc để trống nếu root không có pass)
DB_NAME=QuanLyRapChieuPhim_Final
PORT=5000
JWT_SECRET=ptit_cinema_secret_jwt_key_2026
```

### 3. Cài đặt thư viện & Khởi chạy Backend

```bash
cd backend
npm install
npm start
```

Backend Server sẽ hoạt động tại: **`http://localhost:5000`**

### 4. Mở Giao diện Frontend

- **Cách 1 (Khuyên dùng)**: Mở thư mục dự án bằng Visual Studio Code, click chuột phải vào file `frontend/index.html` và chọn **Open with Live Server** (cổng `http://localhost:5500` hoặc `5173`).
- **Cách 2**: Sử dụng bất kỳ web server local nào trỏ vào thư mục `frontend/`.

---

## 👥 Danh sách Tài khoản Kiểm thử Hệ thống

| Vai trò | Mã / SĐT | Mật khẩu | Quyền hạn & Chức năng |
| :--- | :--- | :--- | :--- |
| **Quản lý / Quản trị viên** | `0933333333` *(NV003 - Trần Văn Minh)* | `123456` | Toàn quyền Quản lý nhân viên (`nhanvien.html`), Báo cáo doanh thu (`baocao.html`), Soát vé (`checkin.html`). |
| **Quản lý ca** | `0988888888` *(NV008 - Vũ Ngọc Anh)* | `123456` | Quyền Quản lý ca, Quản lý nhân viên, Báo cáo & Soát vé. |
| **Nhân viên Soát vé** | `0922222222` *(NV002 - Nguyễn Văn Nam)* | `123456` | Soát vé / Check-in vào rạp (`checkin.html`). Bị chặn truy cập Quản lý nhân viên. |
| **Nhân viên Thu ngân** | `0911111111` *(NV001 - Phạm Thị Hoa)* | `123456` | Bán vé, giao bắp nước. Bị chặn truy cập Quản lý nhân viên. |
| **Khách hàng thành viên** | `0912345678` *(KH001 - Nguyễn Văn An)* | `123456` | Đặt vé, chọn ghế, mua bắp nước, xem lịch sử vé cá nhân. |

---

## 👔 Chức năng Quản lý Nhân viên (Chi tiết)

Trang giao diện: **`frontend/nhanvien.html`**

1. **Danh sách & Thống kê KPI**:
   - Hiển thị đầy đủ 9 cột: *Mã nhân viên, Họ tên, Ngày sinh, Số điện thoại, Địa chỉ, Ngày vào làm, Vị trí công việc, Lương cơ bản và Thao tác*.
   - 4 Thẻ KPI: *Tổng số nhân viên, Đang làm việc, Đã nghỉ việc, Số vị trí công việc*.
   - Tìm kiếm linh hoạt theo Mã NV, Họ tên hoặc Số điện thoại.
   - Lọc theo Vị trí công việc và Trạng thái làm việc.
   - Sắp xếp đa dạng theo Ngày vào làm, Vị trí, Họ tên, Lương.
   - Phân trang chuẩn khi có nhiều dữ liệu.

2. **Thêm nhân viên mới**:
   - Biểu mẫu nhập liệu chuẩn: Họ tên, Ngày sinh, Số điện thoại, Địa chỉ, Ngày vào làm, Vị trí công việc, Lương cơ bản, Mật khẩu.
   - Tự động sinh mã nhân viên chuẩn quy tắc hệ thống (`NV` + 3 số).
   - Kiểm tra dữ liệu: Chống trùng lặp SĐT, kiểm tra định dạng SĐT Việt Nam, bắt buộc đủ 18 tuổi trở lên, lương không âm.

3. **Sửa thông tin nhân viên**:
   - Tải dữ liệu cũ vào form.
   - **Bảo toàn khóa ngoại**: Khóa trường Mã nhân viên (`readonly`) để bảo vệ tính toàn vẹn dữ liệu.
   - Cho phép đặt lại mật khẩu mới cho nhân viên.

4. **Xóa & Vô hiệu hóa an toàn (Không làm hỏng ràng buộc CSDL)**:
   - Có hộp thoại xác nhận.
   - Ngăn chặn người dùng tự xóa chính mình.
   - **Xử lý quan hệ CSDL**: Nếu nhân viên đã có lịch sử soát vé trong bảng `CHECK_IN` (như `NV002`), hệ thống sẽ chuyển sang trạng thái **"Nghỉ việc"** và khóa đăng nhập để bảo toàn dữ liệu lịch sử.
   - Nếu nhân viên chưa có dữ liệu liên quan: Xóa vĩnh viễn khỏi database.
   - Cung cấp nút **"Khôi phục"** đưa nhân viên trở lại trạng thái "Đang làm" và mở lại quyền đăng nhập.

5. **Xem chi tiết nhân viên**:
   - Xem đầy đủ thông tin cá nhân, chức vụ, mức lương.
   - Thống kê tổng số lượt soát vé và danh sách 15 lượt check-in gần nhất (kèm mã vé, ghế, phim, phòng chiếu, thời gian).

---

## 🔌 Danh mục API Endpoints

### 1. Quản lý Nhân viên (Yêu cầu Token Quản trị viên)
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/nhan-vien` | Quản lý | Lấy danh sách NV (query: `search`, `viTri`, `trangThai`, `sortBy`, `sortOrder`, `page`, `limit`) + KPI |
| `GET` | `/api/nhan-vien/:id` | Quản lý | Xem chi tiết 1 nhân viên + lịch sử soát vé |
| `POST` | `/api/nhan-vien` | Quản lý | Thêm nhân viên mới (tự sinh mã `NVxxx`, kiểm tra trùng lặp) |
| `PUT` | `/api/nhan-vien/:id` | Quản lý | Cập nhật thông tin nhân viên (khóa mã NV) |
| `DELETE` | `/api/nhan-vien/:id` | Quản lý | Xóa nhân viên hoặc vô hiệu hóa (`Nghỉ việc`) nếu có check-in |
| `PATCH` | `/api/nhan-vien/:id/khoi-phuc` | Quản lý | Khôi phục nhân viên về trạng thái `Đang làm` |

### 2. Xác thực & Tài khoản
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Đăng nhập bằng Email / SĐT / Mã tài khoản (Khách hàng & NV) |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản thành viên mới |
| `GET` | `/api/auth/me` | Authenticated | Lấy thông tin tài khoản đang đăng nhập |

### 3. Phim & Suất chiếu
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/phim` | Lấy danh sách phim (query: `?trangthai=Đang chiếu`) |
| `GET` | `/api/phim/:id` | Chi tiết phim |
| `GET` | `/api/suat-chieu` | Lịch chiếu phim (query: `?maPhim=P001&ngay=2026-10-22`) |
| `GET` | `/api/suat-chieu/:id` | Chi tiết suất chiếu & trạng thái từng ghế |

### 4. Đặt vé & Sản phẩm
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/san-pham` | Danh sách bắp nước, combo |
| `GET` | `/api/dat-ve/danh-sach-khuyen-mai` | [MỚI] Danh sách 4 khuyến mãi khả dụng (KM001, KM002, KM003, KM004) kèm số lượt đã dùng, còn lại và thang % |
| `POST` | `/api/dat-ve` | Tạo đơn đặt vé, giữ ghế, chọn sản phẩm và áp dụng khuyến mãi |
| `GET` | `/api/lich-su` | Tra cứu lịch sử đặt vé |

### 5. Check-in & Báo cáo
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/check-in/tim-kiem` | Nhân viên | Tra cứu vé theo mã vé, mã đơn, tên khách, SĐT |
| `POST` | `/api/check-in/xac-nhan` | Nhân viên | Soát vé / Check-in vào rạp và giao bắp nước |
| `GET` | `/api/check-in/danh-sach-cho-duyet` | Nhân viên | Danh sách vé mới đặt đang chờ duyệt |
| `GET` | `/api/bao-cao/doanh-thu-phim` | Quản lý | Báo cáo doanh thu theo phim |
| `GET` | `/api/bao-cao/lap-day-ghe` | Quản lý | Thống kê tỷ lệ lấp đầy ghế các phòng chiếu |
| `GET` | `/api/bao-cao/top-khach-hang` | Quản lý | Top 10 khách hàng chi tiêu nhiều nhất |

---

## 🎟️ Cập nhật Bảng Giá Vé & Khuyến Mãi (Mới Nhất)

1. **Cơ sở dữ liệu Khuyến mãi (Chuẩn hóa 4 mã KM001 đến KM004)**:
   - Bảng `KHUYEN_MAI` lưu đúng 4 bản ghi khả dụng: `KM001` (Ưu đãi thành viên), `KM002` (Ưu đãi sinh viên), `KM003` (Giảm giá cuối tuần), `KM004` (Combo tiết kiệm - trước đây là KM005 đổi sang KM004).
   - Đã loại bỏ hoàn toàn các mã không dùng (`KM006`) khỏi CSDL gốc, API backend và danh sách lựa chọn frontend.
   - **Câu lệnh SQL cập nhật an toàn (chống lỗi khóa ngoại)**:
     ```sql
     -- Cập nhật đổi tên mã KM005 thành KM004
     UPDATE DAT_VE SET MaKhuyenMai = 'KM004' WHERE MaKhuyenMai = 'KM005';
     UPDATE KHUYEN_MAI SET MaKhuyenMai = 'KM004' WHERE MaKhuyenMai = 'KM005';
     ```

2. **Bảng Giá Vé (`frontend/giave.html`)**:
   - Bảng giá vé được chuẩn hóa thành **3 cột**: *Loại ghế*, *Giá vé ngày thường (Thứ 2 - Thứ 6)* và *Giá vé cuối tuần (Thứ 7 - CN)*.
   - **Quy tắc hiển thị giá**: 
     - Ghế Thường: **75.000 VNĐ** (Ngày thường) | **60.000 VNĐ** (Cuối tuần)
     - Ghế VIP: **100.000 VNĐ** (Ngày thường) | **85.000 VNĐ** (Cuối tuần)
     - Ghế Đôi: **130.000 VNĐ** (Ngày thường) | **115.000 VNĐ** (Cuối tuần)
   - Đã xóa hoàn toàn chú thích/badge `-15.000đ (KM003)` bên cạnh mức giá cuối tuần để bảng hiển thị trực quan, sạch sẽ và chuyên nghiệp.
   - Toàn bộ khối thẻ khuyến mãi đã được gỡ khỏi trang Bảng giá vé để hiển thị độc quyền tại trang Đặt vé.

3. **Kiểm tra Điều kiện Khuyến mãi theo Thời điểm & Đối tượng (`frontend/booking.html`)**:
   - Hệ thống trang bị hàm kiểm tra tính hợp lệ `checkPromoEligibility(promoCode, subTotal, snackTotal)` và tự động lấy thông tin ngày chiếu qua `getShowtimeInfo()`:
     - **Mã `KM003` (Giảm giá cuối tuần)**: **Chỉ áp dụng cho các suất chiếu diễn ra vào Thứ Bảy & Chủ Nhật** và đơn hàng tối thiểu 80.000đ. Nếu kiểm thử với suất chiếu ngày thường (ví dụ: Thứ Ba ngày 20/10/2026), hệ thống sẽ từ chối áp dụng và hiển thị thông báo cảnh báo rõ ràng:
       > ⚠️ *Mã KM003 chỉ áp dụng cho suất chiếu Thứ Bảy & Chủ Nhật. Suất chiếu đang chọn diễn ra vào Thứ Ba (09:00 20/10/2026).*
     - **Mã `KM004` (Combo tiết kiệm)**: Bắt buộc đơn hàng phải mua kèm ít nhất 1 phần bắp nước hoặc combo (`snackTotal > 0`) và đơn từ 60.000đ. Nếu chưa chọn bắp nước, hệ thống báo:
       > ⚠️ *Mã combo tiết kiệm yêu cầu mua kèm ít nhất 1 phần Bắp nước hoặc Combo ở mục '3. Chọn bắp nước & Combo'.*
     - **Mã `KM001` (Ưu đãi thành viên)**: Kiểm tra tài khoản thành viên đã đăng nhập và đơn từ 50.000đ.
     - **Mã `KM002` (Ưu đãi sinh viên)**: Áp dụng đơn từ 40.000đ (Lưu ý xuất trình thẻ HSSV/CCCD khi nhận vé tại quầy).
   - **Giao diện phản hồi thông minh**:
     - Khi **Đủ điều kiện**: Khối `#applied-promo-box` hiển thị màu xanh lá kèm số tiền giảm (`-15.000đ`), dòng *Khuyến mãi áp dụng* hiển thị tiền giảm, và số tiền tại *Tổng thanh toán* được trừ đi tương ứng.
     - Khi **Chưa đủ điều kiện**: Khối `#applied-promo-box` đổi sang màu đỏ cảnh báo kèm lý do chi tiết vì sao không áp dụng được, dòng *Khuyến mãi áp dụng* hiển thị `0 đ (Chưa đủ ĐK)`, và *Tổng thanh toán* giữ nguyên giá gốc.
     - Khối **Tình trạng ưu đãi** (Thang % tiến độ, đã dùng, còn lại) vẫn hiển thị đồng bộ 100% theo mã được chọn từ dropdown, kèm huy hiệu trạng thái *Đủ điều kiện* hoặc *Chưa đủ điều kiện*.

---

## 🛡️ Bảo mật & Thiết kế Kỹ thuật
- **SQL Injection Prevention**: 100% truy vấn MySQL sử dụng Parameterized Query với `mysql2/promise`.
- **Phân quyền Backend**: Kiểm tra tính hợp lệ của Token JWT và quyền hạn tại server, không chỉ ẩn nút trên giao diện.
- **Toàn vẹn Dữ liệu**: Bảo vệ khóa chính, bảo toàn lịch sử giao dịch và check-in bằng cơ chế Soft-delete / Deactivation khi có liên kết khóa ngoại.
- **Giao diện Responsive**: Hoạt động mượt mà trên cả máy tính bàn, laptop và thiết bị di động.
