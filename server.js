const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI; // Defined in Railway variables

// Middleware
app.use(cors());
app.use(express.text({ type: '*/*' }));

// MongoDB connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Schema
const logSchema = new mongoose.Schema({
  userId: String,
  status: String,
  time: String,
  date: String,
});

const Log = mongoose.model('Log', logSchema);

// Dashboard HTML
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
          padding: 20px;
          margin: 0;
        }
        h1 {
          text-align: center;
          color: #333;
        }
        table {
          margin: 0 auto;
          border-collapse: collapse;
          width: 95%;
          background-color: #fff;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        th, td {
          padding: 12px;
          border: 1px solid #ddd;
          text-align: center;
        }
        th {
          background-color: #4CAF50;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        #refresh {
          margin: 20px auto;
          display: block;
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          font-size: 16px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h1>ZKTeco Live Attendance Logs</h1>
      <button id="refresh" onclick="fetchLogs()">🔄 Refresh Logs</button>
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Status</th>
            <th>Time</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="logTable">
        </tbody>
      </table>

      <script>
        async function fetchLogs() {
          const res = await fetch('/api/logs');
          const data = await res.json();
          const table = document.getElementById('logTable');
          table.innerHTML = '';
          data.reverse().forEach(log => {
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

// Logs API
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find().sort({ _id: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Handle push from ZKTeco device
app.post('/iclock/cdata', async (req, res) => {
  console.log('📥 RAW PUSH:', req.body);

  const userId = extractValue(req.body, 'PIN');
  const statusCode = extractValue(req.body, 'STATUS');
  const status = statusCode === '0' ? 'Check-In' : 'Check-Out';

  try {
    await Log.create({
      userId,
      status,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
    });
  } catch (err) {
    console.error('❌ Failed to save log:', err);
  }

  res.send('OK');
});

// Helper to extract value from raw text
function extractValue(body, key) {
  const regex = new RegExp(`${key}=([^\t\r\n]*)`);
  const match = body.match(regex);
  return match ? match[1] : 'UNKNOWN';
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
