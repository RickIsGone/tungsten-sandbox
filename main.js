var Module = {
   print: function (text) {
      const consoleBox = document.getElementById('console');
      consoleBox.value += text + '\n';
   },
   printErr: function (text) {
      const consoleBox = document.getElementById('console');
      if (text === "tungsten: \x1B[91merror: \x1B[97mno input files\x1B[0m") {
         return;
      }
      consoleBox.value += '[stderr] ' + text + '\n';
   }
};

// Disabilita il pulsante Start finché il modulo non è pronto e la console in sola lettura
document.addEventListener('DOMContentLoaded', () => {
   document.getElementById('console').setAttribute('readonly', true);
});

let running = false;
async function runCode() {
   const code = document.getElementById('code').value;
   if (!code.trim()) return;
   Module.FS_writeFile('/tmp/main.tgs', code);
   Module.callMain(['/tmp/main.tgs']);
}
function stopCode() {
   if (!running)
      return;
   running = false;
   const consoleBox = document.getElementById('console');
   consoleBox.value += consoleBox.value.endsWith('\n') ? '[Execution stopped]\n' : '\n[Execution stopped]\n';
   consoleBox.setAttribute('readonly', true);
}

// Call this function from C++/WASM when you want to enable input
function enableInput() {
   const consoleBox = document.getElementById('console');
   consoleBox.removeAttribute('readonly');
   consoleBox.focus();
}

function toggleTheme() {
   document.body.classList.toggle('light');
   document.body.classList.toggle('dark');

   if (document.body.classList.contains('light')) {
      document.querySelector('.theme-toggle').setAttribute('title', 'Toggle Dark Mode');
   } else {
      document.querySelector('.theme-toggle').setAttribute('title', 'Toggle Light Mode');
   }
   document.querySelector('.theme-toggle').classList.toggle('active');
}
function clearConsole() {
   document.getElementById('console').value = '';
}

// Splitter drag logic
document.addEventListener('DOMContentLoaded', function () {
   const splitter = document.querySelector('.splitter');
   const editorPanel = document.querySelector('.editor-panel');
   const ioPanel = document.querySelector('.io-panel');
   let isDragging = false;

   splitter.addEventListener('mousedown', function (e) {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
   });

   document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      const container = document.querySelector('.split-container');
      const rect = container.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = Math.max(0.1, Math.min(0.9, percent));
      editorPanel.style.flex = percent + ' 1 0';
      ioPanel.style.flex = (1 - percent) + ' 1 0';
   });

   document.addEventListener('mouseup', function () {
      if (isDragging) {
         isDragging = false;
         document.body.style.cursor = '';
         document.body.style.userSelect = '';
      }
   });
});



