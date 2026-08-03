var db = require('../config/database');

// 0. Ensure Posted LC Table Exists (PostgreSQL Compatible)
db.run("CREATE TABLE IF NOT EXISTS posted_lc_entries (" +
  "lc_id SERIAL PRIMARY KEY, " +
  "party_name VARCHAR(255), " +
  "from_date VARCHAR(50), " +
  "to_date VARCHAR(50), " +
  "lc_amount NUMERIC, " +
  "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
");");

// Date Formatter Helper
function parseDateToNum(dateStr) {
  if (!dateStr) return 0;
  var str = String(dateStr).trim();
  
  if (str.indexOf('/') !== -1) {
    var parts = str.split('/');
    if (parts.length === 3) {
      var day = parts[0].padStart(2, '0');
      var month = parts[1].padStart(2, '0');
      var year = parts[2];
      return Number(year + month + day);
    }
  } else if (str.indexOf('-') !== -1) {
    var p = str.split('-');
    if (p.length === 3) {
      if (p[0].length === 4) {
        return Number(p[0] + p[1].padStart(2, '0') + p[2].padStart(2, '0'));
      } else {
        return Number(p[2] + p[1].padStart(2, '0') + p[0].padStart(2, '0'));
      }
    }
  }
  return 0;
}

// Helper to detect Bet Types
function parseBetItem(numStr, betType) {
  var num = String(numStr || '').trim().toUpperCase().replace(/[\s\-_]+/g, '');
  var bet = String(betType || '').trim().toUpperCase();

  if (!num && bet) num = bet;

  for (var i = 0; i <= 9; i++) {
    var d = String(i);
    var aKey = 'A' + d;
    if (
      num === aKey || num === (d + 'A') || num === (d + d + d + d) ||
      num === (d + 'ANDER') || num === ('ANDER' + d) ||
      (bet === 'A' && num === d) || (bet === 'ANDER' && num === d) || (bet === aKey)
    ) {
      return { type: 'ANDER', digit: d, key: aKey };
    }
  }

  for (var j = 0; j <= 9; j++) {
    var bd = String(j);
    var bKey = 'B' + bd;
    if (
      num === bKey || num === (bd + 'B') || num === (bd + bd + bd) ||
      num === (bd + 'BAHAR') || num === ('BAHAR' + bd) ||
      (bet === 'B' && num === bd) || (bet === 'BAHAR' && num === bd) || (bet === bKey)
    ) {
      return { type: 'BAHAR', digit: bd, key: bKey };
    }
  }

  if (num.startsWith('A') || num.endsWith('A') || bet === 'A' || bet === 'ANDER') {
    var digitsA = num.replace(/[^0-9]/g, '');
    if (digitsA.length > 0) return { type: 'ANDER', digit: digitsA[digitsA.length - 1], key: 'A' + digitsA[digitsA.length - 1] };
  }

  if (num.startsWith('B') || num.endsWith('B') || bet === 'B' || bet === 'BAHAR') {
    var digitsB = num.replace(/[^0-9]/g, '');
    if (digitsB.length > 0) return { type: 'BAHAR', digit: digitsB[0], key: 'B' + digitsB[0] };
  }

  var cleaned = num.replace(/[^0-9]/g, '');
  if (cleaned === '100' || cleaned === '0') cleaned = '00';
  if (cleaned.length > 0) {
    cleaned = cleaned.padStart(2, '0');
    if (cleaned.length > 2) cleaned = cleaned.slice(-2);
    return { type: 'JODI', jodi: cleaned, key: cleaned };
  }

  return { type: 'UNKNOWN', key: num };
}

