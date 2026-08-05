const db = require('../config/database');
const { toIsoDate, parseBetItem, calculateGameWinning, calculatePartyOpening } = require('../helpers/balanceCalculator');

// 0. F7 Summary Dummy Handler
const getSummaryReport = function (req, res) {
  return res.json({ success: true, data: [] });
};

// 1. F8: BALANCE HISTORY CONTROLLER
const getBalanceHistory = function (req, res) {
  try {
    const fromDate = String(req.query.fromDate || '').trim();
    const toDate = String(req.query.toDate || fromDate).trim();
    const withoutHissa = req.query.withoutHissa === 'true';

    // FIX 1: PostgreSQL Compatible DISTINCT + ORDER BY query without TRIM($1)
    const gameQuery = "SELECT DISTINCT UPPER(TRIM(game_name)) AS game_name FROM sales WHERE sale_date >= $1 AND sale_date <= $2;";

    db.all(gameQuery, [fromDate, toDate], function (gErr, gameRows) {
      if (gErr) return res.status(500).json({ success: false, error: gErr.message });

      let masterGames = (gameRows || []).map(function (g) { return g.game_name; }).filter(Boolean);

      if (!masterGames || masterGames.length === 0) {
        db.all("SELECT DISTINCT UPPER(TRIM(game_name)) AS game_name FROM games;", [], function (mgErr, mgRows) {
          masterGames = (mgRows || []).map(function (g) { return g.game_name; }).filter(Boolean);
          processBalanceHistory(masterGames);
        });
      } else {
        processBalanceHistory(masterGames);
      }

      function processBalanceHistory(activeGames) {
        db.all("SELECT * FROM parties WHERE LOWER(status) = 'active' ORDER BY party_name ASC;", [], function (pErr, parties) {
          if (pErr) return res.status(500).json({ success: false, error: pErr.message });

          db.all("SELECT result_date, game_name, winning_number FROM results WHERE result_date >= $1 AND result_date <= $2;", [fromDate, toDate], function (rErr, resultsList) {
            if (rErr) return res.status(500).json({ success: false, error: rErr.message });

            const resultMap = {};
            (resultsList || []).forEach(function (r) {
              if (r.game_name && r.result_date) {
                const key = r.result_date.trim() + '_' + r.game_name.toUpperCase().trim();
                resultMap[key] = String(r.winning_number || '').trim();
              }
            });

            const salesQuery = "SELECT s.sale_id, s.sale_date, s.party_name, s.game_name, " +
              "si.number_val, si.amount, si.bet_type " +
              "FROM sales s " +
              "JOIN sale_items si ON s.sale_id = si.sale_id " +
              "WHERE s.sale_date >= $1 AND s.sale_date <= $2;";

            db.all(salesQuery, [fromDate, toDate], function (sErr, salesData) {
              if (sErr) return res.status(500).json({ success: false, error: sErr.message });

              const shiftBalanceMap = {};
              const shiftSaleMap = {};
              activeGames.forEach(function (g) {
                shiftBalanceMap[g] = 0;
                shiftSaleMap[g] = 0;
              });

              const tpPattiAccumulator = {};
              const partyMap = {};

              (parties || []).forEach(function (p) {
                const pKey = String(p.party_name || '').toLowerCase().trim();
                tpPattiAccumulator[pKey] = 0;

                const gameObj = {};
                activeGames.forEach(function (g) { gameObj[g] = null; });

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

              (parties || []).forEach(function (party) {
                const pKey = String(party.party_name || '').toLowerCase().trim();
                const partySales = (salesData || []).filter(function (s) {
                  return s.party_name && String(s.party_name).toLowerCase().trim() === pKey;
                });

                let partyTotalSale = 0;
                let partyTotalBalance = 0;
                let partyTotalJoda = 0;
                let partyTotalAkhar = 0;

                if (partySales.length > 0) {
                  activeGames.forEach(function (g) {
                    const gSales = partySales.filter(function (s) {
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

                    gSales.forEach(function (item) {
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

                        if (parsed.type === 'ANDER' && parsed.digit === resAnder) winAkharPlayedAmt += amt;
                        else if (parsed.type === 'BAHAR' && parsed.digit === resBahar) winAkharPlayedAmt += amt;
                        else if (parsed.type === 'JODI' && parsed.jodi === resJodi) winNoPlayedAmt += amt;
                      }
                    });

                    const totalGameSale = dSale + aSale;
                    const comm = Math.trunc((dSale * (dComm / 100)) + (aSale * (aComm / 100)));
                    const actualSale = totalGameSale - comm;
                    const winAmount = (winNoPlayedAmt * dAmt) + (winAkharPlayedAmt * aAmt);
                    const netBal = actualSale - winAmount;

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

              const finalRows = [];
              Object.keys(partyMap).forEach(function (k) {
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

// 2. F11: BALANCE SHEET CONTROLLER
const getBalanceSheet = function (req, res) {
  try {
    const fromDateRaw = String(req.query.fromDate || '15/07/2026').trim();
    const toDateRaw = String(req.query.toDate || '22/07/2026').trim();
    const withoutHissa = req.query.withoutHissa === 'true';

    const isoFromDate = toIsoDate(fromDateRaw);
    const isoToDate = toIsoDate(toDateRaw);

    const partyQuery = "SELECT * FROM parties ORDER BY pno ASC;";

    db.all(partyQuery, [], function (pErr, parties) {
      if (pErr) return res.status(500).json({ success: false, error: pErr.message });

      const partyList = parties || [];
      if (partyList.length === 0) return res.json({ success: true, data: [] });

      const resultQuery = "SELECT game_name, winning_number, result_date FROM results;";

      db.all(resultQuery, [], function (rErr, resultsList) {
        const safeResults = rErr ? [] : (resultsList || []);

        const ledgerQuery = "SELECT party_name, entry_date, debit_amt, credit_amt, description, narration FROM ledger_entries;";

        db.all(ledgerQuery, [], function (lErr, ledgerRows) {
          const safeLedger = lErr ? [] : (ledgerRows || []);

          const salesQuery = "SELECT s.sale_id, s.party_name, s.game_name, s.sale_date, " +
            "COALESCE(s.d_comm, p.d_comm) AS d_comm, " +
            "COALESCE(s.d_amt, p.d_amt) AS d_amt, " +
            "COALESCE(s.a_comm, p.a_comm) AS a_comm, " +
            "COALESCE(s.a_amt, p.a_amt) AS a_amt, " +
            "si.number_val, si.amount, si.bet_type " +
            "FROM sales s " +
            "JOIN sale_items si ON s.sale_id = si.sale_id " +
            "LEFT JOIN parties p ON LOWER(TRIM(s.party_name)) = LOWER(TRIM(p.party_name));";

          db.all(salesQuery, [], function (sErr, salesRows) {
            const safeSales = sErr ? [] : (salesRows || []);

            db.all("SELECT * FROM posted_lc_entries;", [], function (lcErr, postedLcRows) {
              const safePostedLc = lcErr ? [] : (postedLcRows || []);

              const dynamicGames = ['GB', 'DN', 'FB', 'DS', 'ND', 'PATNA'];
              safeSales.forEach(function (s) {
                if (s.game_name) {
                  const g = String(s.game_name).toUpperCase().trim();
                  if (dynamicGames.indexOf(g) === -1) dynamicGames.push(g);
                }
              });

              // STEP 1: Third Party Hissa/Patti Calculate
              const tpPattiMap = {};

              partyList.forEach(function (party) {
                const normPName = (party.party_name || '').toLowerCase().trim();
                const hParty = String(party.hissa_party || '').toLowerCase().trim();
                const hissaPattiPerc = Number(party.hissa_patti_perc) || 0;

                if (hParty && hParty !== '0' && hParty !== '' && hissaPattiPerc > 0 && !withoutHissa) {
                  let totalGameNetBalance = 0;

                  dynamicGames.forEach(function (g) {
                    let dSale = 0, aSale = 0;
                    let effectiveDComm = Number(party.d_comm) || 10;
                    let effectiveDAmt = Number(party.d_amt) || 90;
                    let effectiveAComm = Number(party.a_comm) || 10;
                    let effectiveAAmt = Number(party.a_amt) || 9;

                    const partyGameSales = safeSales.filter(function (s) {
                      const matchParty = s.party_name && s.party_name.toLowerCase().trim() === normPName;
                      const matchGame = s.game_name && String(s.game_name).toUpperCase().trim() === g;
                      const isoSaleDate = toIsoDate(s.sale_date);
                      return matchParty && matchGame && isoSaleDate >= isoFromDate && isoSaleDate <= isoToDate;
                    });

                    partyGameSales.forEach(function (item) {
                      const amt = Number(item.amount) || 0;
                      const parsed = parseBetItem(item.number_val, item.bet_type);

                      if (item.d_comm !== null && item.d_comm !== undefined) effectiveDComm = Number(item.d_comm);
                      if (item.d_amt !== null && item.d_amt !== undefined) effectiveDAmt = Number(item.d_amt);
                      if (item.a_comm !== null && item.a_comm !== undefined) effectiveAComm = Number(item.a_comm);
                      if (item.a_amt !== null && item.a_amt !== undefined) effectiveAAmt = Number(item.a_amt);

                      if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') aSale += amt;
                      else dSale += amt;
                    });

                    let declaredWinNo = '';
                    safeResults.forEach(function (resItem) {
                      if (resItem.game_name && String(resItem.game_name).toUpperCase().trim() === g) {
                        const isoResDate = toIsoDate(resItem.result_date);
                        if (isoResDate >= isoFromDate && isoResDate <= isoToDate) {
                          declaredWinNo = String(resItem.winning_number || '').trim();
                        }
                      }
                    });

                    const winRes = calculateGameWinning(partyGameSales, declaredWinNo);
                    const totalSale = dSale + aSale;
                    const comm = Math.trunc((dSale * (effectiveDComm / 100)) + (aSale * (effectiveAComm / 100)));
                    const actualSale = totalSale - comm;
                    const winAmount = (winRes.winNoPlayedAmt * effectiveDAmt) + (winRes.winAkharPlayedAmt * effectiveAAmt);
                    
                    totalGameNetBalance += (actualSale - winAmount);
                  });

                  const calculatedTpPatti = Math.trunc((totalGameNetBalance * hissaPattiPerc) / 100);
                  if (!tpPattiMap[hParty]) tpPattiMap[hParty] = 0;
                  tpPattiMap[hParty] += calculatedTpPatti;
                }
              });

              // STEP 2: Main Rows Generate
              const resultList = partyList.map(function (party) {
                const pname = party.party_name || '';
                const normPName = pname.toLowerCase().trim();

                let opening = calculatePartyOpening(party, safeSales, safeResults, safeLedger, partyList, isoFromDate, safePostedLc);
                let netPayment = 0;

                const gamesMap = {};
                dynamicGames.forEach(function (g) {
                  gamesMap[g] = { sale: 0, win: 0, comm: 0, net: 0 };
                });

                safeLedger.forEach(function (l) {
                  if (l.party_name && l.party_name.toLowerCase().trim() === normPName) {
                    const isoEntryDate = toIsoDate(l.entry_date);
                    if (isoEntryDate && isoEntryDate >= isoFromDate && isoEntryDate <= isoToDate) {
                      netPayment += ((Number(l.debit_amt) || 0) - (Number(l.credit_amt) || 0));
                    }
                  }
                });

                let postedLcAmount = 0;
                safePostedLc.forEach(function (plc) {
                  if (plc.party_name && plc.party_name.toLowerCase().trim() === normPName) {
                    const plcFrom = toIsoDate(plc.from_date);
                    const plcTo = toIsoDate(plc.to_date);
                    if (plcFrom >= isoFromDate && plcTo <= isoToDate) {
                      postedLcAmount += Number(plc.lc_amount) || 0;
                    }
                  }
                });

                let thirdPartyPostedLcEffect = 0;
                partyList.forEach(function (srcParty) {
                  const srcOvLcParty = String(srcParty.override_lc_party || '').toLowerCase().trim();
                  if (srcOvLcParty === normPName) {
                    const srcPName = String(srcParty.party_name || '').toLowerCase().trim();
                    safePostedLc.forEach(function (plc) {
                      if (plc.party_name && plc.party_name.toLowerCase().trim() === srcPName) {
                        const plcFrom = toIsoDate(plc.from_date);
                        const plcTo = toIsoDate(plc.to_date);
                        if (plcFrom >= isoFromDate && plcTo <= isoToDate) {
                          thirdPartyPostedLcEffect += Number(plc.lc_amount) || 0;
                        }
                      }
                    });
                  }
                });

                const totalPostedLc = postedLcAmount + thirdPartyPostedLcEffect;

                dynamicGames.forEach(function (g) {
                  let dSale = 0, aSale = 0;
                  let effectiveDComm = Number(party.d_comm) || 10;
                  let effectiveDAmt = Number(party.d_amt) || 90;
                  let effectiveAComm = Number(party.a_comm) || 10;
                  let effectiveAAmt = Number(party.a_amt) || 9;

                  const partyGameSales = safeSales.filter(function (s) {
                    const matchParty = s.party_name && s.party_name.toLowerCase().trim() === normPName;
                    const matchGame = s.game_name && String(s.game_name).toUpperCase().trim() === g;
                    const isoSaleDate = toIsoDate(s.sale_date);
                    const matchDate = isoSaleDate >= isoFromDate && isoSaleDate <= isoToDate;
                    return matchParty && matchGame && matchDate;
                  });

                  partyGameSales.forEach(function (item) {
                    const amt = Number(item.amount) || 0;
                    const parsed = parseBetItem(item.number_val, item.bet_type);

                    if (item.d_comm !== null && item.d_comm !== undefined) effectiveDComm = Number(item.d_comm);
                    if (item.d_amt !== null && item.d_amt !== undefined) effectiveDAmt = Number(item.d_amt);
                    if (item.a_comm !== null && item.a_comm !== undefined) effectiveAComm = Number(item.a_comm);
                    if (item.a_amt !== null && item.a_amt !== undefined) effectiveAAmt = Number(item.a_amt);

                    if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') aSale += amt;
                    else dSale += amt;
                  });

                  let declaredWinNo = '';
                  safeResults.forEach(function (resItem) {
                    if (resItem.game_name && String(resItem.game_name).toUpperCase().trim() === g) {
                      const isoResDate = toIsoDate(resItem.result_date);
                      if (isoResDate >= isoFromDate && isoResDate <= isoToDate) {
                        declaredWinNo = String(resItem.winning_number || '').trim();
                      }
                    }
                  });

                  const winRes = calculateGameWinning(partyGameSales, declaredWinNo);
                  const totalSale = dSale + aSale;
                  const comm = Math.trunc((dSale * (effectiveDComm / 100)) + (aSale * (effectiveAComm / 100)));
                  const actualSale = totalSale - comm;
                  const winAmount = (winRes.winNoPlayedAmt * effectiveDAmt) + (winRes.winAkharPlayedAmt * effectiveAAmt);
                  const gameNet = actualSale - winAmount;

                  gamesMap[g] = { sale: totalSale, win: winAmount, comm: comm, net: gameNet };
                });

                let totalGameNetBalance = 0;
                dynamicGames.forEach(function (g) {
                  totalGameNetBalance += gamesMap[g].net;
                });

                let finalTodays = totalGameNetBalance;

                let earnedTpPatti = tpPattiMap[normPName] || 0;
                let displayTpPatti = 0;
                if (earnedTpPatti !== 0) {
                  displayTpPatti = -earnedTpPatti;
                }

                let netBal = opening + finalTodays + earnedTpPatti + netPayment - totalPostedLc;

                return {
                  pno: party.pno,
                  party_name: pname,
                  PName: pname,
                  city: party.city || '',
                  City: party.city || '',
                  status: party.status || 'Active',
                  hissa_party: party.hissa_party || '',
                  opening: opening,
                  todays: finalTodays,
                  tpPatti: displayTpPatti,
                  payment: netPayment,
                  tpComm: 0,
                  net_balance: netBal,
                  games: gamesMap
                };
              });

              return res.json({ success: true, data: resultList });
            });
          });
        });
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSummaryReport: getSummaryReport,
  getBalanceHistory: getBalanceHistory,
  getBalanceSheet: getBalanceSheet
};