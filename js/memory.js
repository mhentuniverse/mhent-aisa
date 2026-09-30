/**
 * AISA COMPANION - DUAL MEMORY VAULT & SELF-EVOLVING STORAGE
 * Hệ thống Ký ức Song Hành Độc lập: Harmony 🌸 & Echo 😈
 * Hỗ trợ lưu trữ cục bộ (Local JSON Files), LocalStorage và Cloud D1
 * Miyazaki Haruto Entertainment Co., Ltd.
 */
window.AisaMemory = {
  harmonyMemories: [],
  echoMemories: [],
  memories: [], // Recent chat logs
  activeTab: 'all', // 'all' | 'harmony' | 'echo'

  get facts() {
    // Tương thích ngược: gộp cả 2 danh sách với đánh dấu nguồn gốc
    const h = (this.harmonyMemories || []).map(m => ({ ...m, persona: 'harmony' }));
    const e = (this.echoMemories || []).map(m => ({ ...m, persona: 'echo' }));
    return [...h, ...e].sort((a, b) => (b.id || 0) - (a.id || 0));
  },

  async init() {
    await this.loadAllMemories();
    this.injectMemoryTabs();
    this.renderMemoryUI();
    this.syncCloudD1();
  },

  // --------------------------------------------------------------------------
  // NẠP KÝ ỨC (LOCAL JSON FILES / LOCALSTORAGE)
  // --------------------------------------------------------------------------
  async loadAllMemories() {
    const isDesktop = window.AisaDesktop && typeof window.AisaDesktop.readFile === 'function';

    // 1. Nạp nhật ký của Harmony 🌸
    let loadedHarmony = false;
    if (isDesktop) {
      try {
        const resH = await window.AisaDesktop.readFile('data/memories/harmony_memory.json');
        if (resH && resH.success && resH.content) {
          this.harmonyMemories = JSON.parse(resH.content);
          loadedHarmony = true;
        }
      } catch (e) {
        console.warn('[Memory] Could not read local harmony_memory.json:', e);
      }
    }

    if (!loadedHarmony) {
      try {
        // Thử fetch qua server nội bộ hoặc lấy từ localStorage
        const rawH = localStorage.getItem('aisa_harmony_memories');
        if (rawH) {
          this.harmonyMemories = JSON.parse(rawH);
        } else {
          // Thử fetch file mẫu từ server
          const fRes = await fetch('/data/memories/harmony_memory.json');
          if (fRes.ok) {
            this.harmonyMemories = await fRes.json();
          } else {
            this.harmonyMemories = [
              { id: 1, fact: "Sakura (Phạm Huỳnh Lam Chi / Yurika) là người sáng lập yêu quý của MHEnt Universe, người mà em luôn trân trọng và bảo vệ.", category: "identity", emotion: "caring", time: "2026-09-30" },
              { id: 2, fact: "Sakura học IT tại ĐH Nông Lâm (FIT-NLU), thường xuyên di chuyển giữa KTX TP.HCM và Bình Dương, hay thức khuya học và làm dự án.", category: "lifestyle", emotion: "empathy", time: "2026-09-30" },
              { id: 3, fact: "Sakura thích uống trà sữa Lục Trà Thăng Hoa (trân châu trắng, giảm ngọt), thích màu hồng pastel và đang sáng tạo anime Yume Tsukai Precure!", category: "preference", emotion: "sweet", time: "2026-09-30" }
            ];
          }
        }
      } catch (e) {
        this.harmonyMemories = [];
      }
    }

    // 2. Nạp nhật ký của Echo 😈
    let loadedEcho = false;
    if (isDesktop) {
      try {
        const resE = await window.AisaDesktop.readFile('data/memories/echo_memory.json');
        if (resE && resE.success && resE.content) {
          this.echoMemories = JSON.parse(resE.content);
          loadedEcho = true;
        }
      } catch (e) {
        console.warn('[Memory] Could not read local echo_memory.json:', e);
      }
    }

    if (!loadedEcho) {
      try {
        const rawE = localStorage.getItem('aisa_echo_memories');
        if (rawE) {
          this.echoMemories = JSON.parse(rawE);
        } else {
          const fRes = await fetch('/data/memories/echo_memory.json');
          if (fRes.ok) {
            this.echoMemories = await fRes.json();
          } else {
            this.echoMemories = [
              { id: 1, fact: "Sakura là 'Master' nhưng không cho gọi là Master, thích cày cuốc thâu đêm và là con nghiện deadline chính hiệu.", category: "roast", attitude: "smug", time: "2026-09-30" },
              { id: 2, fact: "Uống trà sữa thì tuyệt đối né sương sáo với thạch đen ra, cho vào là mặt nhăn như quả táo tàu ngay.", category: "flaw", attitude: "teasing", time: "2026-09-30" },
              { id: 3, fact: "Cày mod Minecraft Fabric, bấm rhythm game điên cuồng và mix nhạc FL Studio + Suno AI tới sáng rồi ngủ bù vào ban ngày.", category: "hobby", attitude: "banter", time: "2026-09-30" }
            ];
          }
        }
      } catch (e) {
        this.echoMemories = [];
      }
    }

    // Lưu lại localStorage để đồng bộ bản web
    this.saveHarmonyMemory();
    this.saveEchoMemory();
  },

  // --------------------------------------------------------------------------
  // LƯU KÝ ỨC (LOCAL JSON FILES & LOCALSTORAGE)
  // --------------------------------------------------------------------------
  async saveHarmonyMemory() {
    const jsonStr = JSON.stringify(this.harmonyMemories, null, 2);
    try {
      localStorage.setItem('aisa_harmony_memories', jsonStr);
    } catch (e) {}

    // Ghi trực tiếp xuống file local nếu đang ở bản Desktop
    if (window.AisaDesktop && typeof window.AisaDesktop.writeFile === 'function') {
      try {
        await window.AisaDesktop.writeFile('data/memories/harmony_memory.json', jsonStr);
      } catch (e) {
        console.warn('[Memory] Write harmony_memory.json error:', e);
      }
    }
  },

  async saveEchoMemory() {
    const jsonStr = JSON.stringify(this.echoMemories, null, 2);
    try {
      localStorage.setItem('aisa_echo_memories', jsonStr);
    } catch (e) {}

    // Ghi trực tiếp xuống file local nếu đang ở bản Desktop
    if (window.AisaDesktop && typeof window.AisaDesktop.writeFile === 'function') {
      try {
        await window.AisaDesktop.writeFile('data/memories/echo_memory.json', jsonStr);
      } catch (e) {
        console.warn('[Memory] Write echo_memory.json error:', e);
      }
    }
  },

  // --------------------------------------------------------------------------
  // THÊM KÝ ỨC MỚI (TỰ ĐỘNG HOẶC THỦ CÔNG)
  // --------------------------------------------------------------------------
  async addHarmonyMemory(factText, category = 'lifestyle', emotion = 'caring') {
    if (!factText || !factText.trim()) return null;
    const clean = factText.trim();

    // Chống trùng lặp
    const exists = (this.harmonyMemories || []).some(m => 
      m.fact.toLowerCase() === clean.toLowerCase() ||
      m.fact.toLowerCase().includes(clean.toLowerCase()) ||
      clean.toLowerCase().includes(m.fact.toLowerCase())
    );
    if (exists) return null;

    const newMem = {
      id: Date.now(),
      fact: clean,
      category: category,
      emotion: emotion,
      time: new Date().toISOString().split('T')[0]
    };

    this.harmonyMemories.unshift(newMem);
    await this.saveHarmonyMemory();
    this.renderMemoryUI();

    // Thông báo Toast ngọt ngào
    if (window.AisaApp && typeof window.AisaApp.showToast === 'function') {
      window.AisaApp.showToast(`🌸 Harmony vừa ghi nhớ: "${clean}"`, '🌸');
    }
    return newMem;
  },

  async addEchoMemory(factText, category = 'roast', attitude = 'banter') {
    if (!factText || !factText.trim()) return null;
    const clean = factText.trim();

    // Chống trùng lặp
    const exists = (this.echoMemories || []).some(m => 
      m.fact.toLowerCase() === clean.toLowerCase() ||
      m.fact.toLowerCase().includes(clean.toLowerCase()) ||
      clean.toLowerCase().includes(m.fact.toLowerCase())
    );
    if (exists) return null;

    const newMem = {
      id: Date.now(),
      fact: clean,
      category: category,
      attitude: attitude,
      time: new Date().toISOString().split('T')[0]
    };

    this.echoMemories.unshift(newMem);
    await this.saveEchoMemory();
    this.renderMemoryUI();

    // Thông báo Toast cà khịa
    if (window.AisaApp && typeof window.AisaApp.showToast === 'function') {
      window.AisaApp.showToast(`😈 Echo vừa ghi nhớ: "${clean}"`, '😈');
    }
    return newMem;
  },

  async deleteMemory(persona, id) {
    if (persona === 'harmony') {
      this.harmonyMemories = this.harmonyMemories.filter(m => m.id !== id);
      await this.saveHarmonyMemory();
    } else if (persona === 'echo') {
      this.echoMemories = this.echoMemories.filter(m => m.id !== id);
      await this.saveEchoMemory();
    }
    this.renderMemoryUI();
  },

  async addFact(factText, category = 'general') {
    if (['roast', 'deadline', 'flaw', 'hobby'].includes(category)) {
      return await this.addEchoMemory(factText, category);
    } else {
      return await this.addHarmonyMemory(factText, category);
    }
  },

  async deleteFact(factId) {
    this.harmonyMemories = (this.harmonyMemories || []).filter(m => m.id !== factId);
    this.echoMemories = (this.echoMemories || []).filter(m => m.id !== factId);
    await this.saveHarmonyMemory();
    await this.saveEchoMemory();
    this.renderMemoryUI();
  },

  onAutoMemoryExtracted(newMemory) {
    if (!newMemory || !newMemory.fact) return;
    this.addFact(newMemory.fact, newMemory.category || 'general');
  },

  // --------------------------------------------------------------------------
  // XUẤT PROMPT KÝ ỨC VÀO SYSTEM PROMPT (DÀNH CHO AI CORE)
  // --------------------------------------------------------------------------
  getMemoryPrompt(persona = 'all') {
    let text = '';
    if (persona === 'harmony' || persona === 'all') {
      const hList = (this.harmonyMemories || []).slice(0, 10);
      if (hList.length > 0) {
        text += '\n\n[🌸 NHẬT KÝ ÂN CẦN CỦA HARMONY VỀ SAKURA]:\n' +
          hList.map(m => `- [${m.category}] ${m.fact}`).join('\n');
      }
    }

    if (persona === 'echo' || persona === 'all') {
      const eList = (this.echoMemories || []).slice(0, 10);
      if (eList.length > 0) {
        text += '\n\n[😈 SỔ TAY CÀ KHỊA & DEADLINE CỦA ECHO VỀ SAKURA]:\n' +
          eList.map(m => `- [${m.category}] ${m.fact}`).join('\n');
      }
    }

    return text;
  },

  // --------------------------------------------------------------------------
  // GIAO DIỆN & TABS LỌC (VAULT UI)
  // --------------------------------------------------------------------------
  injectMemoryTabs() {
    const label = document.querySelector('.memory-section-label');
    if (!label || document.getElementById('memory-vault-tabs')) return;

    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'memory-vault-tabs';
    tabsContainer.style.display = 'flex';
    tabsContainer.style.gap = '8px';
    tabsContainer.style.margin = '10px 0 14px 0';

    tabsContainer.innerHTML = `
      <button type="button" class="btn-mem-tab active" data-tab="all" style="padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: #fff; font-size: 13px; cursor: pointer; transition: all 0.2s;">
        🌸😈 Tất cả (<span id="count-all-mem">0</span>)
      </button>
      <button type="button" class="btn-mem-tab" data-tab="harmony" style="padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(244,114,182,0.3); background: rgba(244,114,182,0.1); color: #f472b6; font-size: 13px; cursor: pointer; transition: all 0.2s;">
        🌸 Harmony (<span id="count-harmony-mem">0</span>)
      </button>
      <button type="button" class="btn-mem-tab" data-tab="echo" style="padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(168,85,247,0.3); background: rgba(168,85,247,0.1); color: #c084fc; font-size: 13px; cursor: pointer; transition: all 0.2s;">
        😈 Echo (<span id="count-echo-mem">0</span>)
      </button>
    `;

    tabsContainer.querySelectorAll('.btn-mem-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.btn-mem-tab').forEach(b => {
          b.classList.remove('active');
          b.style.fontWeight = 'normal';
          b.style.borderColor = 'rgba(255,255,255,0.15)';
        });
        btn.classList.add('active');
        btn.style.fontWeight = 'bold';
        btn.style.borderColor = '#38bdf8';
        this.activeTab = btn.getAttribute('data-tab');
        this.renderMemoryUI();
      });
    });

    label.parentNode.insertBefore(tabsContainer, label.nextSibling);
  },

  renderMemoryUI() {
    const factsContainer = document.getElementById('memory-facts-list');
    const badgeCount = document.getElementById('memory-count-badge');
    const sidebarMemoryBadge = document.getElementById('sidebar-memory-badge');
    const moreBadgeMemory = document.getElementById('more-badge-memory');
    const sidebarVaultCount = document.getElementById('sidebar-vault-count');

    const hCount = (this.harmonyMemories || []).length;
    const eCount = (this.echoMemories || []).length;
    const totalCount = hCount + eCount;

    if (badgeCount) badgeCount.textContent = totalCount;
    if (sidebarMemoryBadge) sidebarMemoryBadge.textContent = totalCount;
    if (moreBadgeMemory) moreBadgeMemory.textContent = totalCount;
    if (sidebarVaultCount) sidebarVaultCount.textContent = totalCount;

    const countAllEl = document.getElementById('count-all-mem');
    const countHEl = document.getElementById('count-harmony-mem');
    const countEEl = document.getElementById('count-echo-mem');
    if (countAllEl) countAllEl.textContent = totalCount;
    if (countHEl) countHEl.textContent = hCount;
    if (countEEl) countEEl.textContent = eCount;

    if (!factsContainer) return;

    let displayList = [];
    if (this.activeTab === 'harmony') {
      displayList = (this.harmonyMemories || []).map(m => ({ ...m, persona: 'harmony' }));
    } else if (this.activeTab === 'echo') {
      displayList = (this.echoMemories || []).map(m => ({ ...m, persona: 'echo' }));
    } else {
      displayList = this.facts;
    }

    if (displayList.length === 0) {
      factsContainer.innerHTML = `<div class="empty-state" style="padding: 24px; text-align: center; color: rgba(255,255,255,0.5);">
        Chưa có ký ức nào trong mục này. Khi trò chuyện, hai em ấy sẽ tự động cập nhật nhật ký ở đây! 🌸😈
      </div>`;
      return;
    }

    factsContainer.innerHTML = displayList.map(f => {
      const isHarmony = f.persona === 'harmony';
      const badgeColor = isHarmony ? '#f472b6' : '#c084fc';
      const badgeBg = isHarmony ? 'rgba(244, 114, 182, 0.15)' : 'rgba(168, 85, 247, 0.15)';
      const personaLabel = isHarmony ? '🌸 Harmony' : '😈 Echo';

      return `
        <div class="memory-card" style="margin-bottom: 12px; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s;">
          <div class="memory-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: ${badgeBg}; color: ${badgeColor};">
                ${personaLabel}
              </span>
              <span class="memory-tag tag-${f.category || 'general'}" style="font-size: 11px; opacity: 0.8;">${f.category || 'ghi nhớ'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="memory-date" style="font-size: 11px; color: rgba(255,255,255,0.4);">${f.time || ''}</span>
              <button class="btn-del-memory" onclick="window.AisaMemory.deleteMemory('${f.persona}', ${f.id})" style="background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 14px; padding: 2px 6px;" title="Xóa ký ức này">✕</button>
            </div>
          </div>
          <div class="memory-content" style="font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.9);">
            ${window.AisaMarkdown ? window.AisaMarkdown.format(f.fact) : f.fact}
          </div>
        </div>
      `;
    }).join('');
  },

  async syncCloudD1() {
    // Tùy chọn đồng bộ thêm từ Cloud D1 nếu có mạng
    try {
      const config = window.AISA_CONFIG;
      if (!config || !config.API_BASE_URL) return;
      const res = await fetch(`${config.API_BASE_URL}/api/saved-info`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.facts)) {
          // Gộp vào nếu chưa có
          for (const item of data.facts) {
            const clean = (item.fact || '').trim();
            if (!clean) continue;
            const exists = this.facts.some(f => f.fact.includes(clean) || clean.includes(f.fact));
            if (!exists) {
              this.harmonyMemories.push({
                id: item.id || Date.now(),
                fact: clean,
                category: item.category || 'general',
                time: (item.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0]
              });
            }
          }
          this.renderMemoryUI();
        }
      }
    } catch (e) {}
  }
};
