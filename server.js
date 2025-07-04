const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let logs = [];

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ✅ Biometric push route
app.post('/iclock/cdata', (req, res) => {
  const timestamp = new Date().toLocaleString();
  logs.push({ raw: req.body, time: timestamp });
  if (logs.length > 50) logs.shift(); // Keep last 50
  console.log('📥 Biometric data received:', req.body);
  res.send('OK');
});

// ✅ Real-time dashboard route
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ZKTeco Live Dashboard</title>
      <style>
        body { font-family: sans-serif; padding: 20px; background: #f9f9f9; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        th { background: #333; color: white; }
      </style>
    </head>
    <body>
      <h2>🟢 Live Attendance Logs</h2>
      <table><thead><tr><th>Time</th><th>Raw Data</th></tr></thead>
      <tbody id="log-body"></tbody></table>
      <script>
        async function loadLogs() {
          const res = await fetch('/api/logs');
          const data = await res.json();
          const tbody = document.getElementById('log-body');
          tbody.innerHTML = data.map(log =>
            \`<tr><td>\${log.time}</td><td>\${JSON.stringify(log.raw)}</td></tr>\`
          ).join('');
        }
        setInterval(loadLogs, 3000);
        loadLogs();
      </script>
    </body>
    </html>
  `);
});

// ✅ API route to get logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

// ✅ Optional home page
app.get('/', (req, res) => {
  res.send('✅ ZKTeco Attendance Server Running');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
