const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.text({ type: '*/*' }));

const logs = [];

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>ZKTeco Attendance Dashboard</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          padding: 10px;
          margin: 0;
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 20px;
        }
        .container {
          max-width: 1000px;
          margin: auto;
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background-color: #fff;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          min-width: 600px;
        }
        th, td {
          padding: 12px 16px;
          border: 1px solid #ddd;
          text-align: center;
        }
        th {
          background-color: red;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        #refresh {
          margin: 10px auto 20px auto;
          display: block;
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          font-size: 16px;
          cursor: pointer;
          border-radius: 4px;
        }
        @media (max-width: 600px) {
          table {
            font-size: 14px;
            min-width: 100%;
          }
          th, td {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <h1>ZKTeco Live Attendance Logs</h1>
      <div class="container">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Status</th>
              <th>Time</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="logTable"></tbody>
        </table>
      </div>

      <script>
        async function fetchLogs() {
          const res = await fetch('/api/logs');
          const data = await res.json();
          const table = document.getElementById('logTable');
          table.innerHTML = '';
          data.slice().reverse().forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = \`
              <td>\${log.userId}</td>
              <td>\${log.status}</td>
              <td>\${log.time}</td>
              <td>\${log.date}</td>
            \`;
            table.appendChild(row);
          });
        }
        setInterval(fetchLogs, 10000);
        fetchLogs();
      </script>
    </body>
    </html>
  `);
});

app.get('/api/logs', (req, res) => {
  res.json(logs);
});

app.post('/iclock/cdata', (req, res) => {
  console.log('📥 RAW PUSH:', req.body);

  const lines = req.body.trim().split('\n');

  for (const line of lines) {
    const parts = line.trim().split('\t');

    if (parts[0].toUpperCase().startsWith('OPLOG')) {
      console.log('⏭️ Skipping system log:', line);
      continue;
    }

    if (parts.length >= 3) {
      const userId = parts[0];
      const statusCode = parts[2];

      const now = new Date();

      // Convert to Asia/Karachi time
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);

      const [hourStr, minuteStr] = timeStr.split(':');
      const currentHour = parseInt(hourStr, 10);
      const currentMinute = parseInt(minuteStr, 10);
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      // Define time thresholds
      const checkInThreshold = 15 * 60;  // 9:00 AM
      const checkOutThreshold = 17 * 60; // 1:00 PM

      let status = 'Unknown';

      if (statusCode === '0') {
        status = currentTimeMinutes > checkInThreshold ? 'Check-In (Short)' : 'Check-In';
      } else if (statusCode === '1') {
        status = currentTimeMinutes < checkOutThreshold ? 'Check-Out (Early)' : 'Check-Out';
      }

      const time = now.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' });
      const date = now.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' });

      logs.push({ userId, status, time, date });
      if (logs.length > 50) logs.shift();

      console.log('✅ Parsed:', { userId, status, currentHour, currentMinute });
    } else {
      console.warn('⚠️ Unexpected format:', line);
    }
  }

  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`✅ ZKTeco server running on port ${PORT}`);
});
