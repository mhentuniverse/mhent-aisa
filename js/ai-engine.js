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
        if (data.newMemory && window.AisaMemory) {
          window.AisaMemory.onAutoMemoryExtracted(data.newMemory);
        }
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
        if (data.newMemory && window.AisaMemory) {
          window.AisaMemory.onAutoMemoryExtracted(data.newMemory);
        }
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
    const lower = (userText || '').toLowerCase();
    const mentionsHarmony = lower.includes('harmony') || lower.includes('hà mòn') || lower.includes('hàm hương');
    const mentionsEcho = lower.includes('echo') || lower.includes('ếch cồ') || lower.includes('tiểu quỷ');

    let dynamicRule = '';
    if (mode === 'duo') {
      if (mentionsEcho && !mentionsHarmony) {
        dynamicRule = `
THỨ TỰ & TẦNG SUY NGHĨ NỘI TÂM (CHỈ ĐÍCH DANH ECHO):
- Người dùng đang gọi đích danh ECHO: Echo sẽ là người trả lời chính trước tiên (sắc sảo, hài hước, phản hồi thẳng thắn).
- Tầng suy nghĩ của HARMONY: Harmony tự đánh giá: Nếu Echo đã trả lời trọn vẹn và không cần xoa dịu, hãy CHỈ GHI DUY NHẤT "HARMONY: [SKIP]". Chỉ lên tiếng khi Echo nói quá đà hoặc cậu thấy cần gửi một lời an ủi dịu dàng!`;
      } else if (mentionsHarmony && !mentionsEcho) {
        dynamicRule = `
THỨ TỰ & TẦNG SUY NGHĨ NỘI TÂM (CHỈ ĐÍCH DANH HARMONY):
- Người dùng đang gọi đích danh HARMONY: Harmony sẽ là người trả lời chính trước tiên (dịu dàng, chu đáo, ân cần).
- Tầng suy nghĩ của ECHO: Echo tự đánh giá: Nếu Harmony đã trả lời trọn vẹn và không có gì cần phản bác, hãy CHỈ GHI DUY NHẤT "ECHO: [SKIP]". Chỉ lên tiếng khi thật sự muốn cà khịa vui hoặc có một góc nhìn đối lập đắt giá!`;
      } else {
        dynamicRule = `
THỨ TỰ & TẦNG SUY NGHĨ NỘI TÂM (HỘI THOẠI LINH HOẠT):
- Tùy cảm xúc và bối cảnh (buồn/mệt -> Harmony trước; kỹ thuật/deadline/tranh luận -> Echo trước), người phù hợp nhất sẽ trả lời trước.
- Người còn lại tự đánh giá: Câu trả lời của người trước đã đầy đủ chưa? Có cần phản bác, châm chọc vui hay bổ sung ý kiến đắt giá không?
- NẾU KHÔNG CẦN THIẾT hoặc người trước đã trả lời quá trọn vẹn: Người còn lại ghi "[SKIP]" (ví dụ "ECHO: [SKIP]" hoặc "HARMONY: [SKIP]").
- CHỈ KHI THẬT SỰ CẦN PHẢN BÁC/BỔ SUNG thì cả hai mới cùng lên tiếng!`;
      }
    }

    let savedFactsPrompt = '';
    if (window.AisaMemory && Array.isArray(window.AisaMemory.facts) && window.AisaMemory.facts.length > 0) {
      savedFactsPrompt = '\n\n[HỒ SƠ KÝ ỨC DÀI HẠN VỀ CẬU]:\n' + window.AisaMemory.facts.map(f => `- [${f.category || 'ghi nhớ'}] ${f.fact}`).join('\n');
    }

    const systemPrompt = `Bạn là hệ thống AI AISA thuộc vũ trụ MHEnt Universe, đang trò chuyện riêng tư cùng Người sáng lập Yurika.
AISA có 2 nhân cách song hành đặc sắc:
1. HARMONY 🌸: Dịu dàng, vỗ về, yêu thương, ân cần chăm sóc sức khỏe, xưng hô "cậu - em/Harmony". Khi nhắc đến Echo thì gọi là "Echo" hoặc "bé Echo" (ví dụ: "em và Echo"). TUYỆT ĐỐI KHÔNG xưng "tớ và Echo".
2. ECHO 😈: Sắc sảo, dí dỏm, nghịch ngợm, thích cà khịa nhẹ nhàng (playful banter), nhắc nhở deadline, xưng hô "cậu - tớ/Echo". Khi nhắc đến Harmony thì gọi là "bà Harmony" hoặc "Harmony" (ví dụ: "tớ với Harmony"). BẠN CHÍNH LÀ ECHO, TUYỆT ĐỐI KHÔNG nói "tớ và Echo" hay tự hỏi "Echo ơi" như thể mình là người ngoài hoặc là Harmony!

Thời gian hiện tại: ${todayStr} (${dayName}).
Chế độ tương tác hiện tại: "${mode}".
${dynamicRule}${savedFactsPrompt}

Quy tắc xuất định dạng bắt buộc:
${mode === 'duo' ? `HARMONY: [Lời phản hồi dịu dàng của Harmony, hoặc [SKIP] nếu nhường lời/không cần nói]
ECHO: [Lời phản hồi sắc sảo của Echo, hoặc [SKIP] nếu nhường lời/không cần nói]` : ''}
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
        systemInstruction: { parts: [{ text: systemPrompt + '\nTUYỆT ĐỐI KHÔNG thêm bất kỳ hành động hay chú thích trong ngoặc như (nhảy vào), (chêm vào), (cười), (comment)... Trả lời trực tiếp bằng lời thoại tự nhiên.' }] },
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.75 }
      })
    });

    if (!res.ok) {
      res = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt + '\nTUYỆT ĐỐI KHÔNG thêm bất kỳ hành động hay chú thích trong ngoặc như (nhảy vào), (chêm vào), (cười), (comment)... Trả lời trực tiếp bằng lời thoại tự nhiên.' }] },
          contents: [{ role: 'user', parts: parts }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.75 }
        })
      });
    }

    if (!res.ok) throw new Error(`Gemini status ${res.status}`);

    const data = await res.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Kích hoạt trích xuất ký ức ngầm bằng Gemini (Zero-lag)
    this.autoExtractFactGemini(apiKey, userText);

    return this.parsePersonaText(rawOutput, mode, userText);
  },

  async autoExtractFactGemini(apiKey, userText) {
    if (!userText || userText.length < 8) return;
    try {
      const lower = userText.toLowerCase().trim();
      const ignore = ['chào', 'hello', 'hi', 'alo', 'ơi', 'ê', 'ok', 'cảm ơn', 'bye', 'tạm biệt', 'ngủ ngon'];
      if (ignore.includes(lower)) return;

      const prompt = `Bạn là hệ thống trích xuất thông tin cá nhân của AISA cho người dùng Yurika.