// Winning Calculation Engine
function calculateWinningBets(gameSales, resNo) {
  var winNoPlayedAmt = 0;
  var winAkharPlayedAmt = 0;

  if (!resNo) return { winNoPlayedAmt: 0, winAkharPlayedAmt: 0 };

  var normRes = String(resNo).trim();
  if (normRes === '100' || normRes === '0') normRes = '00';
  normRes = normRes.padStart(2, '0');
  if (normRes.length > 2) normRes = normRes.slice(-2);

  var resJodi = normRes;
  var resAnder = normRes[0];
  var resBahar = normRes[1];

  (gameSales || []).forEach(function(item) {
    var amt = Number(item.amount) || 0;
    var parsed = parseBetItem(item.number_val, item.bet_type);

    if (parsed.type === 'ANDER') {
      if (parsed.digit === resAnder) winNoPlayedAmt += (amt * 0.10);
    } else if (parsed.type === 'BAHAR') {
      if (parsed.digit === resBahar) winAkharPlayedAmt += amt;
    } else if (parsed.type === 'JODI') {
      if (parsed.jodi === resJodi) winNoPlayedAmt += amt;
    }
  });

  return { winNoPlayedAmt: winNoPlayedAmt, winAkharPlayedAmt: winAkharPlayedAmt };
}

