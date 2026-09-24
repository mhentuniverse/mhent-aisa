# AISA Companion Sanctuary 🌸😈
> **Personal AI Sanctuary for Yurika & MHEnt Universe**  
> Dedicated Domain: [`aisa.mhentuniverse.com`](https://aisa.mhentuniverse.com)  
> Organization: **Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe**

---

## 🌟 Giới Thiệu (Overview)

**AISA Companion Sanctuary** là hệ sinh thái AI đồng hành cá nhân độc lập dành riêng cho Người sáng lập Yurika và vũ trụ MHEnt Universe. Khác với các chatbot hỗ trợ người dùng đại trà, AISA là một **"Sanctuary"** riêng tư – nơi đồng hành, lắng nghe, hỗ trợ công việc và chăm sóc sức khỏe tinh thần mỗi ngày.

### 🎭 Song Hành Nhân Cách (Dual Personas)
1. **🌸 Harmony (Thấu Cảm & Dịu Dàng):**
   - Luôn ân cần, lắng nghe, chăm lo giấc ngủ, sức khỏe và giảm tải áp lực.
   - Giọng điệu ấm áp, xưng hô gần gũi: *"cậu - em / Harmony"*.
2. **😈 Echo (Sắc Sảo & Tinh Nghịch):**
   - Đầy năng lượng, thích cà khịa nhẹ nhàng (witty & playful banter), thúc đẩy tiến độ và chống trì hoãn.
   - Thẳng thắn, hài hước, xưng hô bạn bè: *"cậu - tớ / Echo"*.
3. **🎭 Chế độ Song Hành (Duo Mode):** Cả hai nhân cách cùng phối hợp và tương tác đa chiều trong cùng một cuộc trò chuyện.

---

## 🧠 Kiến Trúc Kỹ Thuật (Architecture)

- **Neural Brain Core:** Llama 3.3 70B Instruct (Cloudflare Workers AI Gateway).
- **Vision AI Engine:** Llama 3.2 Vision OCR bóc tách từ vựng & phân tích ảnh tài liệu/sách vở.
- **Long-Term Memory Vault:** Edge SQLite Cloudflare D1 (`personal_memory`, `saved_info`).
- **Data & Calendar Bridge:** Supabase REST API (quản lý lịch trình, sự kiện theo múi giờ Việt Nam UTC+7).
- **Voice Synthesis & Ambient:** Web Speech API (tinh chỉnh pitch/rate riêng biệt theo nhân cách) + Web Audio API bộ tạo sóng âm 432Hz xoa dịu tâm trí.
- **Frontend Stack:** Pure Modern Vanilla JS & CSS Grid/Flexbox, Glassmorphism Cyberpunk theme, Zero build-step requirement, SPA Routing ready (`vercel.json`).

---

## 🚀 Triển Khai (Deployment Guide)

### 1. Kết Nối Vercel / Cloudflare Pages
1. Import repository `mhentuniverse/mhent-aisa` vào Vercel hoặc Cloudflare Pages.
2. Thiết lập:
   - **Framework Preset:** `Other` (Static HTML).
   - **Build Command:** *(Để trống)*.
   - **Output Directory:** `./` (hoặc thư mục gốc).
3. Thêm Custom Domain: `aisa.mhentuniverse.com`.
4. Cấu hình bản ghi CNAME hoặc DNS theo hướng dẫn của nhà cung cấp.

---

## 📂 Cấu Trúc Dự Án (Folder Structure)

```
mhent-aisa/
├── assets/
│   ├── icon-logo.png
│   └── logo-design.png
├── css/
│   ├── main.css          # Design tokens, reset, typography & layout grid
│   ├── chat.css          # Chat bubbles, markdown formatting, typing animations
│   └── components.css    # Persona cards, memory vault, vision lab, modals
├── js/
│   ├── config.js         # API endpoints, Supabase credentials, storage keys
│   ├── markdown.js       # Custom markdown & code syntax highlighter
│   ├── ai-engine.js      # Backend API communication & dual persona parsing
│   ├── voice.js          # Speech-to-text, voice synthesis & 432Hz ambient sound
│   ├── memory.js         # Long-term facts, memory vault & D1 sync
│   ├── vision.js         # Drag-and-drop image OCR lab (Llama 3.2 Vision)
│   └── app.js            # Main application controller & state management
├── index.html            # Main SPA Sanctuary document
├── manifest.json         # PWA Manifest
├── vercel.json           # SPA rewrites & clean routing
└── README.md
```

---
*© 2026 Miyazaki Haruto Entertainment Co., Ltd. All Rights Reserved.*