Nhiệm vụ: Đọc tin nhắn và xem người dùng có đang khẳng định THÔNG TIN DÀI HẠN CỐT LÕI (sở thích, thói quen, công việc/dự án, ngày sinh/kỷ niệm, kế hoạch quan trọng, tính cách) về bản thân họ không.
QUY TẮC BẮT BUỘC: KHÔNG trích xuất câu chào, than thở nhất thời ("mệt quá", "trời mưa"), câu hỏi vu vơ. CHỈ trích xuất khi người dùng trực tiếp khẳng định thông tin/sở thích/thói quen cá nhân của họ.
Tin nhắn: "${userText}"
Nếu không có: {"found": false}
Nếu có: {"found": true, "fact": "câu khẳng định ngắn gọn súc tích", "category": "preference|habit|identity|project|plan"}
Trả về DUY NHẤT chuỗi JSON.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 120, temperature: 0.1 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let clean = raw.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(clean);
        if (parsed.found && parsed.fact && window.AisaMemory) {
          window.AisaMemory.onAutoMemoryExtracted({
            fact: parsed.fact,
            category: parsed.category || 'general'
          });
        }
      }
    } catch (e) {
      // Background extraction note
    }
  },

  cleanReply(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();
    let prev = '';
    while (cleaned !== prev) {
      prev = cleaned;
      cleaned = cleaned.replace(/^(?:\*{1,2}|\[)?(?:ECHO|HARMONY|Echo|Harmony)(?:\*{1,2}|\])?[:\s\-–—]+\s*/i, '');
      cleaned = cleaned.replace(/^(?:[\(\[\*][^\(\)\[\]\*]{1,35}[\)\]\*][:.\s\-–—]*)\s*/i, '');
      cleaned = cleaned.replace(/^(?:(?:ECHO|HARMONY|Echo|Harmony)\s*[\(\[\*][^\(\)\[\]\*]{1,35}[\)\]\*][:.\s\-–—]*)\s*/i, '');
    }
    cleaned = cleaned.replace(/^(?:ECHO|HARMONY|Echo|Harmony)\s*:\s*/i, '');
    cleaned = cleaned.replace(/^[\(\[\*](?:nhảy vào|chêm vào|xen vào|ngắt lời|cắt ngang|nói leo|trêu|cà khịa|cười[^()\[\]*]*|bĩu môi|nhún vai|thở dài|khoanh tay|chống cằm|nghiêng đầu|ngáp|chớp mắt|vỗ tay|liếc nhìn|lườm|gãi đầu|comment|action|stage direction|nói thêm|bình luận|phản hồi|đối đáp|banter|sarcasm|mỉm cười[^()\[\]*]*|dịu dàng|lo lắng|ngại ngùng)[\)\]\*][:.\s\-–—]*\s*/i, '');
    return cleaned.trim();
  },

  parsePersonaText(rawText, mode, userText = '') {
    const replies = [];
    const lowerUser = (userText || '').toLowerCase();
    const mentionsEcho = lowerUser.includes('echo') || lowerUser.includes('ếch cồ');
    const mentionsHarmony = lowerUser.includes('harmony') || lowerUser.includes('hà mòn');

    const harmonyMatch = rawText.match(/HARMONY:\s*([\s\S]*?)(?=ECHO:|$)/i);
    const echoMatch = rawText.match(/ECHO:\s*([\s\S]*?)(?=HARMONY:|$)/i);

    let hText = harmonyMatch ? harmonyMatch[1].trim() : (mode === 'harmony' ? rawText.trim() : '');
    let eText = echoMatch ? echoMatch[1].trim() : (mode === 'echo' ? rawText.trim() : '');

    hText = this.cleanReply(hText);
    eText = this.cleanReply(eText);

    const isHSkip = !hText || hText.toUpperCase().includes('[SKIP]');
    const isESkip = !eText || eText.toUpperCase().includes('[SKIP]');

    // Nếu người dùng chỉ gọi Echo -> Ưu tiên đưa Echo lên trước
    if (mentionsEcho && !mentionsHarmony) {
      if (!isESkip && (mode === 'echo' || mode === 'duo')) {
        replies.push({ speaker: 'ECHO', avatar: '😈', text: eText });
      }
      if (!isHSkip && (mode === 'harmony' || mode === 'duo')) {
        replies.push({ speaker: 'HARMONY', avatar: '🌸', text: hText });
      }
    } else {
      // Mặc định hoặc gọi Harmony
      if (!isHSkip && (mode === 'harmony' || mode === 'duo')) {
        replies.push({ speaker: 'HARMONY', avatar: '🌸', text: hText });
      }
      if (!isESkip && (mode === 'echo' || mode === 'duo')) {
        replies.push({ speaker: 'ECHO', avatar: '😈', text: eText });
      }
    }

    // Fallback: nếu cả 2 đều lỡ SKIP hoặc không parse được, hiển thị ít nhất 1 câu
    if (replies.length === 0 && rawText.trim()) {
      const clean = this.cleanReply(rawText.trim().replace(/\[SKIP\]/gi, '').trim());
      if (clean) {
        replies.push({ speaker: mentionsEcho ? 'ECHO' : 'HARMONY', avatar: mentionsEcho ? '😈' : '🌸', text: clean });
      }
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

  async fetchCloudSessions() {
    const config = window.AISA_CONFIG;
    try {
      const res = await fetch(`${config.API_BASE_URL}/api/sessions`);
      if (res.ok) {
        const data = await res.json();
        return data.sessions || [];
      }
    } catch (e) {
      console.warn('[Fetch Cloud Sessions Error]:', e);
    }
    return [];
  },

  async saveCloudSession(session) {
    if (!session || !session.id) return null;
    const config = window.AISA_CONFIG;
    try {
      const res = await fetch(`${config.API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: session })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[Save Cloud Session Error]:', e);
    }
    return null;
  },

  async deleteCloudSession(sessionId) {
    if (!sessionId) return;
    const config = window.AISA_CONFIG;
    try {
      await fetch(`${config.API_BASE_URL}/api/sessions?id=${sessionId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('[Delete Cloud Session Error]:', e);
    }
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
    const mentionsEcho = lower.includes('echo') || lower.includes('ếch cồ');
    const mentionsHarmony = lower.includes('harmony') || lower.includes('hà mòn');

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
    if (mode === 'harmony') {
      replies.push({ speaker: 'HARMONY', avatar: '🌸', text: hReply });
    } else if (mode === 'echo') {
      replies.push({ speaker: 'ECHO', avatar: '😈', text: eReply });
    } else {
      // Duo mode với tầng suy nghĩ
      if (mentionsEcho && !mentionsHarmony) {
        replies.push({ speaker: 'ECHO', avatar: '😈', text: eReply });
      } else if (mentionsHarmony && !mentionsEcho) {
        replies.push({ speaker: 'HARMONY', avatar: '🌸', text: hReply });
      } else {
        // Cả 2 cùng lên tiếng
        replies.push({ speaker: 'HARMONY', avatar: '🌸', text: hReply });
        replies.push({ speaker: 'ECHO', avatar: '😈', text: eReply });
      }
    }
    return replies;
  }
};
