/**
 * AISA COMPANION - HIGH PERFORMANCE MARKDOWN & KATEX MATH RICH TEXT PARSER
 * Miyazaki Haruto Entertainment Co., Ltd.
 */
window.AisaMarkdown = {
  format(raw) {
    if (!raw) return "";

    let text = String(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 0. Chuẩn hóa lỗi ký tự đầu dòng bị tách xuống dòng riêng (ví dụ "•\nKhái niệm" -> "• Khái niệm")
    text = text.replace(/(^|\n)\s*([•\-\*])\s*\n\s*/g, '$1$2 ');

    const placeholders = [];
    const saveToken = (html) => {
      const token = `__AISA_TOKEN_${placeholders.length}__`;
      placeholders.push({ token, html });
      return token;
    };

    // 1. Lưu và bọc khối code block ```code```
    text = text.replace(/```(?:([a-zA-Z0-9_\-]+))?\n?([\s\S]*?)```/g, (match, lang, code) => {
      const codeId = "code-" + Math.random().toString(36).substring(2, 9);
      const languageBadge = lang ? `<span class="code-lang-tag">${this.escapeHtml(lang)}</span>` : '';
      const html = `
        <div class="chat-code-container">
          <div class="chat-code-header">
            ${languageBadge}
            <button type="button" class="btn-copy-code" onclick="window.AisaMarkdown.copyCode('${codeId}')">
              📋 Sao chép
            </button>
          </div>
          <pre class="chat-code-block"><code id="${codeId}">${this.escapeHtml(code.trim())}</code></pre>
        </div>
      `;
      return saveToken(html);
    });

    // 2. Lưu và bọc khối công thức toán học KaTeX Block $$...$$ hoặc \[...\]
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
      return saveToken(this.renderMath(mathContent, true));
    });
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
      return saveToken(this.renderMath(mathContent, true));
    });

    // 3. Lưu và bọc công thức toán học KaTeX Inline $...$ (hoặc \(...\))
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, mathContent) => {
      return saveToken(this.renderMath(mathContent, false));
    });
    text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (match, prefix, mathContent) => {
      return prefix + saveToken(this.renderMath(mathContent, false));
    });

    // 4. Lưu và bọc inline code `code`
    text = text.replace(/`([^`\n]+)`/g, (match, inlineCode) => {
      return saveToken(`<code class="chat-inline-code">${this.escapeHtml(inlineCode)}</code>`);
    });

    // 5. Escape HTML cho các phần còn lại để chống XSS
    text = this.escapeHtml(text);

    // 6. Xử lý ảnh Markdown ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (match, alt, url) => {
      const captionHtml = alt ? `<div class="chat-rendered-img-caption">${alt}</div>` : '';
      return `<div class="chat-rendered-img-wrap"><img src="${url}" alt="${alt}" class="chat-rendered-img" onclick="window.open('${url}', '_blank')">${captionHtml}</div>`;
    });

    // 7. Markdown links [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');

    // 8. Bảng Markdown Table (| Header 1 | Header 2 |)
    text = text.replace(/(?:^|\n)((?:\|.+?\|\r?\n)(?:\|[-:| ]+?\|\r?\n)(?:\|.+?\|\r?\n?)+)/g, (match, tableText) => {
      const rows = tableText.trim().split('\n').map(r => r.trim()).filter(Boolean);
      if (rows.length < 2) return match;
      const headerCells = rows[0].replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const dataRows = rows.slice(2);
      let tableHtml = '<div class="chat-table-wrapper"><table class="chat-table"><thead><tr>';
      headerCells.forEach(cell => {
        tableHtml += `<th>${cell}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      dataRows.forEach(row => {
        const cells = row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<td>${cell}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      return '\n' + saveToken(tableHtml) + '\n';
    });

    // 9. Headings (#, ##, ###)
    text = text.replace(/^### (.*$)/gim, '<h3 class="chat-h3">$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 class="chat-h2">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1 class="chat-h1">$1</h1>');

    // 10. Bold italic ***text*** hoặc ___text___
    text = text.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');

    // 11. Bold **text** hoặc __text__
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

    // 12. Italic *text* và _text_
    text = text.replace(/\*([^\s\*](?:[^\*\n]*?[^\s\*])?)\*/g, '<em>$1</em>');
    text = text.replace(/(^|[\s(])_([^\s_](?:[^_\n]*?[^\s_])?)_([^\w]|$)/g, '$1<em>$2</em>$3');

    // 13. Strikethrough ~~text~~
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // 14. Tag mentions (@AISA, @Harmony, @Echo)
    text = text.replace(/(@AISA|@Harmony|@Echo)/gi, '<span class="chat-mention">$1</span>');

    // 15. Blockquotes (> quote)
    text = text.replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>');

    // 16. Xử lý danh sách gạch đầu dòng và số thứ tự
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (/^[*•\-]\s+/.test(trimmed)) {
        const content = trimmed.replace(/^[*•\-]\s+/, '');
        return `<div class="chat-bullet-row"><span class="chat-bullet-dot">•</span><div class="chat-bullet-text">${content}</div></div>`;
      }
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return `<div class="chat-bullet-row"><span class="chat-bullet-num">${numMatch[1]}.</span><div class="chat-bullet-text">${numMatch[2]}</div></div>`;
      }
      return line;
    });

    // 17. Ghép dòng thông minh với <br>
    let result = "";
    for (let i = 0; i < formattedLines.length; i++) {
      const curr = formattedLines[i];
      if (i > 0) {
        const prev = formattedLines[i - 1];
        const currIsBlock = curr.startsWith('<div class="chat-bullet-row">') || curr.startsWith('<div class="chat-code-container">') || curr.startsWith('<h1') || curr.startsWith('<h2') || curr.startsWith('<h3') || curr.startsWith('<blockquote>');
        const prevIsBlock = prev.startsWith('<div class="chat-bullet-row">') || prev.startsWith('<div class="chat-code-container">') || prev.startsWith('<h1') || prev.startsWith('<h2') || prev.startsWith('<h3') || prev.startsWith('<blockquote>');
        if (!currIsBlock && !prevIsBlock) {
          result += "<br>";
        } else if (!currIsBlock && prevIsBlock) {
          result += "<br>";
        }
      }
      result += curr;
    }

    // 18. Khôi phục tất cả các placeholders (code block, KaTeX, inline code, tables)
    placeholders.forEach(({ token, html }) => {
      result = result.replace(token, html);
    });

    // 19. Nếu đang chạy Desktop Edition, gắn nút mở tệp cục bộ Windows
    if (window.AisaDesktopBridge && window.AisaDesktopBridge.enhanceMessageWithLocalPaths) {
      result = window.AisaDesktopBridge.enhanceMessageWithLocalPaths(result);
    }

    return result;
  },

  renderMath(formula, isBlock) {
    const rawMath = String(formula || '').trim();
    if (!rawMath) return '';
    if (window.katex && typeof window.katex.renderToString === 'function') {
      try {
        const rendered = window.katex.renderToString(rawMath, {
          displayMode: isBlock,
          throwOnError: false
        });
        return isBlock
          ? `<div class="chat-math-block">${rendered}</div>`
          : `<span class="chat-math-inline">${rendered}</span>`;
      } catch (e) {
        console.warn('[KaTeX Render Note]:', e);
      }
    }
    return isBlock
      ? `<div class="chat-math-block"><code>${this.escapeHtml(rawMath)}</code></div>`
      : `<code class="chat-math-inline">${this.escapeHtml(rawMath)}</code>`;
  },

  escapeHtml(str) {
    if (!str) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(str).replace(/[&<>"']/g, ch => map[ch]);
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