// --- Syntax highlighting for Tungsten ---
document.addEventListener('DOMContentLoaded', function () {
   // ...existing splitter code...

   const textarea = document.getElementById('code');
   const highlighting = document.getElementById('highlighting').firstElementChild;

   // Token regex
   const keywords = [
      'return', 'exit', 'new', 'free', 'extern', 'module', 'export', 'import', 'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default',
      'break', 'continue'
   ];
   const types = [
      'Auto', 'Int', 'Uint', 'Float', 'Double', 'Bool', 'Char', 'String', 'Void',
      'Uint8', 'Uint16', 'Uint32', 'Uint64', 'Int8', 'Int16', 'Int32', 'Int64'
   ];
   const consts = [
      'true', 'false', 'null', 'nullptr', 'CodeSuccess', 'CodeFailure'
   ];

   // Build one big regex with named groups
   const tokenRegex = new RegExp(
      [
         { name: 'comment', pattern: '\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/' },
         { name: 'escape', pattern: '\\\\[ntr0"\'\\\\]' },
         { name: 'string', pattern: '"([^"\\\\]|\\\\.)*"' },
         { name: 'int', pattern: '\\b\\d+\\b' },
         { name: 'keyword', pattern: '\\b(' + keywords.join('|') + ')\\b' },
         { name: 'type', pattern: '\\b(' + types.join('|') + ')\\b' },
         { name: 'consts', pattern: '\\b(' + consts.join('|') + ')\\b' },
         { name: 'operator', pattern: '\\+\\+|--|==|!=|<=|>=|->|&&|\\|\\||[+\\-*/%=&|^!<>~]' },
         { name: 'punctuation', pattern: '[;.,:?(){}\\[\\]]' },
         // Funzione: identificatore seguito da (
         { name: 'function', pattern: '[a-zA-Z_\\u00C0-\\u02AF\\u0370-\\u1FFF\\u2C00-\\uD7FF][\\w\\u00C0-\\u02AF\\u0370-\\u1FFF\\u2C00-\\uD7FF]*(?=\\s*\\()' },
         { name: 'identifier', pattern: '[a-zA-Z_\\u00C0-\\u02AF\\u0370-\\u1FFF\\u2C00-\\uD7FF][\\w\\u00C0-\\u02AF\\u0370-\\u1FFF\\u2C00-\\uD7FF]*' },
         { name: 'default', pattern: '.' }
      ].map(t => `(?<${t.name}>${t.pattern})`).join('|'),
      'gu'
   );

   function tungstenHighlight(code) {
      let out = '';
      let match;
      let lastIndex = 0;

      while ((match = tokenRegex.exec(code)) !== null) {
         // Gestisci i newline tra i token
         if (match.index > lastIndex) {
            const skipped = code.slice(lastIndex, match.index);
            out += skipped.replace(/\n/g, '<br>');
         }
         lastIndex = tokenRegex.lastIndex;

         for (const type of [
            'comment', 'escape', 'string', 'int', 'keyword', 'type', 'consts', 'operator', 'punctuation', 'function', 'identifier', 'default'
         ]) {
            if (match.groups[type]) {
               let token = match.groups[type];

               // Evidenzia escape anche dentro le stringhe
               if (type === 'string') {
                  token = token.replace(/(\\[ntr0"\'\\])/g, '<span class="tg-escape">$1</span>');
               }

               // Tratta consts come int
               const className = type === 'consts' ? 'tg-int' : type === 'operator' ? 'tg-punctuation' : `tg-${type}`;
               out += `<span class="${className}">${token}</span>`;
               break;
            }
         }
      }

      // Gestisci newline dopo l'ultimo token
      if (lastIndex < code.length) {
         out += code.slice(lastIndex).replace(/\n/g, '<br>');
      }

      // Sostituisci le tabulazioni con 4 spazi non separabili DOPO l'highlight
      out = out.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
      return out;
   }

   function updateHighlighting() {
      let code = textarea.value;
      // Preserve trailing newline
      if (code.endsWith('\n')) code += ' ';
      const highlightedCode = tungstenHighlight(code);
      highlighting.innerHTML = highlightedCode;
      // Scroll sync
      highlighting.parentElement.scrollTop = textarea.scrollTop;
      highlighting.parentElement.scrollLeft = textarea.scrollLeft;
   }

   textarea.addEventListener('input', updateHighlighting);
   textarea.addEventListener('scroll', () => {
      highlighting.parentElement.scrollTop = textarea.scrollTop;
      highlighting.parentElement.scrollLeft = textarea.scrollLeft;
   });
   textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
         e.preventDefault();
         const start = this.selectionStart;
         const end = this.selectionEnd;
         this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
         this.selectionStart = this.selectionEnd = start + 4;
         updateHighlighting();

      } else if (e.key === 'Enter') {
         e.preventDefault();
         const start = this.selectionStart;
         const before = this.value.substring(0, start);
         const after = this.value.substring(this.selectionEnd);

         // Trova la riga corrente
         const lines = before.split('\n');
         const lastLine = lines[lines.length - 1];

         // Estrai indentazione (tab o spazi all'inizio della riga)
         const indentMatch = lastLine.match(/^[ \t]*/);
         const indent = indentMatch ? indentMatch[0] : '';

         // Inserisce una nuova riga con la stessa indentazione
         const insert = '\n' + indent;
         this.value = before + insert + after;

         // Posiziona il cursore dopo l'indentazione
         const newPos = start + insert.length;
         this.selectionStart = this.selectionEnd = newPos;

         updateHighlighting();
      }
   });

   updateHighlighting();
});

// ...existing code...