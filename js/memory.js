/**
 * AISA COMPANION - MEMORY VAULT & LONG-TERM STORAGE
 * Quản lý ký ức, thói quen và sự kiện cá nhân của AISA
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
    try {
      const history = await window.AisaEngine.fetchHistory('personal');
      if (history && history.length > 0) {
        this.memories = history;
      }
    } catch (e) {
      console.warn('Memory sync note:', e);
    }
    this.renderMemoryUI();
  },

  addFact(factText, category = 'general') {
    if (!factText || !factText.trim()) return;
    const newFact = {
      id: Date.now(),
      fact: factText.trim(),
      category: category,
      time: new Date().toISOString().split('T')[0]
    };
    this.facts.unshift(newFact);
    this.saveLocalFacts();
    this.renderMemoryUI();
    return newFact;
  },

  deleteFact(factId) {
    this.facts = this.facts.filter(f => f.id !== factId);
    this.saveLocalFacts();
    this.renderMemoryUI();
  },

  renderMemoryUI() {
    const factsContainer = document.getElementById('memory-facts-list');
    const logsContainer = document.getElementById('memory-logs-list');
    const badgeCount = document.getElementById('memory-count-badge');

    if (badgeCount) {
      badgeCount.textContent = (this.facts.length + this.memories.length);
    }

    if (factsContainer) {
      if (this.facts.length === 0) {
        factsContainer.innerHTML = `<div class="empty-state">Chưa có ký ức cá nhân nào được ghim. Cậu hãy thêm điều muốn AISA nhớ bên dưới nhé!</div>`;
      } else {
        factsContainer.innerHTML = this.facts.map(f => `
          <div class="memory-card">
            <div class="memory-card-header">
              <span class="memory-tag tag-${f.category}">${f.category}</span>
              <span class="memory-date">${f.time}</span>
              <button class="btn-del-memory" onclick="window.AisaMemory.deleteFact(${f.id})" title="Quên điều này">✕</button>
            </div>
            <div class="memory-content">${window.AisaMarkdown.format(f.fact)}</div>
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
