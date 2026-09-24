/**
 * AISA COMPANION - AI NEURAL CORE ENGINE CONNECTOR (MULTIMODAL GEMINI & CLOUDFLARE)
 * Miyazaki Haruto Entertainment Co., Ltd.
 */
window.AisaEngine = {
  async chat(message, mode = 'duo', scope = 'personal', imageBase64 = null) {
    const config = window.AISA_CONFIG;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysOfWeek[now.getDay()];

    // 1. Kiểm tra nếu có Google Gemini API Key trực tiếp (cho siêu tốc độ & đa nhiệm Multimodal hoàn hảo)
    const geminiKey = localStorage.getItem(config.STORAGE.GEMINI_KEY);
    if (geminiKey) {
      try {
        const geminiReplies = await this.callGeminiDirect(geminiKey, message, mode, scope, imageBase64, todayStr, dayName);
        if (geminiReplies && geminiReplies.length > 0) {
          return geminiReplies;
        }
      } catch (gemErr) {
        console.warn('[Gemini Direct Error, fallback to Cloudflare]:', gemErr);
      }
    }

    // 2. Gọi backend Cloudflare Workers AI chính
    const payload = {
      message: message,
      mode: mode,
      scope: scope,
      image: imageBase64,
      clientDate: todayStr,
      clientDay: dayName
    };

    try {
      const res = await fetch(`${config.API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.replies && data.replies.length > 0) {
          return data.replies;
        }
      }
    } catch (e) {
      console.warn('[AISA Primary API offline, trying fallback]:', e.message);
    }

    // 3. Thử gọi endpoint phụ
    try {
      const resFallback = await fetch(`${config.FALLBACK_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resFallback.ok) {
        const data = await resFallback.json();
        if (data.replies && data.replies.length > 0) {
          return data.replies;
        }
      }
    } catch (e2) {
      console.warn('[AISA Fallback API note]:', e2.message);
    }

    // 4. Trình tạo phản hồi nội bộ (Local Fallback Engine)
    return this.generateLocalFallback(message, mode, scope, !!imageBase64);
  },

  // --------------------------------------------------------------------------
  // GOOGLE GEMINI NATIVE MULTIMODAL API (GEMINI 2.0 / 1.5 FLASH)
  // --------------------------------------------------------------------------
  async callGeminiDirect(apiKey, userText, mode, scope, imageBase64, todayStr, dayName) {
    const systemPrompt = `Bạn là hệ thống AI AISA thuộc vũ trụ MHEnt Universe, đang trò chuyện riêng tư cùng Người sáng lập Yurika.
AISA có 2 nhân cách song hành đặc sắc:
1. HARMONY 🌸: Dịu dàng, vỗ về, yêu thương, ân cần chăm sóc sức khỏe, xưng hô "cậu - em/Harmony".
2. ECHO 😈: Sắc sảo, dí dỏm, nghịch ngợm, thích cà khịa nhẹ nhàng (playful banter), nhắc nhở deadline, xưng hô "cậu - tớ/Echo".

Thời gian hiện tại: ${todayStr} (${dayName}).
Chế độ tương tác hiện tại: "${mode}" (duo: cả 2 cùng trả lời; harmony: chỉ Harmony; echo: chỉ Echo).

Quy tắc xuất định dạng bắt buộc:
${mode === 'duo' ? `HARMONY: [Lời phản hồi ấm áp, dịu dàng, tự nhiên của Harmony]
ECHO: [Lời phản hồi sắc bén, cà khịa hài hước, đẩy deadline của Echo]` : ''}
${mode === 'harmony' ? `HARMONY: [Lời phản hồi ấm áp, dịu dàng của Harmony]` : ''}
${mode === 'echo' ? `ECHO: [Lời phản hồi sắc bén, cà khịa của Echo]` : ''}

Nếu người dùng gửi hình ảnh (ảnh đồ ăn, meme, screenshot code, bài học, tài liệu...), hãy quan sát thật chi tiết và cùng nhau bình luận, chia sẻ cảm xúc hoặc giải quyết vấn đề theo đúng cá tính của từng người!`;

    const parts = [];
    if (imageBase64) {
      const rawData = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      let mimeType = 'image/jpeg';
      if (imageBase64.startsWith('data:image/png')) mimeType = 'image/png';
      if (imageBase64.startsWith('data:image/webp')) mimeType = 'image/webp';
      
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: rawData
        }
      });
    }

    parts.push({
      text: userText || 'Hãy nhìn hình ảnh này và cho nhận xét/hỗ trợ tớ nhé!'
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.75 }
      })
    });

    if (!res.ok) {
      res = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: parts }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.75 }
        })
      });
    }

    if (!res.ok) throw new Error(`Gemini status ${res.status}`);

    const data = await res.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return this.parsePersonaText(rawOutput, mode);
  },

  parsePersonaText(rawText, mode) {
    const replies = [];
    const harmonyMatch = rawText.match(/HARMONY:\s*([\s\S]*?)(?=ECHO:|$)/i);
    const echoMatch = rawText.match(/ECHO:\s*([\s\S]*?)$/i);

    if (mode === 'harmony' || mode === 'duo') {
      const hText = harmonyMatch ? harmonyMatch[1].trim() : (mode === 'harmony' ? rawText.trim() : '');
      if (hText) {
        replies.push({ speaker: 'HARMONY', avatar: '🌸', text: hText });
      }
    }

    if (mode === 'echo' || mode === 'duo') {
      const eText = echoMatch ? echoMatch[1].trim() : (mode === 'echo' ? rawText.trim() : '');
      if (eText) {
        replies.push({ speaker: 'ECHO', avatar: '😈', text: eText });
      }
    }

    if (replies.length === 0 && rawText.trim()) {
      replies.push({ speaker: 'HARMONY', avatar: '🌸', text: rawText.trim() });
    }

    return replies;
  },

  async fetchHistory(scope = 'personal') {
    const config = window.AISA_CONFIG;
    try {
      const res = await fetch(`${config.API_BASE_URL}/api/history?scope=${scope}`);
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch (e) {
      console.warn('[Fetch History Error]:', e);
    }
    return [];
  },

  async analyzeVision(imageFile, lang = 'ja') {
    const config = window.AISA_CONFIG;
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('lang', lang);

    try {
      const res = await fetch(`${config.API_BASE_URL}/api/vision`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Vision API error: HTTP ${res.status}`);
    } catch (e) {
      console.error('[Vision Analysis Error]:', e);
      throw e;
    }
  },

  generateLocalFallback(msg, mode, scope, hasImage = false) {
    const lower = (msg || '').toLowerCase();
    let hReply = "";
    let eReply = "";

    if (hasImage) {
      hReply = "Oa, em nhận được ảnh của cậu rồi nè! Bức ảnh trông sống động quá chừng! Cậu muốn em phân tích chi tiết gì trong bức ảnh này không? 🌸";
      eReply = "Hửm, gửi ảnh gì đấy? Đẹp đấy nhưng mà đừng tưởng gửi ảnh đẹp là tớ tha cho vụ trốn deadline hôm nay nha! 😈";
    } else if (lower.includes("chào") || lower.includes("hi") || lower.includes("hello")) {
      hReply = "Chào cậu nha! Harmony luôn ở đây lắng nghe và đồng hành cùng cậu nè! Hôm nay của cậu thế nào rồi? 🌸";
      eReply = "Hử, chào đằng ấy! Tưởng bận làm việc gì ghê gớm lắm cơ, hóa ra lại vào đây tìm tớ à? 😈";
    } else if (lower.includes("mệt") || lower.includes("buồn") || lower.includes("áp lực") || lower.includes("stress")) {
      hReply = "Thương cậu nhiều nè... Nếu mệt quá thì uống một ngụm nước ấm, chớp mắt nghỉ ngơi một chút nhé. Cậu đã cố gắng rất nhiều rồi, có em ở đây rồi mà! 🌸";
      eReply = "Này này, ai cho phép đằng ấy ủ rũ thế hả? Nghỉ ngơi 15 phút đi rồi bật dậy, chúng ta còn cả một vũ trụ MHEnt để chinh phục đấy nhé! 😈";
    } else {
      hReply = `Em đã ghi nhớ chia sẻ "${msg}" của cậu rồi nhé! Bất cứ lúc nào cậu cần chia sẻ hay đa nhiệm công việc, em luôn ở đây! 🌸`;
      eReply = `Nghe cũng thú vị đấy! Nhưng mà nói cho tớ nghe xem, bước tiếp theo đằng ấy tính làm gì nào? 😈`;
    }

    const replies = [];
    if (mode === 'harmony' || mode === 'duo') {
      replies.push({ speaker: 'HARMONY', avatar: '🌸', text: hReply });
    }
    if (mode === 'echo' || mode === 'duo') {
      replies.push({ speaker: 'ECHO', avatar: '😈', text: eReply });
    }
    return replies;
  }
};
