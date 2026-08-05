var db = require('../config/database');

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

// Bet Parser Engine for F8
function parseBetItem(numStr, betType) {
  var num = String(numStr || '').trim().toUpperCase().replace(/[\s\-_]+/g, '');
  var bet = String(betType || '').trim().toUpperCase();

  if (!num && bet) num = bet;

  for (var i = 0; i <= 9; i++) {
    var d = String(i);
    var aKey = 'A' + d;
    var quad = d + d + d + d;
    if (
      num === aKey || num === (d + 'A') || num === quad ||
      num === (d + 'ANDER') || num === ('ANDER' + d) ||
      (bet === 'A' && num === d) || (bet === 'ANDER' && num === d) || (bet === aKey)
    ) {
      return { type: 'ANDER', digit: d };
    }
  }

  for (var j = 0; j <= 9; j++) {
    var bd = String(j);
    var bKey = 'B' + bd;
    var triple = bd + bd + bd;
    if (
      num === bKey || num === (bd + 'B') || num === triple ||
      num === (bd + 'BAHAR') || num === ('BAHAR' + bd) ||
      (bet === 'B' && num === bd) || (bet === 'BAHAR' && num === bd) || (bet === bKey)
    ) {
      return { type: 'BAHAR', digit: bd };
    }
  }

  var cleaned = num.replace(/[^0-9]/g, '');
  if (cleaned === '100' || cleaned === '0') cleaned = '00';
  if (cleaned.length > 0) {
    cleaned = cleaned.padStart(2, '0');
    if (cleaned.length > 2) cleaned = cleaned.slice(-2);
    return { type: 'JODI', jodi: cleaned };
  }

  return { type: 'UNKNOWN' };
}

