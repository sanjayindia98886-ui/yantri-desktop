const db = require('../config/database');

// Helper function: Convert DD/MM/YYYY to YYYY-MM-DD or standard trim
function toIsoDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (trimmed.length < 10) return trimmed;
  if (trimmed.indexOf('/') !== -1) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    }
  }
  return trimmed;
}

// Bet Parser Engine for F8 (Jodi, Ander, Bahar Detection)
function parseBetItem(numStr, betType) {
  let num = String(numStr || '').trim().toUpperCase().replace(/[\s\-_]+/g, '');
  let bet = String(betType || '').trim().toUpperCase();

  if (!num && bet) num = bet;

  for (let i = 0; i <= 9; i++) {
    const d = String(i);
    const aKey = 'A' + d;
    const quad = d + d + d + d;
    if (
      num === aKey || num === (d + 'A') || num === quad ||
      num === (d + 'ANDER') || num === ('ANDER' + d) ||
      (bet === 'A' && num === d) || (bet === 'ANDER' && num === d) || (bet === aKey)
    ) {
      return { type: 'ANDER', digit: d };
    }
  }

  for (let i = 0; i <= 9; i++) {
    const d = String(i);
    const bKey = 'B' + d;
    const triple = d + d + d;
    if (
      num === bKey || num === (d + 'B') || num === triple ||
      num === (d + 'BAHAR') || num === ('BAHAR' + d) ||
      (bet === 'B' && num === d) || (bet === 'BAHAR' && num === d) || (bet === bKey)
    ) {
      return { type: 'BAHAR', digit: d };
    }
  }

  let cleaned = num.replace(/[^0-9]/g, '');
  if (cleaned === '100' || cleaned === '0') cleaned = '00';
  if (cleaned.length > 0) {
    cleaned = cleaned.padStart(2, '0');
    if (cleaned.length > 2) cleaned = cleaned.slice(-2);
    return { type: 'JODI', jodi: cleaned };
  }

  return { type: 'UNKNOWN' };
}

