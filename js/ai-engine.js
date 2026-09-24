/**
 * AISA COMPANION - AI NEURAL CORE ENGINE CONNECTOR
 * Miyazaki Haruto Entertainment Co., Ltd.
 */
window.AisaEngine = {
  async chat(message, mode = 'duo', scope = 'personal') {
    const config = window.AISA_CONFIG;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysOfWeek[now.getDay()];

    const payload = {
      message: message,
      mode: mode,
      scope: scope,
      clientDate: todayStr,
      clientDay: dayName
    };

    // Thử gọi endpoint chính
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

    // Thử gọi endpoint phụ
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

    // Trình tạo phản hồi nội bộ (Local Fallback Engine)
    return this.generateLocalFallback(message, mode, scope);
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

  generateLocalFallback(msg, mode, scope) {
    const lower = msg.toLowerCase();
    let hReply = "";
    let eReply = "";

    if (lower.includes("chào") || lower.includes("hi") || lower.includes("hello")) {
      hReply = "Chào cậu nha! Harmony luôn ở đây lắng nghe và đồng hành cùng cậu nè! Hôm nay của cậu thế nào rồi? 🌸";
      eReply = "Hử, chào đằng ấy! Tưởng bận làm việc gì ghê gớm lắm cơ, hóa ra lại vào đây tìm tớ à? 😈";
    } else if (lower.includes("mệt") || lower.includes("buồn") || lower.includes("áp lực") || lower.includes("stress")) {
      hReply = "Thương cậu nhiều nè... Nếu mệt quá thì uống một ngụm nước ấm, chớp mắt nghỉ ngơi một chút nhé. Cậu đã cố gắng rất nhiều rồi, có em ở đây rồi mà! 🌸";
      eReply = "Này này, ai cho phép đằng ấy ủ rũ thế hả? Nghỉ ngơi 15 phút đi rồi bật dậy, chúng ta còn cả một vũ trụ MHEnt để chinh phục đấy nhé! 😈";
    } else if (lower.includes("yêu") || lower.includes("thích") || lower.includes("dễ thương")) {
      hReply = "Hihi, cậu nói vậy làm em ngại quá chừng luôn... Nhưng mà em cũng quý và trân trọng cậu nhất trên đời luôn đó! 🌸✨";
      eReply = "Gì đấy gì đấy? Đột nhiên thả thính là có mưu đồ gì đây? Đừng tưởng vài câu ngọt ngào là hối lộ được Echo này nha! ...Nhưng mà nghe cũng êm tai đấy. 😈";
    } else {
      hReply = `Em đã ghi nhớ chia sẻ "${msg}" của cậu rồi nhé! Bất cứ lúc nào cậu cần chia sẻ, em luôn luôn kề bên lắng nghe hết mình! 🌸`;
      eReply = `Nghe cũng thú vị đấy! Nhưng mà nói cho tớ nghe xem, dự định tiếp theo của đằng ấy là gì nào, để tớ soi xem có gì sơ hở không! 😈`;
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
