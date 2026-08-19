# SeoulSkin - Full-Stack K-Beauty Shopping Mall

Phiên bản full-stack của cửa hàng mỹ phẩm Hàn Quốc: **Express + SQLite + JWT**, giao diện bán hàng + trang quản trị.

## Tính năng

- **Backend REST API** với Express.js và SQLite (better-sqlite3)
- **Xác thực JWT** với mật khẩu hash bằng bcryptjs
- **CRUD sản phẩm** (admin)
- **Đặt hàng** với tính phí ship tự động (miễn phí cho đơn ≥ ₫499.000)
- **Quản lý đơn hàng** (admin duyệt trạng thái)
- **Trang quản trị** hiển thị đơn và sản phẩm
- **Frontend responsive** với giỏ hàng drawer, modal đăng nhập, modal thanh toán

## Yêu cầu

- Node.js 18+
- npm

## Cài đặt và chạy

```bash
cd shop
npm install
node seed.js    # Khởi tạo database + seed sản phẩm + tài khoản demo
node server.js  # Khởi động server ở cổng 3000
```

Sau khi chạy, mở trình duyệt:

- http://localhost:3000/ — Trang bán hàng
- http://localhost:3000/admin — Trang quản trị

## Tài khoản seed

| Vai trò | Email | Mật khẩu |
|---------|----------------|-----------|
| Admin | admin@seoulskin.com | admin123 |
| Khách hàng demo | demo@seoulskin.com | demo1234 |

## API endpoints

### Sản phẩm

- `GET /api/products` — Danh sách sản phẩm
- `GET /api/products/category/:category` — Lọc theo danh mục
- `GET /api/products/:id` — Chi tiết sản phẩm

### Xác thực

- `POST /api/auth/register` — Đăng ký `{ email, password, name, phone }`
- `POST /api/auth/login` — Đăng nhập `{ email, password }`
- `GET /api/auth/me` — Lấy user hiện tại (yêu cầu JWT)

### Đơn hàng

- `POST /api/orders` — Tạo đơn (yêu cầu JWT)
- `GET /api/orders/my` — Đơn của user hiện tại (yêu cầu JWT)
- `GET /api/orders` — Tất cả đơn (yêu cầu admin)
- `PATCH /api/orders/:id` — Cập nhật trạng thái `{ status }` (yêu cầu admin)

### Admin

- `POST /api/admin/products` — Tạo sản phẩm (yêu cầu admin)
- `DELETE /api/admin/products/:id` — Xóa sản phẩm (yêu cầu admin)

## Cấu trúc

```
shop/
├── package.json
├── server.js           # Express server + routes
├── db.js               # SQLite schema + connection
├── seed.js             # Seed data
├── shop.db             # File SQLite (sinh ra sau khi seed)
└── public/
    ├── index.html      # Trang bán hàng
    ├── admin.html      # Trang quản trị
    ├── styles.css
    ├── app.js
    └── admin.js
```

## Luồng test nhanh

1. `POST /api/auth/register` — tạo tài khoản
2. `POST /api/auth/login` — lấy token
3. `POST /api/orders` với body:
   ```json
   {
     "recipient_name": "Nguyen Lan",
     "recipient_phone": "0901234567",
     "address": "123 CMT8",
     "city": "TP. Hồ Chí Minh",
     "payment_method": "cod",
     "items": [{ "productId": 1, "qty": 2 }]
   }
   ```
4. `GET /api/orders` (admin) để kiểm tra đơn mới

## Công nghệ

- Express 4
- better-sqlite3 11
- bcryptjs 2
- jsonwebtoken 9
- Vanilla JS + CSS ở frontend
