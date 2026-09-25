/**
 * AISA COMPANION - GATEKEEPER & FIREBASE AUTHENTICATION (AUTH.JS)
 * Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe
 * 
 * Quản lý phiên xác thực, cổng bảo vệ độc quyền Sanctuary dành riêng cho Master Yurika.
 * Bất kỳ tài khoản không thuộc quyền sở hữu của Master sẽ tự động bị từ chối và trục xuất.
 */

window.AisaAuth = {
  auth: null,
  db: null,
  currentUser: null,
  isAuthorized: false,
  initialized: false,

  init() {
    this.bindEvents();
    this.initFirebase();
  },

  initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn("Firebase SDK chưa sẵn sàng. Đang giữ Cổng Xác Thực (Gatekeeper) kích hoạt.");
      this.showGatekeeper();
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.AISA_CONFIG.FIREBASE);
      }
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.initialized = true;

      // Lắng nghe trạng thái đăng nhập Firebase
      this.auth.onAuthStateChanged(async (user) => {
        await this.handleAuthStateChanged(user);
      });
    } catch (err) {
      console.error("Lỗi khởi tạo Firebase Auth:", err);
      this.showGatekeeper();
      this.showError("Lỗi kết nối máy chủ xác thực MHEnt. Vui lòng tải lại trang.");
    }
  },

  bindEvents() {
    // Form Đăng nhập Email / Username
    const loginForm = document.getElementById('gate-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = document.getElementById('gate-login-user');
        const passInput = document.getElementById('gate-login-pass');
        if (userInput && passInput) {
          this.loginWithEmail(userInput.value.trim(), passInput.value);
        }
      });
    }

    // Nút Đăng nhập Google
    const googleBtn = document.getElementById('btn-gate-google');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        this.loginWithGoogle();
      });
    }

    // Nút Đăng xuất trên Header
    const logoutBtn = document.getElementById('btn-header-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.confirmLogout();
      });
    }
  },

  formatOrgEmail(input) {
    if (!input) return "";
    input = input.toLowerCase().replace(/\s+/g, "");
    if (input.includes("@")) {
      return input;
    }
    const domain = window.AISA_CONFIG.AUTH?.ORG_DOMAIN || "@mhentuniverse.internal";
    return `${input}${domain}`;
  },

  /**
   * 🛡️ KIỂM TRA QUYỀN TRUY CẬP ĐỘC QUYỀN CỦA MASTER YURIKA
   * Chỉ tài khoản Master Yurika hoặc Admin cấp cao MHEnt Universe mới được vào Sanctuary.
   */
  async verifyUserPrivileges(user) {
    if (!user) return { authorized: false, reason: "Chưa xác thực" };

    const email = (user.email || "").toLowerCase();
    const displayName = (user.displayName || "").toLowerCase();
    const allowedEmails = (window.AISA_CONFIG.AUTH?.ALLOWED_EMAILS || []).map(e => e.toLowerCase());

    // 1. Kiểm tra Email hoặc Username có thuộc về Yurika / Master không
    const isMasterEmail = allowedEmails.some(allowed => email === allowed || email.startsWith(allowed)) ||
                          email.includes("yurika") || 
                          email.includes("master") || 
                          email.includes("haruto");

    if (isMasterEmail) {
      return { authorized: true, role: "master" };
    }

    // 2. Tra cứu quyền trong cơ sở dữ liệu Firestore 'users'
    if (this.db) {
      try {
        const userDoc = await this.db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          const role = (data.role || "").toLowerCase();
          if (role.includes("master") || role.includes("admin")) {
            return { authorized: true, role: data.role };
          }
        }
      } catch (err) {
        console.warn("Không thể tra cứu quyền Firestore:", err);
      }
    }

    // 3. Kiểm tra Tên hiển thị (nếu đăng nhập bằng Google hiển thị rõ Yurika)
    if (displayName.includes("yurika") || displayName.includes("haruto")) {
      return { authorized: true, role: "master" };
    }

    return { authorized: false, reason: "Tài khoản không nằm trong danh sách cấp phép Master" };
  },

  async handleAuthStateChanged(user) {
    if (!user) {
      this.currentUser = null;
      this.isAuthorized = false;
      this.updateUserUI(null);
      this.showGatekeeper();
      return;
    }

    this.showLoginLoading(true, "Đang đối chiếu căn cước Master...");

    const check = await this.verifyUserPrivileges(user);
    this.showLoginLoading(false);

    if (check.authorized) {
      this.currentUser = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || (user.email ? user.email.split('@')[0] : "Master Yurika"),
        avatar: user.photoURL || "👑",
        role: check.role || "master"
      };
      this.isAuthorized = true;

      // Cập nhật cấu hình người dùng toàn cục
      if (window.AISA_CONFIG && window.AISA_CONFIG.USER) {
        window.AISA_CONFIG.USER.name = this.currentUser.name;
        window.AISA_CONFIG.USER.avatar = this.currentUser.avatar;
      }

      this.hideGatekeeper();
      this.updateUserUI(this.currentUser);

      // Thông báo cho ứng dụng AisaApp
      if (window.AisaApp && typeof window.AisaApp.onUserAuthenticated === 'function') {
        window.AisaApp.onUserAuthenticated(this.currentUser);
      }
    } else {
      // ⛔ Người dùng lạ / không được cấp quyền!
      console.warn("Cảnh báo bảo mật: Tài khoản không hợp lệ cố truy cập Sanctuary:", user.email);
      this.showError(`⛔ Thẩm Quyền Bị Từ Chối! Tài khoản ${user.email} không có quyền vào AISA Sanctuary. Đây là không gian riêng tư của Master Yurika.`);
      
      // Tự động đăng xuất tài khoản lạ
      if (this.auth) {
        await this.auth.signOut();
      }
      this.currentUser = null;
      this.isAuthorized = false;
      this.updateUserUI(null);
      this.showGatekeeper();
    }
  },

  async loginWithEmail(usernameOrEmail, password) {
    if (!usernameOrEmail || !password) {
      this.showError("Vui lòng nhập tên định danh/email và mật khẩu!");
      return;
    }

    const fullEmail = this.formatOrgEmail(usernameOrEmail);
    this.clearError();
    this.showLoginLoading(true, "Đang giải mã căn cước...");

    try {
      if (!this.initialized || !this.auth) {
        throw new Error("Dịch vụ xác thực Firebase chưa được kết nối.");
      }

      await this.auth.signInWithEmailAndPassword(fullEmail, password);
      // onAuthStateChanged sẽ tự động xử lý tiếp
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      let errMsg = "Thông tin đăng nhập không chính xác.";
      if (error.code === "auth/user-not-found") {
        errMsg = "Tài khoản không tồn tại. Vui lòng kiểm tra lại tên định danh.";
      } else if (error.code === "auth/wrong-password") {
        errMsg = "Mật khẩu không chính xác. Cậu thử lại xem nhé.";
      } else if (error.code === "auth/invalid-credential") {
        errMsg = "Tên định danh hoặc mật khẩu chưa đúng.";
      } else if (error.code === "auth/too-many-requests") {
        errMsg = "Quá nhiều lần thử thất bại! Vui lòng chờ 1-2 phút rồi thử lại.";
      } else if (error.message) {
        errMsg = error.message;
      }
      this.showError(errMsg);
    } finally {
      this.showLoginLoading(false);
    }
  },

  async loginWithGoogle() {
    this.clearError();
    this.showLoginLoading(true, "Đang mở cửa sổ Google...");

    try {
      if (!this.initialized || !this.auth) {
        throw new Error("Dịch vụ xác thực Firebase chưa được kết nối.");
      }

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      await this.auth.signInWithPopup(provider);
      // onAuthStateChanged sẽ tự động xử lý tiếp
    } catch (error) {
      console.error("Lỗi Google Sign-In:", error);
      if (error.code !== "auth/popup-closed-by-user") {
        this.showError(`Đăng nhập Google không thành công: ${error.message}`);
      }
    } finally {
      this.showLoginLoading(false);
    }
  },

  async confirmLogout() {
    const dialog = window.AisaDialog;
    if (dialog && typeof dialog.confirm === 'function') {
      const confirmed = await dialog.confirm({
        title: "Đăng Xuất AISA Sanctuary",
        message: "Cậu có muốn khóa lại không gian cá nhân và đăng xuất không?",
        submessage: "Mọi dữ liệu và cuộc trò chuyện của Master vẫn sẽ được lưu trữ an toàn.",
        icon: "🔐",
        confirmText: "Khóa & Đăng Xuất",
        cancelText: "Ở Lại",
        danger: true
      });
      if (confirmed) {
        this.logout();
      }
    } else {
      if (confirm("Cậu có muốn đăng xuất khỏi Sanctuary không?")) {
        this.logout();
      }
    }
  },

  async logout() {
    try {
      if (this.auth) {
        await this.auth.signOut();
      }
    } catch (e) {
      console.error("Lỗi đăng xuất:", e);
    }
    this.currentUser = null;
    this.isAuthorized = false;
    this.updateUserUI(null);
    this.showGatekeeper();
  },

  showGatekeeper() {
    const overlay = document.getElementById('auth-gatekeeper-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
    }
  },

  hideGatekeeper() {
    const overlay = document.getElementById('auth-gatekeeper-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
  },

  showError(msg) {
    const banner = document.getElementById('gate-error-banner');
    if (banner) {
      banner.textContent = msg;
      banner.style.display = 'block';
      banner.classList.remove('shake');
      void banner.offsetWidth; // trigger reflow
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

  showLoginLoading(isLoading, text = "Đang xác thực...") {
    const submitBtn = document.getElementById('btn-gate-submit');
    const googleBtn = document.getElementById('btn-gate-google');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      if (isLoading) {
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<span class="gate-spinner"></span> ${text}`;
      } else if (submitBtn.dataset.originalText) {
        submitBtn.innerHTML = submitBtn.dataset.originalText;
      }
    }
    if (googleBtn) {
      googleBtn.disabled = isLoading;
    }
  },

  updateUserUI(user) {
    const badge = document.getElementById('header-user-badge');
    const avatarEl = document.getElementById('header-user-avatar');
    const nameEl = document.getElementById('header-user-name');

    if (user && this.isAuthorized) {
      if (badge) badge.style.display = 'inline-flex';
      if (avatarEl) {
        if (user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:'))) {
          avatarEl.innerHTML = `<img src="${user.avatar}" alt="Avatar" class="user-avatar-img" />`;
        } else {
          avatarEl.textContent = user.avatar || "👑";
        }
      }
      if (nameEl) {
        nameEl.textContent = user.name || "Master Yurika";
      }
    } else {
      if (badge) badge.style.display = 'none';
    }
  }
};
