const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Temporary in-memory log storage
let logs = [];

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Device pushes data to this route
app.post('/iclock/cdata', (req, res) => {
  const timestamp = new Date().toLocaleString();
  logs.push({ raw: req.body, time: timestamp });

  // Keep only last 50 logs
  if (logs.length > 50) logs.shift();

  console.log('📥 Received biometric data:', req.body);
  res.send('OK');
});

// Live dashboard display
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Live ZKTeco Dashboard</title>
      <style>
        body { font-family: sans-serif; background: #f4f4f4; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #333; color: white; }
      </style>
    </head>
    <body>
      <h2>🟢 Real-Time Biometric Attendance Logs</h2>
      <table>
        <thead><tr><th>Time</th><th>Raw Data</th></tr></thead>
        <tbody id="log-body"></tbody>
      </table>

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

// API for frontend to fetch logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
