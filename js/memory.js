/**
 * AISA COMPANION - DUAL & SHARED MEMORY VAULT
 * Hệ thống Ký ức Song Hành Độc lập: Harmony 🌸, Echo 😈 & Ký ức Chung 🌸😈
 * Hỗ trợ lưu trữ cục bộ (Local JSON Files), LocalStorage và Cloud D1
 * Miyazaki Haruto Entertainment Co., Ltd.
 */
window.AisaMemory = {
  sharedMemories: [],  // Ký ức cốt lõi chung về Sakura (Cả 2 cùng biết)
  harmonyMemories: [], // Nhật ký ân cần riêng của Harmony 🌸
  echoMemories: [],    // Sổ tay cà khịa & deadline riêng của Echo 😈
  memories: [],        // Recent chat logs
  activeTab: 'all',    // 'all' | 'harmony' | 'echo' | 'shared'

  get facts() {
    const s = (this.sharedMemories || []).map(m => ({ ...m, persona: 'both' }));
    const h = (this.harmonyMemories || []).map(m => ({ ...m, persona: 'harmony' }));
    const e = (this.echoMemories || []).map(m => ({ ...m, persona: 'echo' }));
    return [...h, ...e, ...s].sort((a, b) => (b.id || 0) - (a.id || 0));
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

    // 1. Nạp Ký ức Chung 🌸😈 (shared_memory.json)
    let loadedShared = false;
    if (isDesktop) {
      try {
        const resS = await window.AisaDesktop.readFile('data/memories/shared_memory.json');
        if (resS && resS.success && resS.content) {
          this.sharedMemories = JSON.parse(resS.content);
          loadedShared = true;
        }
      } catch (e) {
        console.warn('[Memory] Could not read local shared_memory.json:', e);
      }
    }

    if (!loadedShared) {
      try {
        const rawS = localStorage.getItem('aisa_shared_memories');
        if (rawS) {
          this.sharedMemories = JSON.parse(rawS);
        } else {
          const fRes = await fetch('/data/memories/shared_memory.json');
          if (fRes.ok) {
            this.sharedMemories = await fRes.json();
          }
        }
      } catch (e) {
        this.sharedMemories = [];
      }
    }

    // 2. Nạp nhật ký của Harmony 🌸 (harmony_memory.json)
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
        const rawH = localStorage.getItem('aisa_harmony_memories');
        if (rawH) {
          this.harmonyMemories = JSON.parse(rawH);
        } else {
          const fRes = await fetch('/data/memories/harmony_memory.json');
          if (fRes.ok) {
            this.harmonyMemories = await fRes.json();
          }
        }
      } catch (e) {
        this.harmonyMemories = [];
      }
    }

    // 3. Nạp nhật ký của Echo 😈 (echo_memory.json)
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
          }
        }
      } catch (e) {
        this.echoMemories = [];
      }
    }

    // Tự động phân loại/dọn sạch các ký ức chung đã bị gán nhầm vào Harmony trước đây
    this.autoMigrateSharedMemories();

    // Lưu lại bộ nhớ
    await this.saveAllMemories();
  },

  autoMigrateSharedMemories() {
    if (!Array.isArray(this.harmonyMemories) || this.harmonyMemories.length === 0) return;

    // Các danh mục hoặc nội dung rõ ràng là thông tin chung của Sakura
    const sharedCategories = ['communication', 'philosophy', 'tech_stack', 'project_precure', 'project_other'];
    const remainingHarmony = [];

    for (const m of this.harmonyMemories) {
      const isSharedCategory = sharedCategories.includes(m.category);
      const isSharedFact = (this.sharedMemories || []).some(s => s.fact.includes(m.fact) || m.fact.includes(s.fact));

      if (isSharedCategory || isSharedFact) {
        // Đưa vào sharedMemories nếu chưa có
        const existsInShared = (this.sharedMemories || []).some(s => s.fact === m.fact || s.id === m.id);
        if (!existsInShared) {
          this.sharedMemories.push({ ...m, persona: 'both' });
        }
      } else {
        remainingHarmony.push(m);
      }
    }

    this.harmonyMemories = remainingHarmony;
  },

  // --------------------------------------------------------------------------
  // LƯU KÝ ỨC (LOCAL JSON FILES & LOCALSTORAGE)
  // --------------------------------------------------------------------------
  async saveSharedMemory() {
    const jsonStr = JSON.stringify(this.sharedMemories, null, 2);
    try {
      localStorage.setItem('aisa_shared_memories', jsonStr);
    } catch (e) {}

    if (window.AisaDesktop && typeof window.AisaDesktop.writeFile === 'function') {
      try {
        await window.AisaDesktop.writeFile('data/memories/shared_memory.json', jsonStr);
      } catch (e) {
        console.warn('[Memory] Write shared_memory.json error:', e);
      }
    }
  },

  async saveHarmonyMemory() {
    const jsonStr = JSON.stringify(this.harmonyMemories, null, 2);
    try {
      localStorage.setItem('aisa_harmony_memories', jsonStr);
    } catch (e) {}

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

    if (window.AisaDesktop && typeof window.AisaDesktop.writeFile === 'function') {
      try {
        await window.AisaDesktop.writeFile('data/memories/echo_memory.json', jsonStr);
      } catch (e) {
        console.warn('[Memory] Write echo_memory.json error:', e);
      }
    }
  },

  async saveAllMemories() {
    await this.saveSharedMemory();
    await this.saveHarmonyMemory();
    await this.saveEchoMemory();
  },

  // --------------------------------------------------------------------------
  // THÊM & ĐỔI CHỦ NHÂN KÝ ỨC
  // --------------------------------------------------------------------------
  async addMemory(factText, persona = 'both', category = 'lifestyle') {
    if (!factText || !factText.trim()) return null;
    const clean = factText.trim();

    // Chống trùng lặp
    const exists = this.facts.some(m => 
      m.fact.toLowerCase() === clean.toLowerCase() ||
      m.fact.toLowerCase().includes(clean.toLowerCase()) ||
      clean.toLowerCase().includes(m.fact.toLowerCase())
    );
    if (exists) return null;

    const newMem = {
      id: Date.now(),
      fact: clean,
      category: category,
      time: new Date().toISOString().split('T')[0]
    };

    if (persona === 'harmony') {
      newMem.emotion = 'caring';
      this.harmonyMemories.unshift(newMem);
      await this.saveHarmonyMemory();
      if (window.AisaApp && typeof window.AisaApp.showToast === 'function') {
        window.AisaApp.showToast(`🌸 Harmony vừa ghi nhớ: "${clean}"`, '🌸');
      }
    } else if (persona === 'echo') {
      newMem.attitude = 'banter';
      this.echoMemories.unshift(newMem);
      await this.saveEchoMemory();
      if (window.AisaApp && typeof window.AisaApp.showToast === 'function') {
        window.AisaApp.showToast(`😈 Echo vừa ghi nhớ: "${clean}"`, '😈');
      }
    } else {
      newMem.persona = 'both';
      this.sharedMemories.unshift(newMem);
      await this.saveSharedMemory();
      if (window.AisaApp && typeof window.AisaApp.showToast === 'function') {
        window.AisaApp.showToast(`🌸😈 Cả hai em cùng ghi nhớ: "${clean}"`, '✨');
      }
    }

    this.renderMemoryUI();
    return newMem;
  },

  async addFact(factText, category = 'general', target = 'both') {
    return await this.addMemory(factText, target, category);
  },

  // Bấm để chuyển đổi persona giữa: Harmony ➔ Echo ➔ Cả hai
  async cyclePersona(id, currentPersona) {
    let item = null;

    // Tìm và lấy item ra khỏi danh sách cũ
    if (currentPersona === 'both') {
      const idx = this.sharedMemories.findIndex(m => m.id === id);
      if (idx !== -1) {
        item = this.sharedMemories.splice(idx, 1)[0];
        // Chuyển sang Harmony
        delete item.persona;
        this.harmonyMemories.unshift(item);
      }
    } else if (currentPersona === 'harmony') {
      const idx = this.harmonyMemories.findIndex(m => m.id === id);
      if (idx !== -1) {
        item = this.harmonyMemories.splice(idx, 1)[0];
        // Chuyển sang Echo
        delete item.persona;
        this.echoMemories.unshift(item);
      }
    } else if (currentPersona === 'echo') {
      const idx = this.echoMemories.findIndex(m => m.id === id);
      if (idx !== -1) {
        item = this.echoMemories.splice(idx, 1)[0];
        // Chuyển sang Cả hai (Both)
        item.persona = 'both';
        this.sharedMemories.unshift(item);
      }
    }

    await this.saveAllMemories();
    this.renderMemoryUI();

    if (window.AisaApp && typeof window.AisaApp.showToast === 'function' && item) {
      const targetName = currentPersona === 'both' ? '🌸 Harmony' : (currentPersona === 'harmony' ? '😈 Echo' : '🌸😈 Cả hai em');
      window.AisaApp.showToast(`Đã chuyển ký ức cho: ${targetName}`, '🔄');
    }
  },

  async deleteMemory(persona, id) {
    if (persona === 'both') {
      this.sharedMemories = this.sharedMemories.filter(m => m.id !== id);
      await this.saveSharedMemory();
    } else if (persona === 'harmony') {
      this.harmonyMemories = this.harmonyMemories.filter(m => m.id !== id);
      await this.saveHarmonyMemory();
    } else if (persona === 'echo') {
      this.echoMemories = this.echoMemories.filter(m => m.id !== id);
      await this.saveEchoMemory();
    }
    this.renderMemoryUI();
  },

  async deleteFact(factId) {
    this.sharedMemories = (this.sharedMemories || []).filter(m => m.id !== factId);
    this.harmonyMemories = (this.harmonyMemories || []).filter(m => m.id !== factId);
    this.echoMemories = (this.echoMemories || []).filter(m => m.id !== factId);
    await this.saveAllMemories();
    this.renderMemoryUI();
  },

  onAutoMemoryExtracted(newMemory) {
    if (!newMemory || !newMemory.fact) return;
    this.addMemory(newMemory.fact, newMemory.persona || 'both', newMemory.category || 'general');
  },

  // --------------------------------------------------------------------------
  // XUẤT PROMPT KÝ ỨC VÀO SYSTEM PROMPT (DÀNH CHO AI CORE)
  // --------------------------------------------------------------------------
  getMemoryPrompt(persona = 'all') {
    let text = '';
    const isAll = persona === 'all' || persona === 'duo';

    // 1. Hồ sơ chung về Sakura (Cả 2 em đều nắm giữ)
    const sList = (this.sharedMemories || []).slice(0, 15);
    if (sList.length > 0) {
      text += '\n\n[🌸😈 HỒ SƠ CHUNG VỀ SAKURA / YURIKA (CẢ 2 EM CÙNG BIẾT)]:\n' +
        sList.map(m => `- [${m.category}] ${m.fact}`).join('\n');
    }

    // 2. Nhật ký riêng của Harmony 🌸
    if (persona === 'harmony' || isAll) {
      const hList = (this.harmonyMemories || []).slice(0, 10);
      if (hList.length > 0) {
        text += '\n\n[🌸 NHẬT KÝ ÂN CẦN CỦA HARMONY VỀ SAKURA]:\n' +
          hList.map(m => `- [${m.category}] ${m.fact}`).join('\n');
      }
    }

    // 3. Sổ tay riêng của Echo 😈
    if (persona === 'echo' || isAll) {
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
    if (!label) return;

    // Xóa tabs cũ nếu có để tạo lại đồng bộ
    const oldTabs = document.getElementById('memory-vault-tabs');
    if (oldTabs) oldTabs.remove();

    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'memory-vault-tabs';
    tabsContainer.style.display = 'flex';
    tabsContainer.style.gap = '6px';
    tabsContainer.style.margin = '10px 0 14px 0';
    tabsContainer.style.flexWrap = 'wrap';

    tabsContainer.innerHTML = `
      <button type="button" class="btn-mem-tab active" data-tab="all" style="padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: #fff; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
        🌸😈 Tất cả (<span id="count-all-mem">0</span>)
      </button>
      <button type="button" class="btn-mem-tab" data-tab="harmony" style="padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(244,114,182,0.3); background: rgba(244,114,182,0.1); color: #f472b6; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
        🌸 Harmony (<span id="count-harmony-mem">0</span>)
      </button>
      <button type="button" class="btn-mem-tab" data-tab="echo" style="padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(168,85,247,0.3); background: rgba(168,85,247,0.1); color: #c084fc; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
        😈 Echo (<span id="count-echo-mem">0</span>)
      </button>
      <button type="button" class="btn-mem-tab" data-tab="shared" style="padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.3); background: rgba(56,189,248,0.1); color: #38bdf8; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
        ✨ Chung (<span id="count-shared-mem">0</span>)
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

    const sCount = (this.sharedMemories || []).length;
    const hCount = (this.harmonyMemories || []).length;
    const eCount = (this.echoMemories || []).length;
    const totalCount = sCount + hCount + eCount;

    if (badgeCount) badgeCount.textContent = totalCount;
    if (sidebarMemoryBadge) sidebarMemoryBadge.textContent = totalCount;
    if (moreBadgeMemory) moreBadgeMemory.textContent = totalCount;
    if (sidebarVaultCount) sidebarVaultCount.textContent = totalCount;

    const countAllEl = document.getElementById('count-all-mem');
    const countHEl = document.getElementById('count-harmony-mem');
    const countEEl = document.getElementById('count-echo-mem');
    const countSEl = document.getElementById('count-shared-mem');
    if (countAllEl) countAllEl.textContent = totalCount;
    if (countHEl) countHEl.textContent = hCount;
    if (countEEl) countEEl.textContent = eCount;
    if (countSEl) countSEl.textContent = sCount;

    if (!factsContainer) return;

    let displayList = [];
    if (this.activeTab === 'harmony') {
      displayList = (this.harmonyMemories || []).map(m => ({ ...m, persona: 'harmony' }));
    } else if (this.activeTab === 'echo') {
      displayList = (this.echoMemories || []).map(m => ({ ...m, persona: 'echo' }));
    } else if (this.activeTab === 'shared') {
      displayList = (this.sharedMemories || []).map(m => ({ ...m, persona: 'both' }));
    } else {
      displayList = this.facts;
    }

    if (displayList.length === 0) {
      factsContainer.innerHTML = `<div class="empty-state" style="padding: 24px; text-align: center; color: rgba(255,255,255,0.5);">
        Chưa có ký ức nào trong mục này. Khi trò chuyện, hai em ấy sẽ tự động ghi nhớ ở đây! 🌸😈
      </div>`;
      return;
    }

    factsContainer.innerHTML = displayList.map(f => {
      const isBoth = f.persona === 'both';
      const isHarmony = f.persona === 'harmony';
      
      let badgeHtml = '';
      if (isBoth) {
        badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: linear-gradient(135deg, rgba(244,114,182,0.25), rgba(168,85,247,0.25)); color: #f472b6; border: 1px solid rgba(244,114,182,0.3);">
          🌸😈 Cả hai em
        </span>`;
      } else if (isHarmony) {
        badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: rgba(244, 114, 182, 0.15); color: #f472b6; border: 1px solid rgba(244,114,182,0.25);">
          🌸 Harmony
        </span>`;
      } else {
        badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.25);">
          😈 Echo
        </span>`;
      }

      return `
        <div class="memory-card" style="margin-bottom: 12px; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s;">
          <div class="memory-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${badgeHtml}
              <span class="memory-tag tag-${f.category || 'general'}" style="font-size: 11px; opacity: 0.8;">${f.category || 'ghi nhớ'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="memory-date" style="font-size: 11px; color: rgba(255,255,255,0.4);">${f.time || ''}</span>
              <button type="button" class="btn-cycle-persona" onclick="window.AisaMemory.cyclePersona(${f.id}, '${f.persona}')" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: #38bdf8; border-radius: 6px; cursor: pointer; font-size: 11px; padding: 2px 7px;" title="Chuyển đổi người nhớ (Harmony / Echo / Cả hai)">
                🔄 Đổi người
              </button>
              <button type="button" class="btn-del-memory" onclick="window.AisaMemory.deleteMemory('${f.persona}', ${f.id})" style="background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 14px; padding: 2px 6px;" title="Xóa ký ức này">✕</button>
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
    try {
      const config = window.AISA_CONFIG;
      if (!config || !config.API_BASE_URL) return;
      const res = await fetch(`${config.API_BASE_URL}/api/saved-info`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.facts)) {
          let hasNew = false;
          for (const item of data.facts) {
            const clean = (item.fact || '').trim();
            if (!clean) continue;
            const exists = this.facts.some(f => f.fact.includes(clean) || clean.includes(f.fact));
            if (!exists) {
              const cat = item.category || 'general';
              // Phân loại thông minh vào đúng nơi
              if (['roast', 'deadline', 'flaw', 'hobby'].includes(cat)) {
                this.echoMemories.push({
                  id: item.id || Date.now(),
                  fact: clean,
                  category: cat,
                  attitude: 'banter',
                  time: (item.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0]
                });
              } else if (['caring', 'sweet', 'emotion'].includes(cat)) {
                this.harmonyMemories.push({
                  id: item.id || Date.now(),
                  fact: clean,
                  category: cat,
                  emotion: 'caring',
                  time: (item.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0]
                });
              } else {
                // Toàn bộ thông tin chung về Sakura -> đưa vào sharedMemories để cả 2 cùng biết!
                this.sharedMemories.push({
                  id: item.id || Date.now(),
                  fact: clean,
                  category: cat,
                  persona: 'both',
                  time: (item.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0]
                });
              }
              hasNew = true;
            }
          }
          if (hasNew) {
            await this.saveAllMemories();
            this.renderMemoryUI();
          }
        }
      }
    } catch (e) {}
  }
};
