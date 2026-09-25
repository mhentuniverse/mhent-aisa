/**
 * AISA COMPANION - MEMORY VAULT & LONG-TERM STORAGE
 * Quản lý ký ức cốt lõi, thói quen và sự kiện cá nhân của AISA (Đồng bộ Cloudflare D1 Edge SQLite)
 */
window.AisaMemory = {
  memories: [],
  facts: [],

  async init() {
    this.loadLocalFacts();
    await this.refreshMemories();
  },

  loadLocalFacts() {
    try {
      const raw = localStorage.getItem(window.AISA_CONFIG.STORAGE.SAVED_MEMORIES);
      this.facts = raw ? JSON.parse(raw) : [
        { id: 1, fact: "Người sáng lập và đồng hành là Master Yurika 🌸", category: "identity", time: "2026-09-20" },
        { id: 2, fact: "Yurika thích làm việc khuya và rất tâm huyết với Project MHEnt. Universe ✨", category: "habit", time: "2026-09-22" },
        { id: 3, fact: "AISA có 2 nhân cách song hành: Harmony ngọt ngào chu đáo và Echo nghịch ngợm cà khịa 😈", category: "personality", time: "2026-09-24" }
      ];
    } catch (e) {
      this.facts = [];
    }
  },

  saveLocalFacts() {
    try {
      localStorage.setItem(window.AISA_CONFIG.STORAGE.SAVED_MEMORIES, JSON.stringify(this.facts));
    } catch (e) {}
  },

  async refreshMemories() {
    const config = window.AISA_CONFIG;

    // 1. Đồng bộ nhật ký hội thoại gần nhất từ Edge D1 / Supabase
    try {
      if (window.AisaEngine && window.AisaEngine.fetchHistory) {
        const history = await window.AisaEngine.fetchHistory('personal');
        if (history && history.length > 0) {
          this.memories = history;
        }
      }
    } catch (e) {
      console.warn('Memory history sync note:', e);
    }

    // 2. Đồng bộ ký ức dài hạn cốt lõi từ Cloudflare D1 (saved_info)
    try {
      const res = await fetch(`${config.API_BASE_URL}/api/saved-info`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.facts) && data.facts.length > 0) {
          this.facts = data.facts.map(f => ({
            id: f.id,
            fact: f.fact,
            category: f.category || 'general',
            time: (f.created_at || '').split('T')[0] || (f.created_at || '').split(' ')[0] || new Date().toISOString().split('T')[0]
          }));
          this.saveLocalFacts();
        }
      }
    } catch (d1Err) {
      console.warn('Could not sync D1 saved_info, keeping cached facts:', d1Err);
    }

    this.renderMemoryUI();
  },

  async addFact(factText, category = 'general') {
    if (!factText || !factText.trim()) return;
    const cleanFact = factText.trim();
    const tempId = Date.now();
    const newFact = {
      id: tempId,
      fact: cleanFact,
      category: category,
      time: new Date().toISOString().split('T')[0]
    };

    // Cập nhật UI ngay lập tức
    this.facts.unshift(newFact);
    this.saveLocalFacts();
    this.renderMemoryUI();

    // Đồng bộ lên Cloudflare D1
    try {
      const config = window.AISA_CONFIG;
      const res = await fetch(`${config.API_BASE_URL}/api/saved-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: cleanFact, category: category })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          newFact.id = data.id;
          this.saveLocalFacts();
        }
      }
    } catch (e) {
      console.warn('Sync addFact to D1 note:', e);
    }

    return newFact;
  },

  async deleteFact(factId) {
    this.facts = this.facts.filter(f => f.id !== factId);
    this.saveLocalFacts();
    this.renderMemoryUI();

    // Đồng bộ xóa trên Cloudflare D1
    try {
      const config = window.AISA_CONFIG;
      await fetch(`${config.API_BASE_URL}/api/saved-info?id=${factId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Sync deleteFact to D1 note:', e);
    }
  },

  /**
   * Tự động đón nhận ký ức cốt lõi mới được AI trích xuất trong lúc hội thoại
   */
  onAutoMemoryExtracted(newMemory) {
    if (!newMemory || !newMemory.fact) return;
    const factText = newMemory.fact.trim();
    const category = newMemory.category || 'general';

    // Tránh trùng lặp nội bộ
    const exists = this.facts.some(f => 
      f.fact.toLowerCase() === factText.toLowerCase() ||
      f.fact.toLowerCase().includes(factText.toLowerCase()) ||
      factText.toLowerCase().includes(f.fact.toLowerCase())
    );

    if (!exists) {
      const factObj = {
        id: newMemory.id || Date.now(),
        fact: factText,
        category: category,
        time: new Date().toISOString().split('T')[0]
      };
      this.facts.unshift(factObj);
      this.saveLocalFacts();
      this.renderMemoryUI();

      // Hiển thị thông báo Toast siêu ngọt ngào
      if (window.AisaApp && typeof window.AisaApp.showToast === 'function') {
        const catLabels = {
          preference: 'Sở thích',
          habit: 'Thói quen',
          identity: 'Thông tin cá nhân',
          project: 'Dự án',
          plan: 'Kế hoạch',
          general: 'Ký ức'
        };
        const label = catLabels[category] || 'Ký ức mới';
        window.AisaApp.showToast(`[${label}] Đã tự động ghi nhớ: "${factText}"`, '🧠');
      }
    }
  },

  getCategoryLabel(cat) {
    const labels = {
      identity: 'Cá nhân',
      preference: 'Sở thích',
      habit: 'Thói quen',
      personality: 'Tính cách',
      project: 'Dự án',
      plan: 'Kế hoạch',
      general: 'Ghi nhớ'
    };
    return labels[cat] || cat;
  },

  renderMemoryUI() {
    const factsContainer = document.getElementById('memory-facts-list');
    const logsContainer = document.getElementById('memory-logs-list');
    const badgeCount = document.getElementById('memory-count-badge');
    const sidebarVaultCount = document.getElementById('sidebar-vault-count');

    const totalCount = this.facts.length;
    if (badgeCount) {
      badgeCount.textContent = totalCount;
    }
    if (sidebarVaultCount) {
      sidebarVaultCount.textContent = totalCount;
    }

    if (factsContainer) {
      if (this.facts.length === 0) {
        factsContainer.innerHTML = `<div class="empty-state">Chưa có ký ức cá nhân nào được ghim. Khi cậu trò chuyện, AISA sẽ tự động chắt lọc và lưu lại những điều quan trọng về cậu ở đây! 🌸😈</div>`;
      } else {
        factsContainer.innerHTML = this.facts.map(f => `
          <div class="memory-card">
            <div class="memory-card-header">
              <span class="memory-tag tag-${f.category}">${this.getCategoryLabel(f.category)}</span>
              <span class="memory-date">${f.time}</span>
              <button class="btn-del-memory" onclick="window.AisaMemory.deleteFact(${f.id})" title="Quên điều này">✕</button>
            </div>
            <div class="memory-content">${window.AisaMarkdown ? window.AisaMarkdown.format(f.fact) : f.fact}</div>
          </div>
        `).join('');
      }
    }

    if (logsContainer) {
      if (this.memories.length === 0) {
        logsContainer.innerHTML = `<div class="empty-state">Chưa có nhật ký hội thoại nào được đồng bộ từ Edge D1.</div>`;
      } else {
        logsContainer.innerHTML = this.memories.slice(0, 15).map(m => `
          <div class="memory-log-row ${m.role}">
            <span class="log-role">${m.role === 'user' ? '👑 Cậu' : '🌸😈 AISA'}</span>
            <span class="log-text">${m.content}</span>
          </div>
        `).join('');
      }
    }
  }
};
