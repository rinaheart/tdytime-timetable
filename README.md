# TdyTime v2 — Phân tích & Báo cáo Lịch giảng

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/offline-100%25%20Zero--CDN-emerald.svg?style=flat-square" alt="Offline Ready">
  <img src="https://img.shields.io/badge/security-CSP%20Hardened-indigo.svg?style=flat-square" alt="Security">
  <img src="https://img.shields.io/badge/tests-Playwright%20100%25%20Pass-brightgreen.svg?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/license-MIT-slate.svg?style=flat-square" alt="License">
</p>

**TdyTime V2** là ứng dụng web Single Page Application (SPA) hiệu năng cao, hoạt động **100% Offline** không phụ thuộc backend hay CDN. Tự động load file HTML lịch giảng tín chỉ, quản lý chương trình khung, tự động khớp kế hoạch bài giảng (auto-mapping LT/TH) và xuất báo cáo.

---

## 🌟 Tính năng nổi bật

### 1. Phân tích lịch giảng đa chiều
- **Nạp dữ liệu linh hoạt**: Hỗ trợ kéo-thả tệp HTML xuất từ cổng tín chỉ hoặc dán trực tiếp mã nguồn HTML.
- **3 chế độ xem đa trục**:
  - **Lớp học phần**: Xem chi tiết từng lớp, lịch trình từng buổi, phòng học, ca dạy.
  - **Lớp sinh viên**: Lọc theo lớp danh khóa (Y, Dược, Điều dưỡng, Y tế công cộng...).
  - **Học phần**: Tổng hợp khối lượng và danh sách các lớp thuộc cùng một môn.
- **Lật lớp thông minh**: Nút chuyển lớp trước/sau (Prev/Next) tiện lợi.

### 2. Quản lý chương trình khung (curriculum syllabus)
- Nhập liệu trực tiếp từ bảng tính Excel hoặc tài liệu Word dạng bảng.
- Bộ đếm dòng dữ liệu thời gian thực (Real-time line counter).
- Nạp nhanh dữ liệu mẫu và tải bảng mẫu chuẩn Excel (.xlsx).
- Hiển thị danh sách thẻ môn học (Subject chips) và tự động đối chiếu môn tương ứng.

### 3. Khớp kế hoạch giảng dạy tự động (auto-mapping)
- Thuật toán ánh xạ tự động số buổi học thực tế trên lịch với các bài học trong chương trình khung.
- Tự động phân bổ số tiết Lý thuyết (LT) và Thực hành (TH) tương ứng từng buổi.
- Không phát sinh nút thừa; tự động khôi phục kết quả mapping bền vững khi tải lại trang (F5 resilience).

### 4. Báo cáo & xuất dữ liệu đa định dạng
- **Xuất Excel (.xlsx)**: Tạo bảng tính Excel chuyên nghiệp có màu sắc nhận diện, viền ô và canh lề chuẩn cho từng lớp hoặc gộp tất cả các lớp.
- **Xuất CSV**: Mã hóa chuẩn `UTF-8 with BOM` chống lỗi font tiếng Việt khi mở trên Microsoft Excel.
- **Copy Markdown**: Sao chép lịch trình dưới dạng bảng Markdown chuẩn 1 chạm với cơ chế fallback 2 tầng, hoạt động trên mọi môi trường (`file:///`, localhost, HTTPS).

### 5. Thống kê & phân tích giảng dạy
- 4 thẻ KPI tổng quan: Tổng số lớp, số lớp sinh viên, tổng số tiết và số lượt dạy.
- Thống kê tỷ lệ phân bố ca dạy (Sáng / Chiều / Tối) với Semantic Gradient Badges.
- Thống kê danh sách giảng đường và tần suất sử dụng.

### 6. Trải nghiệm người dùng & an toàn dữ liệu
- **Zero-Jank Sidebar Engine**: Cố định tâm trục X của toàn bộ icon navigation tại `40.0px` (`Delta X = 0.0px`) cả khi co lẫn mở, không rung giật.
- **Pill Action System**: Hệ thống nút bấm bo tròn mềm mại (`rounded-full`) chuẩn thiết kế hiện đại.
- **Chế độ Giao diện Sáng / Tối (Dark Mode)** tối ưu cho làm việc ban đêm.
- **Bảo vệ chống bấm nhầm**: Nút "Đổi lịch giảng" không tự ý xóa dữ liệu; hỗ trợ quay lại tức thì qua banner hoặc click tab sidebar; chỉ ghi đè khi nạp file mới.

---

## 🛡️ Tiêu chuẩn bảo mật & hiệu năng

- **100% Offline (Zero CDN)**: Toàn bộ thư viện bên thứ ba (`SheetJS`, `ExcelJS`, `Lucide Icons`) được lưu trữ nội bộ tại `vendor/`, miễn nhiễm với rủi ro tấn công chuỗi cung ứng (Supply Chain attacks).
- **Chính sách CSP khắt khe**: Thẻ `<meta http-equiv="Content-Security-Policy">` khóa cứng `default-src 'self'`, chặn toàn bộ script từ domain bên ngoài.
- **Khử Formula Injection (CWE-1236)**: Tự động gắn tiền tố `'` cho các ô bắt đầu bằng `=, +, -, @, \t, \r` trước khi xuất file Excel/CSV.
- **Triệt tiêu DOM XSS**: Mọi dữ liệu đầu vào người dùng được xử lý qua bộ lọc `esc()` trước khi render HTML.
- **Biên dịch tĩnh Tailwind CSS**: Bundle CSS tĩnh chỉ **26.8 KB** (Zero-JIT), không nạp compiler runtime trên trình duyệt.
- **Tối ưu Payload LocalStorage**: Lọc sạch rác DOM, giảm 90% kích thước dữ liệu lưu trong trình duyệt (< 200 KB).

