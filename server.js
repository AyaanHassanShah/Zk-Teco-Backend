const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let logs = [];

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function parseData(raw) {
  const parts = raw.split('\t');
  const log = {};
  for (let p of parts) {
    const [key, val] = p.split('=');
    if (key && val) log[key.trim()] = val.trim();
  }
  return {
    userId: log['USER PIN'] || 'N/A',
    status: log['STATUS'] === '0' ? 'Check-In' : log['STATUS'] === '1' ? 'Check-Out' : 'Unknown',
    time: log['TIME'] ? new Date(log['TIME']).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
    date: log['TIME'] ? new Date(log['TIME']).toISOString().split('T')[0] : 'N/A'
  };
}

// Device sends data here
app.post('/iclock/cdata', (req, res) => {
  const timestamp = new Date().toLocaleString();
  logs.push({ raw: req.body, time: timestamp });
  if (logs.length > 50) logs.shift();
  console.log('📥 Biometric data received:', req.body);
  res.send('OK');
});

// Frontend dashboard
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ZKTeco Attendance</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
        th, td { padding: 12px; border: 1px solid #ddd; text-align: center; }
        th { background-color: #4CAF50; color: white; }
      </style>
    </head>
    <body>
      <h2>🟢 Real-Time Attendance Logs</h2>
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Status</th>
            <th>Time</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="log-body"></tbody>
      </table>

      <script>
        async function loadLogs() {
          const res = await fetch('/api/logs');
          const data = await res.json();
          const tbody = document.getElementById('log-body');
          tbody.innerHTML = data.map(log => 
            \`<tr>
              <td>\${log.userId}</td>
              <td>\${log.status}</td>
              <td>\${log.time}</td>
              <td>\${log.date}</td>
            </tr>\`
          ).join('');
        }
        setInterval(loadLogs, 3000);
        loadLogs();
      </script>
    </body>
    </html>
  `);
});

// Serve parsed logs
app.get('/api/logs', (req, res) => {
  const parsed = logs.map(log => parseData(log.raw));
  res.json(parsed);
});

app.get('/', (req, res) => {
  res.send('✅ ZKTeco Attendance Server Running');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
