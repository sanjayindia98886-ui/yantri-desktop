const express = require('express');
const cors = require('cors');
const http = require('http');

// Database Import
const db = require('./config/database'); 

// Route Imports
const partyRoutes = require('./routes/partyRoutes');              // F1: Party Master
const salesRoutes = require('./routes/salesRoutes');              // F2 & F3: Sales & Vouchers
const yantriRoutes = require('./routes/yantriRoutes');            // F4: Yantri 1-100 Grid & Cutting
const masterRoutes = require('./routes/masterRoutes');            // F5: Master Settings, Backup & Server Sync
const resultRoutes = require('./routes/resultRoutes');            // F6: Game Results
const summaryRoutes = require('./routes/summaryRoutes');          // F7: Summary Calculation Engine
const balanceHistoryRoutes = require('./routes/balanceHistoryRoutes'); // F8: Balance History
const reportRoutes = require('./routes/reportRoutes');            // F11: Balance Sheet Report
const profitLossRoutes = require('./routes/profitLossRoutes');     // F12: Profit & Loss Report
const saleLCRoutes = require('./routes/saleLCRoutes');            // F9: Sale LC / Bonus
const accountRoutes = require('./routes/accountRoutes');          // F10: Accounts & Ledger
const gameRoutes = require('./routes/gameRoutes');                // Game Master
const accessRoutes = require('./routes/accessRoutes');            // Access Control System
const whatsappRoutes = require('./routes/whatsappRoutes');        // WhatsApp Batch Entry Route

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main API Endpoints Mapping
app.use('/api/parties', partyRoutes);            // F1: Party Master
app.use('/api/sales', salesRoutes);              // F2 & F3: Sales & Vouchers
app.use('/api/yantri', yantriRoutes);            // F4: Yantri 1-100 Grid & Cutting
app.use('/api/master', masterRoutes);            // F5: Master Settings & Backup
app.use('/api/results', resultRoutes);           // F6: Game Results
app.use('/api/summary', summaryRoutes);          // F7: Summary API Endpoint
app.use('/api/balance-history', balanceHistoryRoutes); // F8: Balance History
app.use('/api/accounts', accountRoutes);         // F10: Accounts API Endpoint
app.use('/api/reports', reportRoutes);           // F11: Balance Sheet Report (/api/reports/balance-sheet)
app.use('/api/profit-loss', profitLossRoutes);   // F12: Profit & Loss
app.use('/api/sale-lc', saleLCRoutes);           // F9: Sale LC / Bonus
app.use('/api/games', gameRoutes);              // Game Master
app.use('/api/access', accessRoutes);            // Access Control
app.use('/api/whatsapp', whatsappRoutes);        // WhatsApp Batch Entry

// Root Test Route
app.get('/', function(req, res) {
  res.send('Yantri Desktop Backend Server Working Smoothly!');
});

// Port Settings
const PORT = process.env.PORT || 5000;

// EADDRINUSE handling
server.listen(PORT, function() {
  console.log('Server active on http://localhost:' + PORT);
}).on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    console.log('Port ' + PORT + ' is already in use. Reusing existing backend server.');
  } else {
    console.error('Server error:', err);
  }
});