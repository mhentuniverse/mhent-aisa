/**
 * AISA COMPANION - HIGH PERFORMANCE MARKDOWN & RICH TEXT PARSER
 * Miyazaki Haruto Entertainment Co., Ltd.
 */
window.AisaMarkdown = {
  format(raw) {
    if (!raw) return "";

    // 1. Chuẩn hóa xuống dòng
    let text = String(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 2. Escape HTML chống XSS
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    text = text.replace(/[&<>"']/g, ch => escapeMap[ch]);

    // 3. Khối code block ```code```
    text = text.replace(/```(?:([a-zA-Z0-9_\-]+))?\n?([\s\S]*?)```/g, (match, lang, code) => {
      const codeId = "code-" + Math.random().toString(36).substring(2, 9);
      const languageBadge = lang ? `<span class="code-lang-tag">${lang}</span>` : '';
      return `
        <div class="chat-code-container">
          <div class="chat-code-header">
            ${languageBadge}
            <button type="button" class="btn-copy-code" onclick="window.AisaMarkdown.copyCode('${codeId}')">
              📋 Sao chép
            </button>
          </div>
          <pre class="chat-code-block"><code id="${codeId}">${code.trim()}</code></pre>
        </div>
      `;
    });

    // 4. Inline code `code`
    text = text.replace(/`([^`\n]+)`/g, '<code class="chat-inline-code">$1</code>');

    // 5. Markdown links [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');

    // 6. Bold italic ***text*** hoặc ___text___
    text = text.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');

    // 7. Bold **text** hoặc __text__
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

    // 8. Italic *text* (không theo sau bởi khoảng trắng)
    text = text.replace(/\*([^\s\*](?:[^\*\n]*?[^\s\*])?)\*/g, '<em>$1</em>');
    // Italic _text_ (chỉ khi có khoảng trắng hoặc đầu dòng phía trước)
    text = text.replace(/(^|[\s(])_([^\s_](?:[^_\n]*?[^\s_])?)_([^\w]|$)/g, '$1<em>$2</em>$3');

    // 9. Strikethrough ~~text~~
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // 10. Tag mentions (@AISA, @Harmony, @Echo)
    text = text.replace(/(@AISA|@Harmony|@Echo)/gi, '<span class="chat-mention">$1</span>');

    // 11. Xử lý danh sách gạch đầu dòng và số thứ tự
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      // Bullet list (*, -, •)
      if (/^[*•\-]\s+/.test(trimmed)) {
        const content = trimmed.replace(/^[*•\-]\s+/, '');
        return `<div class="chat-bullet-row"><span class="chat-bullet-dot">•</span><div class="chat-bullet-text">${content}</div></div>`;
      }
      // Numbered list (1., 2., 3.)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return `<div class="chat-bullet-row"><span class="chat-bullet-num">${numMatch[1]}.</span><div class="chat-bullet-text">${numMatch[2]}</div></div>`;
      }
      return line;
    });

    // 12. Ghép dòng thông minh với <br>
    let result = "";
    for (let i = 0; i < formattedLines.length; i++) {
      const curr = formattedLines[i];
      if (i > 0) {
        const prev = formattedLines[i - 1];
        const currIsBlock = curr.startsWith('<div class="chat-bullet-row">') || curr.startsWith('<div class="chat-code-container">');
        const prevIsBlock = prev.startsWith('<div class="chat-bullet-row">') || prev.startsWith('<div class="chat-code-container">');
        if (!currIsBlock && !prevIsBlock) {
          result += "<br>";
        } else if (!currIsBlock && prevIsBlock) {
          result += "<br>";
        }
      }
      result += curr;
    }

    return result;
  },

  copyCode(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent).then(() => {
      const btn = event?.currentTarget;
      if (btn) {
        const oldText = btn.innerHTML;
        btn.innerHTML = "✅ Đã chép!";
        setTimeout(() => { btn.innerHTML = oldText; }, 2000);
      }
    });
  }
};
