const db = require('../config/database');
const { toIsoDate, parseBetItem, calculateGameWinning, calculatePartyOpening } = require('../helpers/balanceCalculator');

// F12: PROFIT & LOSS CONTROLLER (Strict F9 LC Sync, Zero-on-Post Display & Isolated Calculations)
const getProfitLoss = function (req, res) {
  try {
    const fromDateRaw = String(req.query.fromDate || '22/07/2026').trim();
    const toDateRaw = String(req.query.toDate || '22/07/2026').trim();
    const partyTypeFilter = String(req.query.partyType || 'All').trim();
    const thirdPartyFilter = String(req.query.thirdParty || 'All').trim();

    // Agent Check & Auto Party Linking Parameter
    const userRole = String(req.query.userRole || req.query.role || '').trim().toLowerCase();
    const linkedPartyName = String(req.query.linked_party_name || req.query.linkedParty || '').trim();

    const isoFromDate = toIsoDate(fromDateRaw);
    const isoToDate = toIsoDate(toDateRaw);

    const partyQuery = "SELECT * FROM parties ORDER BY pno ASC;";

    db.all(partyQuery, [], function (pErr, parties) {
      if (pErr) return res.status(500).json({ success: false, error: pErr.message });

      const partyList = parties || [];
      if (partyList.length === 0) {
        return res.json({ success: true, rows: [], thirdParties: [] });
      }

      const tpSet = [];
      partyList.forEach(function (p) {
        if (p.hissa_party && String(p.hissa_party).trim() !== '') {
          const tpName = String(p.hissa_party).trim();
          if (tpSet.indexOf(tpName) === -1) tpSet.push(tpName);
        }
      });

      const resultQuery = "SELECT game_name, winning_number, result_date FROM results;";

      db.all(resultQuery, [], function (rErr, resultsList) {
        const safeResults = rErr ? [] : (resultsList || []);

        const ledgerQuery = "SELECT party_name, entry_date, debit_amt, credit_amt, description, narration FROM ledger_entries;";

        db.all(ledgerQuery, [], function (lErr, ledgerRows) {
          const safeLedger = lErr ? [] : (ledgerRows || []);

          // F9 se Posted LC Entries Fetch
          db.all("SELECT * FROM posted_lc_entries;", [], function (lcErr, postedLcRows) {
            const safePostedLc = lcErr ? [] : (postedLcRows || []);

            const salesQuery = "SELECT s.sale_id, s.party_name, s.game_name, s.sale_date, " +
              "s.d_comm AS voucher_d_comm, s.a_comm AS voucher_a_comm, " +
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

              const extraTpCommMap = {};
              const extraTpPattiMap = {};
              const extraLcMap = {};

              // STEP 1: Sabhi Parties ke Override & Third Party Calculations
              partyList.forEach(function (p) {
                const normPName = (p.party_name || '').toLowerCase().trim();
                
                const ovCommParty = String(p.override_comm_party || '').toLowerCase().trim();
                const ovCommPerc = Number(p.override_comm_perc) || 0;

                const ovLcParty = String(p.override_lc_party || '').toLowerCase().trim();
                const ovLcPerc = Number(p.override_lc_perc) || 0;

                const hParty = String(p.hissa_party || '').toLowerCase().trim();
                const hissaPerc = Number(p.hissa_patti_perc) || 0;

                const pSales = safeSales.filter(function (s) {
                  const matchParty = s.party_name && s.party_name.toLowerCase().trim() === normPName;
                  const isoSaleDate = toIsoDate(s.sale_date);
                  return matchParty && isoSaleDate >= isoFromDate && isoSaleDate <= isoToDate;
                });

                let pTotalSale = 0, pTotalWin = 0, pTotalComm = 0;

                pSales.forEach(function (item) {
                  const amt = Number(item.amount) || 0;
                  pTotalSale += amt;

                  let itemDComm = (item.voucher_d_comm !== null && item.voucher_d_comm !== undefined) ? Number(item.voucher_d_comm) : ((item.d_comm !== null && item.d_comm !== undefined) ? Number(item.d_comm) : 10);
                  let itemAComm = (item.voucher_a_comm !== null && item.voucher_a_comm !== undefined) ? Number(item.voucher_a_comm) : ((item.a_comm !== null && item.a_comm !== undefined) ? Number(item.a_comm) : 10);

                  const parsed = parseBetItem(item.number_val, item.bet_type);
                  if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') {
                    pTotalComm += Math.trunc((amt * itemAComm) / 100);
                  } else {
                    pTotalComm += Math.trunc((amt * itemDComm) / 100);
                  }

                  let declaredWinNo = '';
                  safeResults.forEach(function (resItem) {
                    if (resItem.game_name && String(resItem.game_name).toUpperCase().trim() === String(item.game_name).toUpperCase().trim()) {
                      const isoResDate = toIsoDate(resItem.result_date);
                      if (isoResDate === toIsoDate(item.sale_date) || (isoResDate >= isoFromDate && isoResDate <= isoToDate)) {
                        declaredWinNo = String(resItem.winning_number || '').trim();
                      }
                    }
                  });

                  const winRes = calculateGameWinning([item], declaredWinNo);
                  pTotalWin += Number(winRes.winAmount || winRes.totalWin || ((winRes.winNoPlayedAmt || 0) * (item.d_amt || 90)) + ((winRes.winAkharPlayedAmt || 0) * (item.a_amt || 9))) || 0;
                });

                if (ovCommParty && ovCommPerc > 0 && pTotalSale > 0) {
                  if (!extraTpCommMap[ovCommParty]) extraTpCommMap[ovCommParty] = 0;
                  extraTpCommMap[ovCommParty] += Math.trunc((pTotalSale * ovCommPerc) / 100);
                }

                const actualSale = pTotalSale - pTotalComm;
                const basePL = actualSale - pTotalWin;

                const pattiPerc = Number(p.patti_perc) || 0;
                const patti = pattiPerc > 0 ? Math.trunc((basePL * pattiPerc) / 100) : 0;
                const pNetBalance = basePL - patti;

                // Override LC
                if (ovLcParty && ovLcPerc > 0 && pNetBalance > 0) {
                  if (!extraLcMap[ovLcParty]) extraLcMap[ovLcParty] = 0;
                  extraLcMap[ovLcParty] += Math.trunc((pNetBalance * ovLcPerc) / 100);
                }

                // TP Patti
                if (hParty && hParty !== '0' && hissaPerc > 0) {
                  const calculatedPatti = Math.trunc((basePL * hissaPerc) / 100);
                  if (!extraTpPattiMap[hParty]) extraTpPattiMap[hParty] = 0;
                  extraTpPattiMap[hParty] += calculatedPatti;
                }
              });

              let resultRows = [];

              // STEP 2: Main Rows Generate Karna
              partyList.forEach(function (party) {
                const pname = party.party_name || '';
                const normPName = pname.toLowerCase().trim();
                const pType = String(party.party_type || party.type || 'Customer').toLowerCase().trim();
                const hParty = String(party.hissa_party || '').trim();

                if (partyTypeFilter === 'Customer' && pType !== 'customer') return;
                if (partyTypeFilter === 'Uttar' && pType !== 'uttar') return;
                if (thirdPartyFilter !== 'All' && hParty.toLowerCase() !== thirdPartyFilter.toLowerCase()) return;

                let totalSale = 0, totalComm = 0, totalWin = 0;

                let opening = calculatePartyOpening(party, safeSales, safeResults, safeLedger, partyList, isoFromDate, safePostedLc);

                let normalPayment = 0;
                let adjustment = 0;
                let isTpPosted = false;
                let postedTpCommInLedger = 0;

                safeLedger.forEach(function (l) {
                  if (l.party_name && l.party_name.toLowerCase().trim() === normPName) {
                    const isoEntryDate = toIsoDate(l.entry_date);
                    const desc = String(l.description || l.narration || '');

                    if (desc.indexOf('TP Commission Posted') !== -1) {
                      if (isoEntryDate && isoEntryDate >= isoFromDate && isoEntryDate <= isoToDate) {
                        isTpPosted = true;
                        postedTpCommInLedger += (Number(l.credit_amt) || 0) - (Number(l.debit_amt) || 0);
                      }
                    } else {
                      if (isoEntryDate && isoEntryDate >= isoFromDate && isoEntryDate <= isoToDate) {
                        normalPayment += ((Number(l.debit_amt) || 0) - (Number(l.credit_amt) || 0));
                      }
                    }
                  }
                });

                // Check IF F9 Posted LC exists for THIS party
                let postedLcAmountInF9 = 0;
                safePostedLc.forEach(function (plc) {
                  if (plc.party_name && plc.party_name.toLowerCase().trim() === normPName) {
                    const plcFrom = toIsoDate(plc.from_date);
                    const plcTo = toIsoDate(plc.to_date);
                    if (plcFrom >= isoFromDate && plcTo <= isoToDate) {
                      postedLcAmountInF9 += Number(plc.lc_amount) || 0;
                    }
                  }
                });

                const partySales = safeSales.filter(function (s) {
                  const matchParty = s.party_name && s.party_name.toLowerCase().trim() === normPName;
                  const isoSaleDate = toIsoDate(s.sale_date);
                  return matchParty && isoSaleDate >= isoFromDate && isoSaleDate <= isoToDate;
                });

                partySales.forEach(function (item) {
                  const amt = Number(item.amount) || 0;
                  totalSale += amt;

                  let itemDComm = (item.voucher_d_comm !== null && item.voucher_d_comm !== undefined) ? Number(item.voucher_d_comm) : ((item.d_comm !== null && item.d_comm !== undefined) ? Number(item.d_comm) : 10);
                  let itemAComm = (item.voucher_a_comm !== null && item.voucher_a_comm !== undefined) ? Number(item.voucher_a_comm) : ((item.a_comm !== null && item.a_comm !== undefined) ? Number(item.a_comm) : 10);

                  const parsed = parseBetItem(item.number_val, item.bet_type);
                  if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') {
                    totalComm += Math.trunc((amt * itemAComm) / 100);
                  } else {
                    totalComm += Math.trunc((amt * itemDComm) / 100);
                  }

                  let declaredWinNo = '';
                  safeResults.forEach(function (resItem) {
                    if (resItem.game_name && String(resItem.game_name).toUpperCase().trim() === String(item.game_name).toUpperCase().trim()) {
                      const isoResDate = toIsoDate(resItem.result_date);
                      if (isoResDate === toIsoDate(item.sale_date) || (isoResDate >= isoFromDate && isoResDate <= isoToDate)) {
                        declaredWinNo = String(resItem.winning_number || '').trim();
                      }
                    }
                  });

                  const winRes = calculateGameWinning([item], declaredWinNo);
                  totalWin += Number(winRes.winAmount || winRes.totalWin || ((winRes.winNoPlayedAmt || 0) * (item.d_amt || 90)) + ((winRes.winAkharPlayedAmt || 0) * (item.a_amt || 9))) || 0;
                });

                const pattiPerc = Number(party.patti_perc) || 0;
                const actualSale = totalSale - totalComm;
                const basePL = actualSale - totalWin;

                // Self Patti
                const selfPatti = pattiPerc > 0 ? Math.trunc((basePL * pattiPerc) / 100) : 0;

                // TP Patti
                const earnedTpPatti = extraTpPattiMap[normPName] || 0;
                let displayTpPatti = earnedTpPatti !== 0 ? -earnedTpPatti : 0;

                // Third Party LC
                const earnedExtraLc = extraLcMap[normPName] || 0;

                const totalGeneratedTpComm = extraTpCommMap[normPName] || 0;

                let unpostedTpComm = 0;
                if (!isTpPosted) {
                  unpostedTpComm = totalGeneratedTpComm;
                } else {
                  unpostedTpComm = totalGeneratedTpComm - postedTpCommInLedger;
                  if (unpostedTpComm <= 0) unpostedTpComm = 0;
                }

                // Net P/L Calculation
                const netPL = basePL - selfPatti + earnedTpPatti + adjustment;

                let displayUnpostedComm = unpostedTpComm > 0 ? -unpostedTpComm : 0;

                let postedTpEffect = isTpPosted ? -postedTpCommInLedger : 0;
                
                // POST LC EFFECT & DISPLAY CONTROL:
                let postedLcEffect = postedLcAmountInF9 > 0 ? -postedLcAmountInF9 : 0;
                let isThirdPartyLcPosted = false;

                if (earnedExtraLc > 0) {
                  partyList.forEach(function (srcParty) {
                    const srcOvLcParty = String(srcParty.override_lc_party || '').toLowerCase().trim();
                    if (srcOvLcParty === normPName) {
                      const srcPName = String(srcParty.party_name || '').toLowerCase().trim();
                      safePostedLc.forEach(function (plc) {
                        if (plc.party_name && plc.party_name.toLowerCase().trim() === srcPName) {
                          const plcFrom = toIsoDate(plc.from_date);
                          const plcTo = toIsoDate(plc.to_date);
                          if (plcFrom >= isoFromDate && plcTo <= isoToDate) {
                            postedLcEffect += -Number(plc.lc_amount) || 0;
                            isThirdPartyLcPosted = true;
                          }
                        }
                      });
                    }
                  });
                }

                // DISPLAY LC RULE
                let displayLc = 0;
                if (earnedExtraLc > 0 && !isThirdPartyLcPosted) {
                  displayLc = -earnedExtraLc;
                } else {
                  displayLc = 0;
                }

                let netBalance = opening + netPL + normalPayment + postedTpEffect + postedLcEffect;

                resultRows.push({
                  party_name: pname,
                  city: party.city || '',
                  party_type: party.party_type || party.type || 'Customer',
                  hissa_party: party.hissa_party || '',
                  sale: totalSale,
                  comm: totalComm,
                  win: totalWin,
                  patti: selfPatti,
                  tpPatti: displayTpPatti,
                  tpComm: displayUnpostedComm,
                  isTpPosted: isTpPosted,
                  adjustment: adjustment,
                  lc: displayLc,
                  netPL: netPL,
                  opening: opening,
                  payment: normalPayment,
                  netBalance: netBalance
                });
              });

              // Agent Specific Isolation Filtering Logic
              if (userRole === 'agent' && linkedPartyName) {
                const normAgentParty = linkedPartyName.toLowerCase().trim();
                resultRows = resultRows.filter(function (r) {
                  const rPartyNorm = String(r.party_name || '').toLowerCase().trim();
                  const rHissaNorm = String(r.hissa_party || '').toLowerCase().trim();
                  return rPartyNorm === normAgentParty || rHissaNorm === normAgentParty;
                });
              }

              return res.json({ success: true, rows: resultRows, thirdParties: tpSet });
            });
          });
        });
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const postTPCommEntry = function (req, res) {
  try {
    const partyName = String(req.body.partyName || '').trim();
    const toDate = String(req.body.toDate || '').trim();
    const totalTpCommAmount = Number(req.body.tpCommAmount || 0);

    const absAmount = Math.abs(totalTpCommAmount);
    if (absAmount <= 0) {
      return res.json({ success: false, error: 'No TP Commission available to post' });
    }

    const narration = 'TP Commission Posted (' + toDate + ')';
    const insertQuery = "INSERT INTO ledger_entries (party_name, entry_date, debit_amt, credit_amt, description, narration) VALUES ($1, $2, 0, $3, $4, $5);";

    db.run(insertQuery, [partyName, toDate, absAmount, narration, narration], function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      
      return res.json({
        success: true,
        message: partyName + ' का TP Commission (' + absAmount + ') लेजर में सफलतापूर्वक जमा हो गया!'
      });
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deleteTPCommEntry = function (req, res) {
  try {
    const partyName = String(req.body.partyName || '').trim();

    const deleteQuery = "DELETE FROM ledger_entries WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1)) AND (description LIKE 'TP Commission Posted%' OR narration LIKE 'TP Commission Posted%');";

    db.run(deleteQuery, [partyName], function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      return res.json({ success: true, message: 'Posted TP Commission Deleted Successfully for ' + partyName + '!' });
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getProfitLoss: getProfitLoss,
  postTPCommEntry: postTPCommEntry,
  deleteTPCommEntry: deleteTPCommEntry
};