// Main F9 Sale LC Controller
var getSaleLCData = function(req, res) {
  try {
    var fromDateRaw = String(req.query.fromDate || '01/07/2026').trim();
    var toDateRaw = String(req.query.toDate || '31/07/2026').trim();

    var fromNum = parseDateToNum(fromDateRaw);
    var toNum = parseDateToNum(toDateRaw);

    // 1. Fetch Parties
    db.all("SELECT pno, party_name, lc_perc, patti_perc FROM parties ORDER BY pno ASC", [], function(pErr, parties) {
      if (pErr) return res.status(500).json({ success: false, error: pErr.message });

      // 2. Fetch Sales Items
      var salesQuery = "SELECT s.party_name, s.sale_date, s.game_name, " +
        "COALESCE(s.d_comm, p.d_comm) AS d_comm, " +
        "COALESCE(s.d_amt, p.d_amt) AS d_amt, " +
        "COALESCE(s.a_comm, p.a_comm) AS a_comm, " +
        "COALESCE(s.a_amt, p.a_amt) AS a_amt, " +
        "COALESCE(s.patti_perc, p.patti_perc) AS patti_perc, " +
        "si.number_val, si.amount, si.bet_type " +
        "FROM sales s " +
        "JOIN sale_items si ON s.sale_id = si.sale_id " +
        "LEFT JOIN parties p ON LOWER(TRIM(s.party_name)) = LOWER(TRIM(p.party_name));";

      db.all(salesQuery, [], function(sErr, salesData) {
        if (sErr) return res.status(500).json({ success: false, error: sErr.message });

        // 3. Fetch Game Results
        db.all("SELECT result_date, game_name, winning_number FROM results;", [], function(rErr, resultsList) {
          var safeResults = rErr ? [] : (resultsList || []);

          // 4. Fetch Ledger Entries
          db.all("SELECT entry_id AS acc_id, party_name, entry_date AS date_val, debit_amt, credit_amt, description AS narration FROM ledger_entries;", [], function(aErr, accData) {
            var safeAccData = aErr ? [] : (accData || []);

            // 5. Fetch Posted LC Entries
            db.all("SELECT * FROM posted_lc_entries;", [], function(lcErr, postedLcRows) {
              var safePostedLc = lcErr ? [] : (postedLcRows || []);

              var rows = [];
              var grandAmount = 0, grandComm = 0, grandBalance = 0;
              var grandDene = 0, grandLene = 0, grandTotalComm = 0;

              (parties || []).forEach(function(party) {
                var partyName = party.party_name;
                if (!partyName) return;

                var normName = partyName.toLowerCase().trim();
                var pno = party.pno || 0;
                var lcPerc = Number(party.lc_perc !== undefined ? party.lc_perc : (party.lc_patti !== undefined ? party.lc_patti : (party.lc !== undefined ? party.lc : 0)));
                var defaultPatti = Number(party.patti_perc || 0);

                var pSales = (salesData || []).filter(function(s) {
                  if (!s.party_name) return false;
                  var matchParty = s.party_name.toLowerCase().trim() === normName;
                  var sNum = parseDateToNum(s.sale_date);
                  var matchDate = (fromNum > 0 && toNum > 0 && sNum > 0) ? (sNum >= fromNum && sNum <= toNum) : true;
                  return matchParty && matchDate;
                });

                var partyTotalSale = 0;
                var partyTotalComm = 0;
                var partyTotalWinAmt = 0;
                var partyTotalHissa = 0;

                var salesByGameAndDate = {};
                pSales.forEach(function(item) {
                  var g = String(item.game_name || '').toUpperCase().trim();
                  var d = String(item.sale_date || '').trim();
                  var key = g + '_' + d;
                  if (!salesByGameAndDate[key]) salesByGameAndDate[key] = [];
                  salesByGameAndDate[key].push(item);
                });

                Object.keys(salesByGameAndDate).forEach(function(key) {
                  var gameItems = salesByGameAndDate[key];
                  var firstItem = gameItems[0];
                  var gName = String(firstItem.game_name || '').toUpperCase().trim();
                  var sDate = String(firstItem.sale_date || '').trim();

                  var resObj = safeResults.find(function(r) {
                    return String(r.game_name || '').toUpperCase().trim() === gName && String(r.result_date || '').trim() === sDate;
                  });
                  var resNo = resObj ? String(resObj.winning_number || '').trim() : '';

                  var dSale = 0, aSale = 0;
                  var dComm = Number(firstItem.d_comm || 10);
                  var aComm = Number(firstItem.a_comm || 10);
                  var dAmt = Number(firstItem.d_amt || 90);
                  var aAmt = Number(firstItem.a_amt || 9);
                  var effectivePatti = (firstItem.patti_perc !== null && firstItem.patti_perc !== undefined && Number(firstItem.patti_perc) > 0) ? Number(firstItem.patti_perc) : defaultPatti;

                  gameItems.forEach(function(gi) {
                    var amt = Number(gi.amount) || 0;
                    var parsed = parseBetItem(gi.number_val, gi.bet_type);
                    if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') aSale += amt;
                    else dSale += amt;
                  });

                  var winRes = calculateWinningBets(gameItems, resNo);
                  var commVal = Math.trunc((dSale * (dComm / 100)) + (aSale * (aComm / 100)));
                  var winAmountVal = (winRes.winNoPlayedAmt * dAmt) + (winRes.winAkharPlayedAmt * aAmt);
                  
                  var gameTotSale = dSale + aSale;
                  var gameNetRes = gameTotSale - commVal - winAmountVal;
                  
                  var gameHissa = 0;
                  if (effectivePatti > 0) {
                    gameHissa = Math.trunc((gameNetRes * effectivePatti) / 100);
                  }

                  partyTotalSale += gameTotSale;
                  partyTotalComm += commVal;
                  partyTotalWinAmt += winAmountVal;
                  partyTotalHissa += gameHissa;
                });

                var rawGameBalance = partyTotalSale - partyTotalComm - partyTotalWinAmt;
                var netGameBalance = rawGameBalance - partyTotalHissa;

                var pAcc = safeAccData.filter(function(a) {
                  if (!a.party_name) return false;
                  var matchParty = a.party_name.toLowerCase().trim() === normName;
                  var aNum = parseDateToNum(a.date_val);
                  var matchDate = (fromNum > 0 && toNum > 0 && aNum > 0) ? (aNum >= fromNum && aNum <= toNum) : true;
                  return matchParty && matchDate;
                });

                var payment = 0;
                pAcc.forEach(function(acc) {
                  var credit = Number(acc.credit_amt) || 0;
                  var debit = Number(acc.debit_amt) || 0;
                  if (credit > 0) payment += credit;
                  if (debit > 0) payment -= debit;
                });

                // Robust Posted LC Check using Date Numbers
                var isPosted = false;
                var postedLcAmount = 0;

                safePostedLc.forEach(function(plc) {
                  if (plc.party_name && plc.party_name.toLowerCase().trim() === normName) {
                    var plcFrom = parseDateToNum(plc.from_date);
                    var plcTo = parseDateToNum(plc.to_date);
                    if ((fromNum === 0 || plcFrom === fromNum) && (toNum === 0 || plcTo === toNum)) {
                      isPosted = true;
                      postedLcAmount += Number(plc.lc_amount) || 0;
                    }
                  }
                });

                var finalBalance = netGameBalance - payment - postedLcAmount;
                var dene = 0;
                var lene = 0;

                if (finalBalance > 0) lene = finalBalance;
                else if (finalBalance < 0) dene = Math.abs(finalBalance);

                var commAmount = 0;
                if (!isPosted) {
                  if (lene > 0 && lcPerc > 0) {
                    commAmount = Math.trunc((lene * lcPerc) / 100);
                  }
                }

                grandAmount += partyTotalSale;
                grandComm += partyTotalComm;
                grandBalance += netGameBalance;
                grandDene += dene;
                grandLene += lene;
                grandTotalComm += commAmount;

                rows.push({
                  pno: pno,
                  name: partyName,
                  amount: partyTotalSale,
                  comm: partyTotalComm,
                  balance: netGameBalance,
                  payment: payment,
                  hissa: partyTotalHissa,
                  adjustReceipt: 0,
                  adjustPayment: 0,
                  dene: dene,
                  lene: lene,
                  commPerc: lcPerc,
                  commAmount: commAmount,
                  isPosted: isPosted,
                  postedLcAmount: postedLcAmount
                });
              });

              return res.json({
                success: true,
                rows: rows,
                totals: {
                  amount: grandAmount,
                  comm: grandComm,
                  balance: grandBalance,
                  dene: grandDene,
                  lene: grandLene,
                  totalComm: grandTotalComm,
                  netBalanceStatus: grandLene - grandDene
                }
              });
            });
          });
        });
      });
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Bulk Post LC Entries into posted_lc_entries
var postLCEntry = function(req, res) {
  try {
    var fromDate = String(req.body.fromDate || '').trim();
    var toDate = String(req.body.toDate || '').trim();
    var lcRows = req.body.rows || [];

    var validRows = lcRows.filter(function(row) {
      return Number(row.commAmount) > 0 && !row.isPosted;
    });

    if (validRows.length === 0) {
      return res.json({ success: false, error: 'कोई भी ऐसी पार्टी नहीं है जिसकी LC पोस्ट की जा सके!' });
    }

    var insertQuery = "INSERT INTO posted_lc_entries (party_name, from_date, to_date, lc_amount) VALUES ($1, $2, $3, $4);";
    var postedCount = 0;
    var completed = 0;

    validRows.forEach(function(row) {
      db.run(insertQuery, [row.name, fromDate, toDate, Number(row.commAmount)], function(err) {
        completed++;
        if (!err) postedCount++;

        if (completed === validRows.length) {
          return res.json({
            success: true,
            message: postedCount + ' पार्टियों की LC सफलतापूर्वक जमा (Post) हो गई है!'
          });
        }
      });
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Single/Specific Party LC Entry
var deleteLCEntry = function(req, res) {
  try {
    var partyName = String(req.body.partyName || '').trim();

    if (!partyName) {
      return res.status(400).json({ success: false, error: 'पार्टी का नाम अनिवार्य है!' });
    }

    var deleteQuery = "DELETE FROM posted_lc_entries WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1));";

    db.run(deleteQuery, [partyName], function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });

      return res.json({
        success: true,
        message: partyName + ' की पोस्टेड LC सफलतापूर्वक डिलीट कर दी गई है!'
      });
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getSaleLCData: getSaleLCData,
  postLCEntry: postLCEntry,
  deleteLCEntry: deleteLCEntry
};