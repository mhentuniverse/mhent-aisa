/**
 * AISA COMPANION - MASTER PASSCODE AUTHENTICATION & LOCK SCREEN
 * Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe
 * 
 * Quản lý mở khóa Sanctuary theo phong cách Màn hình khóa Máy tính (Computer Lock Screen).
 * Không phụ thuộc vào Google Account hay Firebase bên ngoài.
 * Mặc định nhận diện Master Yurika (Sakura), mở khóa bằng mã PIN / Passcode cá nhân.
 */

window.AisaAuth = {
  currentUser: null,
  isAuthorized: false,
  initialized: false,

  // Các mật khẩu hợp lệ mặc định (Sakura có thể đổi trong Cài đặt)
  DEFAULT_PASSCODES: ['2006', 'sakura', 'yurika', '06122006', 'mhent'],

  init() {
    this.bindEvents();
    this.initialized = true;

    // Kiểm tra nếu đã chọn "Nhớ thiết bị này" hoặc đang chạy bản Desktop
    const autoUnlock = localStorage.getItem('aisa_auto_unlock');
    const isDesktop = window.AisaDesktop && window.AisaDesktop.isDesktop;

    if (autoUnlock === 'true' || isDesktop) {
      // Mở khóa tự động ngay lập tức
      this.loginSuccess(true);
    } else {
      this.showGatekeeper();
    }
  },

  bindEvents() {
    // Form Mở Khóa Mật Khẩu (Lock Screen Form)
    const loginForm = document.getElementById('gate-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const passInput = document.getElementById('gate-login-pass');
        const rememberCheck = document.getElementById('gate-remember-device');
        if (passInput) {
          const pass = passInput.value.trim();
          const remember = rememberCheck ? rememberCheck.checked : true;
          this.unlockWithPasscode(pass, remember);
        }
      });
    }

    // Nút Khóa / Đăng xuất trên Header
    const logoutBtn = document.getElementById('btn-header-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.confirmLogout();
      });
    }
  },

  /**
   * Mở khóa Sanctuary bằng Master Passcode
   */
  unlockWithPasscode(inputPass, rememberDevice = true) {
    if (!inputPass) {
      this.showError("Vui lòng nhập mã truy cập của cậu!");
      return;
    }

    const savedCustomPass = localStorage.getItem('aisa_master_passcode');
    const passLower = inputPass.toLowerCase();

    // Kiểm tra khớp mật khẩu tùy chỉnh hoặc mật khẩu mặc định
    const isValid = (savedCustomPass && inputPass === savedCustomPass) ||
                    this.DEFAULT_PASSCODES.includes(passLower);

    if (isValid) {
      this.clearError();
      if (rememberDevice) {
        localStorage.setItem('aisa_auto_unlock', 'true');
      } else {
        localStorage.removeItem('aisa_auto_unlock');
      }
      this.loginSuccess(false);
    } else {
      this.showError("Mã truy cập chưa đúng nè! Mặc định là 2006 hoặc sakura nha 🌸");
      const passInput = document.getElementById('gate-login-pass');
      if (passInput) {
        passInput.value = '';
        passInput.focus();
      }
    }
  },

  /**
   * Đăng nhập thành công -> Nạp căn cước Master Yurika
   */
  loginSuccess(isSilent = false) {
    const customName = localStorage.getItem('aisa_user_display_name') || "Master Yurika";

    this.currentUser = {
      uid: "master-yurika-local",
      email: "yurika@mhentuniverse.internal",
      name: customName,
      realName: "Huỳnh Lam Chi (Sakura)",
      avatar: "🌸",
      role: "master"
    };

    this.isAuthorized = true;

    // Cập nhật cấu hình toàn cục
    if (window.AISA_CONFIG && window.AISA_CONFIG.USER) {
      window.AISA_CONFIG.USER.name = this.currentUser.name;
      window.AISA_CONFIG.USER.avatar = this.currentUser.avatar;
    }

    this.hideGatekeeper();
    this.updateUserUI(this.currentUser);

    // Kích hoạt AisaApp
    if (window.AisaApp && typeof window.AisaApp.onUserAuthenticated === 'function') {
      window.AisaApp.onUserAuthenticated(this.currentUser);
    }

    if (!isSilent && window.AisaApp && typeof window.AisaApp.showToast === 'function') {
      window.AisaApp.showToast(`Chào mừng ${customName} trở lại Sanctuary! 🌸✨`, '🌸');
    }
  },

  /**
   * Cập nhật mật khẩu mới trong Cài Đặt
   */
  setCustomPasscode(newPass) {
    if (!newPass || newPass.trim().length < 3) {
      return { success: false, message: "Mật khẩu phải từ 3 ký tự trở lên!" };
    }
    localStorage.setItem('aisa_master_passcode', newPass.trim());
    return { success: true, message: "Đã cập nhật mã truy cập mới thành công!" };
  },

  confirmLogout() {
    if (window.AisaModal && typeof window.AisaModal.confirm === 'function') {
      window.AisaModal.confirm({
        title: "Khóa Màn Hình Sanctuary",
        message: "Cậu có muốn khóa Sanctuary lại không?",
        submessage: "Mọi dữ liệu và ký ức của hai em ấy vẫn được lưu an toàn trên máy.",
        icon: "🔐",
        confirmText: "Khóa Màn Hình",
        cancelText: "Ở Lại",
        danger: false
      }).then(confirmed => {
        if (confirmed) this.logout();
      });
    } else {
      if (confirm("Cậu có muốn khóa màn hình Sanctuary lại không?")) {
        this.logout();
      }
    }
  },

  logout() {
    localStorage.removeItem('aisa_auto_unlock');
    this.currentUser = null;
    this.isAuthorized = false;
    this.updateUserUI(null);
    this.showGatekeeper();

    const passInput = document.getElementById('gate-login-pass');
    if (passInput) {
      passInput.value = '';
      setTimeout(() => passInput.focus(), 300);
    }
  },

  showGatekeeper() {
    const overlay = document.getElementById('auth-gatekeeper-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
      const passInput = document.getElementById('gate-login-pass');
      if (passInput) setTimeout(() => passInput.focus(), 200);
    }
  },

  hideGatekeeper() {
    const overlay = document.getElementById('auth-gatekeeper-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 250);
    }
  },

  showError(msg) {
    const banner = document.getElementById('gate-error-banner');
    if (banner) {
      banner.textContent = msg;
      banner.style.display = 'block';
      banner.style.background = 'rgba(239, 68, 68, 0.15)';
      banner.style.border = '1px solid rgba(239, 68, 68, 0.35)';
      banner.style.color = '#fca5a5';
      banner.style.padding = '8px 12px';
      banner.style.borderRadius = '10px';
      banner.style.fontSize = '12.5px';
      banner.classList.remove('shake');
      void banner.offsetWidth;
      banner.classList.add('shake');
    }
  },

  clearError() {
    const banner = document.getElementById('gate-error-banner');
    if (banner) {
      banner.textContent = '';
      banner.style.display = 'none';
    }
  },

  updateUserUI(user) {
    const headerUserName = document.getElementById('user-display-name');
    const headerUserAvatar = document.getElementById('user-avatar');
    const headerUserBadge = document.getElementById('header-user-badge');
    const sidebarProfileName = document.getElementById('sidebar-user-name');
    const sidebarProfileAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarProfileRole = document.getElementById('sidebar-user-role');

    if (user) {
      const displayName = user.name || "Master Yurika";
      const avatarContent = user.avatar || "🌸";

      if (headerUserName) headerUserName.textContent = displayName;
      if (headerUserAvatar) headerUserAvatar.innerHTML = avatarContent;
      if (headerUserBadge) headerUserBadge.style.display = 'inline-flex';

      if (sidebarProfileName) sidebarProfileName.textContent = displayName;
      if (sidebarProfileAvatar) sidebarProfileAvatar.innerHTML = avatarContent;
      if (sidebarProfileRole) sidebarProfileRole.textContent = "Master • MHEnt Universe";
    } else {
      if (headerUserName) headerUserName.textContent = "Chưa mở khóa";
      if (headerUserAvatar) headerUserAvatar.innerHTML = "🔒";
      if (headerUserBadge) headerUserBadge.style.display = 'none';

      if (sidebarProfileName) sidebarProfileName.textContent = "Chưa mở khóa";
      if (sidebarProfileAvatar) sidebarProfileAvatar.innerHTML = "🔒";
      if (sidebarProfileRole) sidebarProfileRole.textContent = "Khóa bảo mật";
    }
  }
};