// Main F8 Controller
const getBalanceHistory = (req, res) => {
  try {
    const rawFromDate = String(req.query.fromDate || '').trim();
    const rawToDate = String(req.query.toDate || rawFromDate).trim();
    
    // Normalization for SQL matching
    const fromDate = rawFromDate;
    const toDate = rawToDate;
    
    const withoutHissa = req.query.withoutHissa === 'true';

    // 1. Dynamic Active Games Fetching using '?' for SQLite compatibility wrapper
    const gameQuery = "SELECT DISTINCT UPPER(TRIM(game_name)) AS game_name FROM sales WHERE TRIM(sale_date) >= TRIM(?) AND TRIM(sale_date) <= TRIM(?) ORDER BY sale_id ASC;";

    db.all(gameQuery, [fromDate, toDate], function(gErr, gameRows) {
      if (gErr) return res.status(500).json({ success: false, error: gErr.message });

      let masterGames = (gameRows || []).map(function(g) { return g.game_name; }).filter(Boolean);

      if (!masterGames || masterGames.length === 0) {
        db.all("SELECT DISTINCT UPPER(TRIM(game_name)) AS game_name FROM games ORDER BY game_id ASC;", [], function(mgErr, mgRows) {
          masterGames = (mgRows || []).map(function(g) { return g.game_name; }).filter(Boolean);
          processBalanceHistory(masterGames);
        });
      } else {
        processBalanceHistory(masterGames);
      }

      function processBalanceHistory(activeGames) {
        // 2. Fetch Active Parties
        db.all("SELECT * FROM parties WHERE LOWER(status) = 'active' ORDER BY party_name ASC;", [], function(pErr, parties) {
          if (pErr) return res.status(500).json({ success: false, error: pErr.message });

          // 3. Fetch Results using '?' placeholders
          const resultQuery = "SELECT result_date, game_name, winning_number FROM results WHERE TRIM(result_date) >= TRIM(?) AND TRIM(result_date) <= TRIM(?);";
          db.all(resultQuery, [fromDate, toDate], function(rErr, resultsList) {
            if (rErr) return res.status(500).json({ success: false, error: rErr.message });

            const resultMap = {};
            (resultsList || []).forEach(function(r) {
              if (r.game_name && r.result_date) {
                const key = r.result_date.trim() + '_' + r.game_name.toUpperCase().trim();
                resultMap[key] = String(r.winning_number || '').trim();
              }
            });

            // 4. Fetch Sales Data using '?' placeholders
            const salesQuery = "SELECT s.sale_id, s.sale_date, s.party_name, s.game_name, " +
              "si.number_val, si.amount, si.bet_type " +
              "FROM sales s " +
              "JOIN sale_items si ON s.sale_id = si.sale_id " +
              "WHERE TRIM(s.sale_date) >= TRIM(?) AND TRIM(s.sale_date) <= TRIM(?);";

            db.all(salesQuery, [fromDate, toDate], function(sErr, salesData) {
              if (sErr) return res.status(500).json({ success: false, error: sErr.message });

              const shiftBalanceMap = {};
              const shiftSaleMap = {};
              activeGames.forEach(function(g) {
                shiftBalanceMap[g] = 0;
                shiftSaleMap[g] = 0;
              });

              const tpPattiAccumulator = {};

              // Initialize Party Structure
              const partyMap = {};
              (parties || []).forEach(function(p) {
                const pKey = String(p.party_name || '').toLowerCase().trim();
                tpPattiAccumulator[pKey] = 0;

                const gameObj = {};
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
                const pKey = String(party.party_name || '').toLowerCase().trim();
                const partySales = (salesData || []).filter(function(s) {
                  return s.party_name && String(s.party_name).toLowerCase().trim() === pKey;
                });

                let partyTotalSale = 0;
                let partyTotalBalance = 0;
                let partyTotalJoda = 0;
                let partyTotalAkhar = 0;

                if (partySales.length > 0) {
                  activeGames.forEach(function(g) {
                    const gSales = partySales.filter(function(s) {
                      return s.game_name && String(s.game_name).toUpperCase().trim() === g;
                    });
                    if (gSales.length === 0) return;

                    let dSale = 0, aSale = 0;
                    let winNoPlayedAmt = 0;
                    let winAkharPlayedAmt = 0;

                    const dComm = Number(party.d_comm) || 10;
                    const aComm = Number(party.a_comm) || 10;
                    const dAmt = Number(party.d_amt) || 90;
                    const aAmt = Number(party.a_amt) || 9;

                    gSales.forEach(function(item) {
                      const amt = Number(item.amount) || 0;
                      const parsed = parseBetItem(item.number_val, item.bet_type);
                      const resKey = item.sale_date.trim() + '_' + g;
                      const declaredRes = resultMap[resKey] || '';

                      if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') aSale += amt;
                      else dSale += amt;

                      if (declaredRes) {
                        let normRes = declaredRes.padStart(2, '0');
                        if (normRes.length > 2) normRes = normRes.slice(-2);
                        const resJodi = normRes;
                        const resAnder = normRes[0];
                        const resBahar = normRes[1];

                        if (parsed.type === 'ANDER' && parsed.digit === resAnder) winNoPlayedAmt += (amt * 0.10);
                        else if (parsed.type === 'BAHAR' && parsed.digit === resBahar) winAkharPlayedAmt += amt;
                        else if (parsed.type === 'JODI' && parsed.jodi === resJodi) winNoPlayedAmt += amt;
                      }
                    });

                    const totalGameSale = dSale + aSale;
                    const comm = Math.trunc((dSale * (dComm / 100)) + (aSale * (aComm / 100)));
                    const actualSale = totalGameSale - comm;
                    const winAmount = (winNoPlayedAmt * dAmt) + (winAkharPlayedAmt * aAmt);
                    const netBal = actualSale - winAmount;

                    // Exact props for React rendering in Table Cell
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

                // Calculate Patti / Hissa deduction
                const partnerKey = String(party.hissa_party || '').toLowerCase().trim();
                const hissaPerc = Number(party.hissa_patti_perc) || 0;

                let finalPartyBalance = partyTotalBalance;
                if (!withoutHissa && partnerKey && partnerKey !== '0' && partnerKey !== '' && hissaPerc > 0) {
                  const partnerShareAmt = Math.trunc((partyTotalBalance * hissaPerc) / 100);
                  finalPartyBalance = partyTotalBalance - partnerShareAmt;

                  if (tpPattiAccumulator[partnerKey] !== undefined) {
                    tpPattiAccumulator[partnerKey] += partnerShareAmt;
                  } else {
                    tpPattiAccumulator[partnerKey] = partnerShareAmt;
                  }
                }

                partyMap[pKey].totalBalance = finalPartyBalance;
              });

              // Assemble final rows and add Third Party accumulated Patti if any
              const finalRows = [];
              Object.keys(partyMap).forEach(function(k) {
                const pData = partyMap[k];
                const earnedPatti = tpPattiAccumulator[k] || 0;

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
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getBalanceHistory };