# AISA Local Voice Server (Piper TTS + RVC v2)

Hệ thống giọng nói cục bộ (Offline) tích hợp cho AISA Companion (MHEnt. Universe).

## Tính năng:
- **Base Speech Engine**: Piper TTS (Vietnamese vivos neural model) sinh giọng tiếng Việt offline siêu tốc (~0.4s).
- **RVC v2 Voice Conversion**: Chạy tăng tốc bằng phần cứng GPU CUDA (NVIDIA GeForce RTX) chuyển giọng sang:
  - 🌸 **Harmony**: Kamisato Ayaka (`ayaka-rmvpe.pth`)
  - 😈 **Echo**: Furina (`furina_rmvpe.pth`)
- **Tự động hóa**: Khởi động tự động khi chạy ứng dụng Desktop AISA (`npm start`), hoặc chạy độc lập bằng lệnh `npm run voice:server`.
- **API Endpoint**: `http://127.0.0.1:5055/synthesize`
