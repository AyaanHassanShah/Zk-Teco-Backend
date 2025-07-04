const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000 ;

app.use(cors());
app.use(bodyParser.text({ type: '*/*' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let logs = [];

// Utility to extract key-value patterns from raw string
function extractValue(text, key) {
  const patterns = [
    new RegExp(`${key}\\s*=\\s*([^\\s\\r\\n&]+)`, 'i'),
    new RegExp(`${key}\\s*:\\s*([^\\s\\r\\n&,]+)`, 'i'),
    new RegExp(`${key}\\s+([^\\s\\r\\n&,]+)`, 'i'),
    new RegExp(`"${key}"\\s*:\\s*"?([^"\\s\\r\\n&,]+)"?`, 'i')
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim() !== '') {
      return match[1].trim();
    }
  }

  return 'UNKNOWN';
}

// ZKTeco push handler
app.post('/iclock/cdata', (req, res) => {
  console.log('📥 RAW PUSH:', req.body);

  let bodyText = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body || '';
  console.log('📋 PARSED BODY:', bodyText);

  let userId = extractValue(bodyText, 'PIN') ||
               extractValue(bodyText, 'UserID') ||
               extractValue(bodyText, 'ID');

  let statusCode = extractValue(bodyText, 'STATUS') ||
                   extractValue(bodyText, 'State') ||
                   extractValue(bodyText, 'OP');

  let status = 'Check-In';

  if (statusCode !== 'UNKNOWN') {
    const s = statusCode.toLowerCase();
    if (s === '1' || s === 'o' || s === 'out') {
      status = 'Check-Out';
    } else if (s === '0' || s === 'i' || s === 'in') {
      status = 'Check-In';
    } else if (s === '4' || s === '5') {
      status = 'Break';
    } else {
      status = `Status-${statusCode}`;
    }
  }

  // Fallback: OPLOG format
  if ((userId === 'UNKNOWN' || !userId) && bodyText.startsWith('OPLOG')) {
    const parts = bodyText.trim().split(/\s+/);
    if (parts.length >= 4) {
      userId = parts[2];
      const action = parts[5]?.toLowerCase();
      if (action === 'add' || action === 'check' || action === 'in') {
        status = 'Check-In';
      } else if (action === 'out') {
        status = 'Check-Out';
      } else {
        status = `Status-${action}`;
      }
    }
  }

  // Fallback: raw space-separated format like "100 2025-07-04 12:43:18 ..."
  if ((userId === 'UNKNOWN' || !userId) && /^\d+\s+\d{4}-\d{2}-\d{2}/.test(bodyText)) {
    const parts = bodyText.trim().split(/\s+/);
    if (parts.length >= 4) {
      userId = parts[0];
      const rawCode = parts[3];
      status = (rawCode === '1' || rawCode.toLowerCase() === 'out') ? 'Check-Out' : 'Check-In';
    }
  }

  // Ignore clearly invalid or duplicate entries
  if (userId === '0' || userId === 'UNKNOWN' || userId.trim() === '') {
    console.log('⚠️ Skipping invalid entry:', bodyText);
    return res.send('Ignored');
  }

  // Optional: simplify status like Status-101 to Check-In
  if (status.startsWith('Status-')) {
    status = 'Check-In';
  }

  const now = new Date();
  const time = now.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' });
  const date = now.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' });

  const logEntry = { userId, status, time, date };
  logs.push(logEntry);
  if (logs.length > 50) logs.shift();

  console.log('✅ LOG ENTRY:', logEntry);
  res.send('OK');
});

// Serve latest logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

// Main Dashboard
app.get('/', (req, res) => {
  const html = `
    <html>
      <head>
        <title>ZKTeco Attendance Dashboard</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f2f2f2;
          }
          h1 {
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 10px;
            text-align: center;
            border-bottom: 1px solid #ddd;
          }
          th {
            background: #007bff;
            color: white;
          }
          tr:hover {
            background-color: #f1f1f1;
          }
          .unknown {
            background-color: #ffe6e6;
            color: #d00;
          }
        </style>
        <script>
          async function loadLogs() {
            const res = await fetch('/api/logs');
            const logs = await res.json();
            const tbody = document.getElementById('log-table');
            tbody.innerHTML = '';
            logs.reverse().forEach(log => {
              const row = document.createElement('tr');
              const unknownClass = (log.userId === 'UNKNOWN' || log.status.includes('UNKNOWN')) ? 'unknown' : '';
              row.className = unknownClass;
              row.innerHTML = \`
                <td>\${log.userId}</td>
                <td>\${log.status}</td>
                <td>\${log.time}</td>
                <td>\${log.date}</td>
              \`;
              tbody.appendChild(row);
            });
          }
          setInterval(loadLogs, 5000);
          window.onload = loadLogs;
        </script>
      </head>
      <body>
        <h1>ZKTeco Attendance Dashboard</h1>
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Status</th>
              <th>Time</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="log-table"></tbody>
        </table>
      </body>
    </html>
  `;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
