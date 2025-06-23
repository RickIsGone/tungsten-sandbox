var Module = {
   print: function (text) {
      const consoleBox = document.getElementById('console');
      consoleBox.value += text + '\n';
   },
   printErr: function (text) {
      const consoleBox = document.getElementById('console');
      consoleBox.value += '[stderr] ' + text + '\n';
   },
   onRuntimeInitialized: function () {
      document.querySelector('.run-btn').disabled = false;
   }
};

// Disabilita il pulsante Start finché il modulo non è pronto e la console in sola lettura
document.addEventListener('DOMContentLoaded', () => {
   document.querySelector('.run-btn').disabled = true;
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
   running = false;
   const consoleBox = document.getElementById('console');
   consoleBox.value = '[Execution stopped]';
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

// hljs.registerLanguage('tungsten', function (hljs) {
//    return {
//       keywords: 'return exit new free extern module export import true false Auto Int Uint Float Double Bool Char String Void Uint8 Uint16 Uint32 Uint64 Int8 Int16 Int32 Int64',
//       contains: [
//          hljs.QUOTE_STRING_MODE,
//          hljs.C_NUMBER_MODE,
//          {
//             className: 'operator',
//             begin: /[+\-*/%=&|^!<>]=?|&&|\|\||\+\+|--|<<=?|>>=?|\?/,
//          },
//          {
//             className: 'punctuation',
//             begin: /[{}[\];(),.:]/,
//          }
//       ]
//    };
// });
// hljs.highlightAll();

