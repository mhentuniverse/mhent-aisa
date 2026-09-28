// ============================================================================
// AISA DESKTOP BRIDGE (NATIVE WINDOWS SYSTEM & FILE INTEGRATION)
// Tích hợp siêu việt giữa Trợ lý AISA và Hệ thống Tệp tin Máy tính
// ============================================================================

window.AisaDesktopBridge = {
  isAvailable() {
    return Boolean(window.AisaDesktop && window.AisaDesktop.isDesktop);
  },

  async init() {
    if (!this.isAvailable()) {
      return;
    }

    console.log('%c[AISA Desktop Edition Active] 🖥️ Native File System Ready', 'color: #38bdf8; font-weight: bold;');

    // 1. Thêm class nhận diện desktop cho body
    document.body.classList.add('aisa-desktop-mode');

    // 2. Thêm huy hiệu Desktop Edition trên Header hoặc Sidebar
    this.injectDesktopIndicator();

    // 3. Khởi tạo công cụ chọn thư mục làm việc (Workspace Picker)
    this.injectDesktopTools();

    // 4. Lấy các đường dẫn hệ thống mặc định (Desktop, Documents, Downloads)
    try {
      this.specialPaths = await window.AisaDesktop.getSpecialPaths();
    } catch (e) {
      this.specialPaths = {};
    }
  },

  injectDesktopIndicator() {
    const brandSub = document.querySelector('.brand-sub');
    if (brandSub && !document.getElementById('badge-desktop-edition')) {
      const badge = document.createElement('span');
      badge.id = 'badge-desktop-edition';
      badge.className = 'desktop-edition-badge';
      badge.innerHTML = ' • <span style="color: #38bdf8; font-weight: 600;">Desktop Edition 🖥️</span>';
      brandSub.appendChild(badge);
    }
  },

  injectDesktopTools() {
    // Thêm nút "Mở tệp/thư mục máy tính" vào popover Capsule Tools
    const popover = document.getElementById('capsule-tools-popover');
    if (popover && !document.getElementById('tool-item-desktop-folder')) {
      const toolItem = document.createElement('div');
      toolItem.className = 'tool-popover-item';
      toolItem.id = 'tool-item-desktop-folder';
      toolItem.innerHTML = `
        <div class="tool-popover-icon" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="tool-popover-text">
          <div class="tool-popover-title">Thư mục máy tính (Workspace)</div>
          <div class="tool-popover-desc">Chọn thư mục trên máy để Harmony & Echo đọc và quản lý</div>
        </div>
      `;

      toolItem.addEventListener('click', async () => {
        popover.classList.remove('active');
        const btnTools = document.getElementById('btn-capsule-tools');
        if (btnTools) btnTools.classList.remove('active-popover');
        await this.handleSelectWorkspace();
      });

      // Chèn lên đầu popover
      popover.insertBefore(toolItem, popover.firstChild);
    }
  },

  async handleSelectWorkspace() {
    if (!this.isAvailable()) return;
    try {
      const res = await window.AisaDesktop.openDirectoryDialog({
        title: 'Chọn thư mục dự án / không gian làm việc cho AISA'
      });

      if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
        const folderPath = res.filePaths[0];
        const dirData = await window.AisaDesktop.readDirectory(folderPath);

        if (dirData && dirData.success) {
          const folderName = folderPath.split(/[\\/]/).pop() || folderPath;
          const itemsCount = dirData.items ? dirData.items.length : 0;
          
          if (window.AisaToast) {
            window.AisaToast.show(`Đã liên kết thư mục: ${folderName} (${itemsCount} tệp) 📂`, '✨');
          }

          // Tự động chèn thông tin thư mục vào khung chat để người dùng gửi lệnh cho AISA
          const input = document.getElementById('chat-input');
          if (input) {
            input.value = `Echo và Harmony ơi, tớ vừa liên kết thư mục [${folderName}] (${folderPath}) gồm ${itemsCount} tệp. Các cậu xem qua và hỗ trợ tớ nhé!`;
            input.focus();
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 140) + 'px';
          }
        }
      }
    } catch (err) {
      console.warn('[Desktop Workspace Notice]:', err);
    }
  },

  // Phương thức mở trực tiếp file hoặc thư mục trên máy
  async openPath(targetPath) {
    if (!this.isAvailable()) return;
    try {
      const res = await window.AisaDesktop.openPath(targetPath);
      if (res.success) {
        if (window.AisaToast) window.AisaToast.show('Đã mở trên Windows ↗', '📂');
      } else {
        if (window.AisaToast) window.AisaToast.show(res.error || 'Không mở được tệp', '⚠️');
      }
    } catch (e) {
      console.warn(e);
    }
  },

  // Phương thức hiển thị tệp trong File Explorer
  async showInFolder(targetPath) {
    if (!this.isAvailable()) return;
    try {
      await window.AisaDesktop.showInFolder(targetPath);
      if (window.AisaToast) window.AisaToast.show('Đang mở thư mục trong Explorer 📂', '✨');
    } catch (e) {}
  },

  // Tự động phát hiện đường dẫn tệp trong tin nhắn để tạo nút bấm "Mở trên máy tính"
  enhanceMessageWithLocalPaths(htmlContent) {
    if (!this.isAvailable() || !htmlContent) return htmlContent;

    // Regex phát hiện đường dẫn Windows (C:\... hoặc D:\...)
    const pathRegex = /([A-Za-z]:\\[^\s<>"'\n\r\t]+)/g;
    return htmlContent.replace(pathRegex, (fullMatch) => {
      const cleanPath = fullMatch.replace(/[.,;:)\]]+$/, ''); // Loại bỏ dấu chấm phẩy ở cuối
      const escaped = cleanPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<span class="local-path-tag" title="Nhấp để mở trên máy tính" onclick="window.AisaDesktopBridge.openPath('${escaped}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 3px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>${cleanPath}</span>`;
    });
  }
};

// Tự động kích hoạt khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
  window.AisaDesktopBridge.init();
});