// Main F8 Controller
var getBalanceHistory = function(req, res) {
  try {
    var rawFromDate = String(req.query.fromDate || '').trim();
    var rawToDate = String(req.query.toDate || rawFromDate).trim();
    
    var fromNum = parseDateToNum(rawFromDate);
    var toNum = parseDateToNum(rawToDate);

    var withoutHissa = req.query.withoutHissa === 'true';

    // 1. Safe Query without TRIM(?) for Postgres Compatibility
    var gameQuery = "SELECT DISTINCT UPPER(TRIM(game_name)) AS game_name FROM sales ORDER BY game_name ASC;";

    db.all(gameQuery, [], function(gErr, gameRows) {
      if (gErr) return res.status(500).json({ success: false, error: gErr.message });

      var masterGames = (gameRows || []).map(function(g) { return g.game_name; }).filter(Boolean);

      if (!masterGames || masterGames.length === 0) {
        masterGames = ["FARIDABAD", "GAZIABAD", "GALI", "DISAWAR"];
      }

      processBalanceHistory(masterGames);
    });

    function processBalanceHistory(activeGames) {
      // 2. Fetch Active Parties
      db.all("SELECT * FROM parties WHERE LOWER(status) = 'active' ORDER BY party_name ASC;", [], function(pErr, parties) {
        if (pErr) return res.status(500).json({ success: false, error: pErr.message });

        // 3. Fetch Results
        db.all("SELECT result_date, game_name, winning_number FROM results;", [], function(rErr, resultsList) {
          if (rErr) return res.status(500).json({ success: false, error: rErr.message });

          var resultMap = {};
          (resultsList || []).forEach(function(r) {
            if (r.game_name && r.result_date) {
              var rNum = parseDateToNum(r.result_date);
              var key = rNum + '_' + r.game_name.toUpperCase().trim();
              resultMap[key] = String(r.winning_number || '').trim();
            }
          });

          // 4. Fetch Sales Data cleanly without TRIM(?)
          var salesQuery = "SELECT s.sale_id, s.sale_date, s.party_name, s.game_name, " +
            "si.number_val, si.amount, si.bet_type " +
            "FROM sales s " +
            "JOIN sale_items si ON s.sale_id = si.sale_id;";

          db.all(salesQuery, [], function(sErr, allSalesData) {
            if (sErr) return res.status(500).json({ success: false, error: sErr.message });

            // Date filtering in JS (Exact same as F9)
            var salesData = (allSalesData || []).filter(function(s) {
              var sNum = parseDateToNum(s.sale_date);
              return (fromNum > 0 && toNum > 0 && sNum > 0) ? (sNum >= fromNum && sNum <= toNum) : true;
            });

            var shiftBalanceMap = {};
            var shiftSaleMap = {};
            activeGames.forEach(function(g) {
              shiftBalanceMap[g] = 0;
              shiftSaleMap[g] = 0;
            });

            var tpPattiAccumulator = {};
            var partyMap = {};

            (parties || []).forEach(function(p) {
              var pKey = String(p.party_name || '').toLowerCase().trim();
              tpPattiAccumulator[pKey] = 0;

              var gameObj = {};
              activeGames.forEach(function(g) { gameObj[g] = null; });

              partyMap[pKey] = {
                pno: p.pno || p.id,
                pname: p.party_name,
                party_name: p.party_name,
                PName: p.party_name,
                totalAmount: 0,
                totalBalance: 0,
                winJodaTotal: 0,
                winAkharTotal: 0,
                games: gameObj,
                hissa_party: String(p.hissa_party || '').trim(),
                hissa_patti_perc: Number(p.hissa_patti_perc) || 0
              };
            });

            // Process Game wise Sales & Winning Calculations
            (parties || []).forEach(function(party) {
              var pKey = String(party.party_name || '').toLowerCase().trim();
              var partySales = (salesData || []).filter(function(s) {
                return s.party_name && String(s.party_name).toLowerCase().trim() === pKey;
              });

              var partyTotalSale = 0;
              var partyTotalBalance = 0;
              var partyTotalJoda = 0;
              var partyTotalAkhar = 0;

              if (partySales.length > 0) {
                activeGames.forEach(function(g) {
                  var gSales = partySales.filter(function(s) {
                    return s.game_name && String(s.game_name).toUpperCase().trim() === g;
                  });
                  if (gSales.length === 0) return;

                  var dSale = 0, aSale = 0;
                  var winNoPlayedAmt = 0;
                  var winAkharPlayedAmt = 0;

                  var dComm = Number(party.d_comm) || 10;
                  var aComm = Number(party.a_comm) || 10;
                  var dAmt = Number(party.d_amt) || 90;
                  var aAmt = Number(party.a_amt) || 9;

                  gSales.forEach(function(item) {
                    var amt = Number(item.amount) || 0;
                    var parsed = parseBetItem(item.number_val, item.bet_type);
                    var sNum = parseDateToNum(item.sale_date);
                    var resKey = sNum + '_' + g;
                    var declaredRes = resultMap[resKey] || '';

                    if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') aSale += amt;
                    else dSale += amt;

                    if (declaredRes) {
                      var normRes = declaredRes.padStart(2, '0');
                      if (normRes.length > 2) normRes = normRes.slice(-2);
                      var resJodi = normRes;
                      var resAnder = normRes[0];
                      var resBahar = normRes[1];

                      if (parsed.type === 'ANDER' && parsed.digit === resAnder) winNoPlayedAmt += (amt * 0.10);
                      else if (parsed.type === 'BAHAR' && parsed.digit === resBahar) winAkharPlayedAmt += amt;
                      else if (parsed.type === 'JODI' && parsed.jodi === resJodi) winNoPlayedAmt += amt;
                    }
                  });

                  var totalGameSale = dSale + aSale;
                  var comm = Math.trunc((dSale * (dComm / 100)) + (aSale * (aComm / 100)));
                  var actualSale = totalGameSale - comm;
                  var winAmount = (winNoPlayedAmt * dAmt) + (winAkharPlayedAmt * aAmt);
                  var netBal = actualSale - winAmount;

                  partyMap[pKey].games[g] = {
                    sale: totalGameSale,
                    balance: netBal,
                    winJoda: winNoPlayedAmt,
                    winAkhar: winAkharPlayedAmt
                  };

                  partyTotalSale += totalGameSale;
                  partyTotalBalance += netBal;
                  partyTotalJoda += winNoPlayedAmt;
                  partyTotalAkhar += winAkharPlayedAmt;

                  shiftSaleMap[g] = (shiftSaleMap[g] || 0) + totalGameSale;
                  shiftBalanceMap[g] = (shiftBalanceMap[g] || 0) + netBal;
                });
              }

              partyMap[pKey].totalAmount = partyTotalSale;
              partyMap[pKey].winJodaTotal = partyTotalJoda;
              partyMap[pKey].winAkharTotal = partyTotalAkhar;

              var partnerKey = String(party.hissa_party || '').toLowerCase().trim();
              var hissaPerc = Number(party.hissa_patti_perc) || 0;

              var finalPartyBalance = partyTotalBalance;
              if (!withoutHissa && partnerKey && partnerKey !== '0' && partnerKey !== '' && hissaPerc > 0) {
                var partnerShareAmt = Math.trunc((partyTotalBalance * hissaPerc) / 100);
                finalPartyBalance = partyTotalBalance - partnerShareAmt;

                if (tpPattiAccumulator[partnerKey] !== undefined) {
                  tpPattiAccumulator[partnerKey] += partnerShareAmt;
                } else {
                  tpPattiAccumulator[partnerKey] = partnerShareAmt;
                }
              }

              partyMap[pKey].totalBalance = finalPartyBalance;
            });

            var finalRows = [];
            Object.keys(partyMap).forEach(function(k) {
              var pData = partyMap[k];
              var earnedPatti = tpPattiAccumulator[k] || 0;

              if (!withoutHissa && earnedPatti > 0) {
                pData.totalBalance += earnedPatti;
              }

              finalRows.push(pData);
            });

            return res.json({
              success: true,
              games: activeGames,
              rows: finalRows,
              shiftBalance: shiftBalanceMap,
              shiftSale: shiftSaleMap
            });
          });
        });
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getBalanceHistory: getBalanceHistory };