---

## 📁 Cấu trúc thư mục

```
app/
├── index.html                  # Khung giao diện ứng dụng chính
├── tailwind.config.js          # Cấu hình Design Tokens & Fonts
├── css/
│   ├── style.css               # Stylesheet tùy biến, 0-jank sidebar, tokens
│   ├── tailwind-input.css      # Directives cho Tailwind CLI
│   └── tailwind.min.css        # CSS tĩnh biên dịch sẵn (26.8 KB)
├── vendor/                     # Thư viện bên thứ ba cục bộ (100% Offline)
│   ├── xlsx.full.min.js        # SheetJS v0.18.5
│   └── exceljs.min.js          # ExcelJS v4.3.0
├── js/
│   ├── main.js                 # Khởi tạo ứng dụng và luồng nạp tệp
│   ├── state.js                # Quản lý trạng thái reactive in-memory
│   ├── services/
│   │   ├── TimetableParser.js  # Bóc tách DOM lịch giảng từ HTML
│   │   ├── CurriculumParser.js # Bóc tách chương trình khung TSV/CSV
│   │   ├── TimetableMapper.js  # Thuật toán ánh xạ lịch & bài giảng
│   │   ├── ExcelExporter.js    # Xuất ExcelJS, SheetJS CSV, Markdown copy
│   │   └── StorageService.js   # Quản lý LocalStorage & nén payload
│   ├── views/
│   │   ├── NavigationView.js   # Điều hướng tab, co dãn sidebar, đổi file
│   │   ├── TimetableView.js    # Hiển thị chi tiết lịch lớp học phần
│   │   ├── CurriculumView.js   # Quản lý CTK và liên kết môn
│   │   ├── MappingView.js      # Giao diện kế hoạch giảng dạy đã khớp
│   │   ├── StatisticsView.js   # Dashboard phân tích và thống kê KPI
│   │   └── UIComponents.js     # Thẻ item danh mục và nhãn chip
│   └── utils/
│       ├── icons.js            # Zero-Runtime SVG Icons Registry (5.9 KB, 30 icons)
│       ├── string-utils.js     # Hàm esc() khử XSS
│       └── csv-parser.js       # Phân tích cú pháp dòng bảng tính
└── assets/                     # Dữ liệu mẫu và biểu tượng
```

---

## 🚀 Hướng dẫn sử dụng

### Mở trực tiếp (không cần cài đặt)
1. Tải về thư mục mã nguồn.
2. Nhấp đúp chuột vào file `index.html` để mở trên bất kỳ trình duyệt nào (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).

### Chạy trên local web server
Nếu bạn muốn chạy qua HTTP Server cục bộ:
```bash
# Sử dụng Python (có sẵn trên máy)
python -m http.server 3000

# Hoặc sử dụng Node.js npx serve
npx serve -p 3000
```
Sau đó truy cập địa chỉ: `http://localhost:3000`.

### Triển khai lên web (github pages / vercel)
- **GitHub Pages**: Đẩy toàn bộ nội dung thư mục này lên branch `main` hoặc `gh-pages`, vào `Settings > Pages` chọn nguồn phát hành từ thư mục root.
- **Vercel / Cloudflare Pages / Netlify**: Kéo thả thư mục hoặc kết nối Git, chọn Framework là `Other` (Static HTML).

---

## 🧪 Kiểm thử tự động (automated testing)

Dự án được bảo chứng chất lượng bởi 6 bộ test tự động E2E bằng **Playwright (Python)** với tỷ lệ **100% PASS** và **0 console errors**:

| Kịch bản kiểm thử | Mô tả mục tiêu | Kết quả |
|:---|:---|:---:|
| `test_offline_security.py` | Kiểm tra 0 request CDN ngoài, CSP active, nạp vendor local | **PASS** |
| `test_accidental_reset_safety.py` | Kiểm tra cơ chế an toàn chống xóa nhầm khi bấm Đổi lịch | **PASS** |
| `test_all_features.py` | Kiểm tra xuyên suốt 14 tính năng từ upload đến xuất file | **PASS** |
| `test_tab5_refinement.py` | Kiểm tra tự động mapping, không nút trùng, F5 lưu trạng thái | **PASS** |
| `test_tdytime_refinement.py` | Kiểm tra Sidebar 0-jank (Delta X = 0.0px), Header 56px | **PASS** |
| `test_audit_fixes.py` | Kiểm tra tải thực tế file Excel qua `expect_download()` | **PASS** |

---

## 👨‍🏫 Tác giả & Bản quyền

- **Tác giả:** TdyPhan
  Email: tdyphan@gmail.com
- **Giấy phép:** [MIT License](LICENSE) — Tự do sử dụng, chỉnh sửa và phân phối cho mục đích học tập, nghiên cứu và giảng dạy.
