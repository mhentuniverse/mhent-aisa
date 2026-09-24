/**
 * AISA COMPANION - VISION AI & OCR LAB
 * Bóc tách từ vựng & phân tích trực quan từ hình ảnh sách vở
 */
window.AisaVision = {
  currentFile: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropArea = document.getElementById('vision-drop-area');
    const fileInput = document.getElementById('vision-file-input');

    if (dropArea && fileInput) {
      dropArea.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.handleSelectedFile(file);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropArea.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropArea.classList.remove('drag-active');
        });
      });

      dropArea.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) this.handleSelectedFile(file);
      });
    }

    const btnAnalyze = document.getElementById('btn-run-vision');
    if (btnAnalyze) {
      btnAnalyze.addEventListener('click', () => this.analyzeImage());
    }
  },

  handleSelectedFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP).');
      return;
    }
    this.currentFile = file;

    const previewImg = document.getElementById('vision-preview-img');
    const previewContainer = document.getElementById('vision-preview-wrap');
    const dropPrompt = document.getElementById('vision-drop-prompt');

    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg && previewContainer) {
        previewImg.src = e.target.result;
        previewContainer.style.display = 'block';
        if (dropPrompt) dropPrompt.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);

    const btn = document.getElementById('btn-run-vision');
    if (btn) btn.disabled = false;
  },

  async analyzeImage() {
    if (!this.currentFile) return;

    const langSelect = document.getElementById('vision-lang-select');
    const lang = langSelect ? langSelect.value : 'ja';
    const btn = document.getElementById('btn-run-vision');
    const resultBox = document.getElementById('vision-results-wrap');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="loading-spinner"></span> Đang phân tích bằng Llama 3.2 Vision...`;
    }

    if (resultBox) {
      resultBox.innerHTML = `<div class="vision-loading-card">🌸 Harmony & 😈 Echo đang đọc từng ký tự trong bức ảnh... Cậu đợi tí xíu nha!</div>`;
    }

    try {
      const data = await window.AisaEngine.analyzeVision(this.currentFile, lang);
      this.renderVisionResults(data);
    } catch (err) {
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="vision-error-card">
            ⚠️ Không thể kết nối với dịch vụ Vision OCR: ${err.message}. Cậu kiểm tra lại ảnh hoặc thử lại nhé!
          </div>
        `;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `✨ Bắt đầu bóc tách từ vựng`;
      }
    }
  },

  renderVisionResults(data) {
    const resultBox = document.getElementById('vision-results-wrap');
    if (!resultBox) return;

    if (!data.words || data.words.length === 0) {
      resultBox.innerHTML = `<div class="vision-empty-card">Không tìm thấy từ vựng rõ ràng trong ảnh này. Cậu thử chụp góc thẳng và rõ nét hơn nha! 🌸</div>`;
      return;
    }

    resultBox.innerHTML = `
      <div class="vision-success-header">
        🎉 Đã tìm thấy <strong>${data.words.length}</strong> từ vựng quan trọng:
      </div>
      <div class="vision-cards-grid">
        ${data.words.map((w, idx) => `
          <div class="vocab-card">
            <div class="vocab-top">
              <span class="vocab-word">${w.word}</span>
              ${w.phonetic ? `<span class="vocab-phonetic">${w.phonetic}</span>` : ''}
              <span class="vocab-pos">${w.posLabel || w.pos || 'Từ vựng'}</span>
            </div>
            <div class="vocab-meaning">📌 ${w.meaning}</div>
            ${w.example ? `
              <div class="vocab-example">
                <div class="ex-orig">${w.example}</div>
                <div class="ex-trans">${w.exampleTrans || ''}</div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }
};
