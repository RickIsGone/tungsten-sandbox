const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
const server = http.createServer({
   key: fs.readFileSync('/home/rickisgone/server.key'),
   cert: fs.readFileSync('/home/rickisgone/2592809886.crt'),
   ca: fs.readFileSync('/home/rickisgone/chain.crt'),
}, app);

const wss = new WebSocket.Server({ server });
app.use(express.static('pub'));
app.use(express.json());

wss.on('connection', (ws) => {
   let procChain = [];
   const sessionId = crypto.randomUUID();
   const sessionDir = path.join(os.tmpdir(), `tungsten-${sessionId}`);
   fs.mkdirSync(sessionDir, { recursive: true });

   console.log(`new session: ${sessionDir}`);

   ws.on('message', (msg) => {
      const data = JSON.parse(msg);

      if (data.type === 'run') {
         const tgsPath = path.join(sessionDir, 'main.tgs');
         fs.writeFileSync(tgsPath, data.code);

         const tungstenDir = path.join(sessionDir, 'tungsten');
         if (!fs.existsSync(tungstenDir)) {
            fs.cpSync(path.join(__dirname, 'tungsten'), tungstenDir, { recursive: true });
         }

         const commands = [
            [path.join(tungstenDir, 'bin', 'tungsten'), ['main.tgs']],
            [path.join(sessionDir, 'main'), []]
         ];

         function runNext(i) {
            if (i >= commands.length) {
               ws.send(JSON.stringify({ type: 'done' }));
               return;
            }

            const [cmd, args] = commands[i];
            console.log(`running: ${cmd} ${args.join(' ')}`);
            const proc = spawn(cmd, args, { cwd: sessionDir });
            procChain.push(proc);

            let hasError = false;

            proc.stdout.on('data', (chunk) => {
               if (/1 warning generated\./.test(chunk.toString()))
                  return;
               ws.send(JSON.stringify({ type: 'stdout', text: chunk.toString() }));
            });

            proc.stderr.on('data', (chunk) => {
               const text = chunk.toString();
               if (/warning: overriding the module target triple/.test(text) || /1 warning generated\./.test(text))
                  return;
               ws.send(JSON.stringify({ type: 'stderr', text }));
               if (/error/i.test(text)) hasError = true; // Se stderr contiene "error"
            });

            proc.on('close', (code) => {
               ws.send(JSON.stringify({ type: 'status', command: path.basename(cmd), code }));
               if (hasError) {
                  ws.send(JSON.stringify({ type: 'stopped', text: 'Execution halted due to errors.' }));
               } else {
                  runNext(i + 1); // Passa al prossimo comando solo se non ci sono errori
               }
            });

            proc.on('error', (err) => {
               ws.send(JSON.stringify({ type: 'stderr', text: `Failed to start ${path.basename(cmd)}: ${err.message}\n` }));
               runNext(i + 1);
            });
         }

         runNext(0);
      }

      else if (data.type === 'stop') {
         procChain.forEach(p => p.kill());
         procChain = [];
         ws.send(JSON.stringify({ type: 'stopped' }));
      }
   });

   ws.on('close', () => {
      console.log(`session closed: ${sessionDir}`);
      procChain.forEach(p => p.kill());
      fs.rmSync(sessionDir, { recursive: true, force: true });
   });
});

server.listen(35161, () => {
   console.log('server running on http://localhost:35161');
});
