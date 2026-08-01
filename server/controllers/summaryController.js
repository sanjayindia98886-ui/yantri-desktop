const db = require('../config/database');
const { toIsoDate, parseBetItem, calculateGameWinning, calculatePartyOpening } = require('../helpers/balanceCalculator');

// F7: SUMMARY REPORT CONTROLLER (Synced directly with F9 LC & F12 Profit & Loss Logic)
const getSummary = function (req, res) {
  try {
    const queryDate = String(req.query.date || '31/07/2026').trim();
    const agentName = String(req.query.agent || '').trim();
    const withoutHissa = req.query.withoutHissa === 'true';

    if (!agentName) {
      return res.status(400).json({ success: false, error: 'Agent/Party name is required' });
    }

    const isoQueryDate = toIsoDate(queryDate);
    const currentAgentNorm = agentName.toLowerCase().trim();

    // 1. Fetch All Games
    db.all("SELECT game_name FROM games", [], function (gErr, gameRows) {
      let allGames = ['GB', 'DN', 'FB', 'DS', 'ND', 'PATNA'];
      if (!gErr && gameRows && gameRows.length > 0) {
        allGames = gameRows.map(function (g) { return String(g.game_name || '').toUpperCase().trim(); });
      }

      // 2. Fetch ALL Parties to build 3rd Party LC & Hissa relationships
      db.all('SELECT * FROM parties', [], function (err, allPartiesRows) {
        if (err) return res.status(500).json({ success: false, error: err.message });

        const allParties = allPartiesRows || [];
        const partyMaster = allParties.find(function(p) {
          return p.party_name && p.party_name.toLowerCase().trim() === currentAgentNorm;
        });

        const masterLcPerc = partyMaster ? Number(partyMaster.lc_perc || partyMaster.lc_patti || partyMaster.lc || 5) : 5;
        const defaultDComm = partyMaster ? (partyMaster.d_comm !== null && partyMaster.d_comm !== undefined ? Number(partyMaster.d_comm) : masterLcPerc) : masterLcPerc;
        const defaultDAmt = partyMaster ? (Number(partyMaster.d_amt) || 90) : 90;
        const defaultAComm = partyMaster ? (partyMaster.a_comm !== null && partyMaster.a_comm !== undefined ? Number(partyMaster.a_comm) : masterLcPerc) : masterLcPerc;
        const defaultAAmt = partyMaster ? (Number(partyMaster.a_amt) || 9) : 9;
        const defaultPatti = partyMaster ? (Number(partyMaster.patti_perc) || 0) : 0;

        // 3. Fetch Game Results
        const resultQuery = 'SELECT game_name, winning_number, result_date FROM results';
        db.all(resultQuery, [], function (resErr, resultsList) {
          if (resErr) return res.status(500).json({ success: false, error: resErr.message });

          const safeResults = resultsList || [];
          const declaredResults = {};
          safeResults.forEach(function (r) {
            if (r.game_name && String(r.result_date).trim() === queryDate) {
              declaredResults[r.game_name.toUpperCase().trim()] = String(r.winning_number || '').trim();
            }
          });

          // 4. Fetch Sales Data
          const salesQuery = 'SELECT s.sale_id, s.party_name, s.game_name, s.sale_date, ' +
            'COALESCE(s.d_comm, p.d_comm) AS d_comm, ' +
            'COALESCE(s.d_amt, p.d_amt) AS d_amt, ' +
            'COALESCE(s.a_comm, p.a_comm) AS a_comm, ' +
            'COALESCE(s.a_amt, p.a_amt) AS a_amt, ' +
            'COALESCE(s.patti_perc, p.patti_perc) AS patti_perc, ' +
            'si.number_val, si.amount, si.bet_type ' +
            'FROM sales s ' +
            'JOIN sale_items si ON s.sale_id = si.sale_id ' +
            'LEFT JOIN parties p ON LOWER(TRIM(s.party_name)) = LOWER(TRIM(p.party_name)) ' +
            'WHERE LOWER(TRIM(s.party_name)) = LOWER(TRIM(?))';

          db.all(salesQuery, [agentName], function (salesErr, allSalesData) {
            if (salesErr) return res.status(500).json({ success: false, error: salesErr.message });

            const safeSales = allSalesData || [];
            const salesData = safeSales.filter(function (s) {
              return String(s.sale_date).trim() === queryDate;
            });

            const summaryRows = [];
            let grandDSale = 0, grandASale = 0, grandTotalSale = 0;
            let grandComm = 0, grandActualSale = 0, grandWinAmt = 0;
            let grandBalance = 0, grandHissa = 0, grandWinJoda = 0, grandWinAkhar = 0;

            allGames.forEach(function (g) {
              let dSale = 0, aSale = 0;
              let effectiveDComm = defaultDComm, effectiveDAmt = defaultDAmt;
              let effectiveAComm = defaultAComm, effectiveAAmt = defaultAAmt;
              let effectivePatti = defaultPatti;

              const resNo = declaredResults[g] || '';
              const gameSales = (salesData || []).filter(function (s) {
                return s.game_name && s.game_name.toUpperCase().trim() === g;
              });

              gameSales.forEach(function (item) {
                const amt = Number(item.amount) || 0;
                const parsed = parseBetItem(item.number_val, item.bet_type);

                if (item.d_comm !== null && item.d_comm !== undefined) effectiveDComm = Number(item.d_comm);
                if (item.d_amt !== null && item.d_amt !== undefined) effectiveDAmt = Number(item.d_amt);
                if (item.a_comm !== null && item.a_comm !== undefined) effectiveAComm = Number(item.a_comm);
                if (item.a_amt !== null && item.a_amt !== undefined) effectiveAAmt = Number(item.a_amt);

                if (item.patti_perc !== null && item.patti_perc !== undefined && Number(item.patti_perc) > 0) {
                  effectivePatti = Number(item.patti_perc);
                } else {
                  effectivePatti = defaultPatti;
                }

                if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') aSale += amt;
                else dSale += amt;
              });

              const winRes = calculateGameWinning(gameSales, resNo);
              const winNoPlayedAmt = winRes.winNoPlayedAmt;
              const winAkharPlayedAmt = winRes.winAkharPlayedAmt;

              const totalSale = dSale + aSale;
              const commVal = Math.trunc((dSale * (effectiveDComm / 100)) + (aSale * (effectiveAComm / 100)));
              const commDisplay = commVal > 0 ? -commVal : commVal;
              const balance = totalSale + commDisplay;

              const rawWinAmount = (winNoPlayedAmt * effectiveDAmt) + (winAkharPlayedAmt * effectiveAAmt);
              const winAmountDisplay = rawWinAmount > 0 ? -rawWinAmount : rawWinAmount;
              const netGameResult = balance + winAmountDisplay;

              let hissaAmt = 0;
              if (!withoutHissa && effectivePatti > 0) {
                hissaAmt = Math.trunc((netGameResult * effectivePatti) / 100);
              }

              const lene = netGameResult > 0 ? netGameResult : 0;
              const dene = netGameResult < 0 ? Math.abs(netGameResult) : 0;

              summaryRows.push({
                game: g,
                rate: effectiveDComm + '/' + effectiveDAmt + '-' + effectiveAComm + '/' + effectiveAAmt + '-0',
                patti_perc: effectivePatti,
                total_sale: totalSale,
                d_sale: dSale,
                a_sale: aSale,
                comm: commDisplay,
                balance: balance,
                win_amount: winAmountDisplay,
                win_no: winNoPlayedAmt,
                win_akhar: winAkharPlayedAmt,
                hissa: hissaAmt,
                lene: lene,
                dene: dene,
                res: resNo
              });

              grandDSale += dSale; grandASale += aSale; grandTotalSale += totalSale;
              grandComm += commDisplay; grandWinJoda += winNoPlayedAmt; grandWinAkhar += winAkharPlayedAmt;
              grandWinAmt += winAmountDisplay; grandHissa += hissaAmt;
            });

            grandActualSale = grandTotalSale + grandComm;
            grandBalance = grandActualSale + grandWinAmt;

            const effectiveHissa = withoutHissa ? 0 : grandHissa;
            const grandNetBalanceToday = grandBalance - effectiveHissa;

            // 5. Fetch Ledger Entries
            const ledgerQuery = 'SELECT party_name, entry_date, debit_amt, credit_amt, description, narration FROM ledger_entries';
            db.all(ledgerQuery, [], function (lErr, ledgerRows) {
              const safeLedger = lErr ? [] : (ledgerRows || []);

              // 6. Fetch Posted LC Entries
              const allLcQuery = 'SELECT party_name, from_date, to_date, lc_amount FROM posted_lc_entries';
              db.all(allLcQuery, [], function (allLcErr, safePostedLcRows) {
                const safePostedLc = allLcErr ? [] : (safePostedLcRows || []);

                // Calculate Opening Balance
                let openingBal = calculatePartyOpening(partyMaster, safeSales, safeResults, safeLedger, allParties, isoQueryDate, safePostedLc);

                // Today Payment
                let todayPay = 0;
                safeLedger.forEach(function (l) {
                  if (l.party_name && l.party_name.toLowerCase().trim() === currentAgentNorm) {
                    if (toIsoDate(l.entry_date) === isoQueryDate) {
                      todayPay += ((Number(l.debit_amt) || 0) - (Number(l.credit_amt) || 0));
                    }
                  }
                });

                // 🔥 EXACT F12 & F9 LC MATCH: Calculate Both Direct & 3rd Party Posted LCs
                let todayPostedLcEffect = 0;

                // A. Direct LC Posted in F9 for this agent
                safePostedLc.forEach(function (plc) {
                  if (plc.party_name && plc.party_name.toLowerCase().trim() === currentAgentNorm) {
                    const plcFrom = toIsoDate(plc.from_date);
                    const plcTo = toIsoDate(plc.to_date);
                    if (plcFrom === isoQueryDate || plcTo === isoQueryDate) {
                      todayPostedLcEffect += -Number(plc.lc_amount) || 0;
                    }
                  }
                });

                // B. 3rd Party Override LC (Rahul ke F7 me Sanjay ki ₹4045 LC add karne ke liye)
                allParties.forEach(function (srcParty) {
                  const ovParty = String(srcParty.override_lc_party || srcParty.hissa_party || '').toLowerCase().trim();
                  if (ovParty === currentAgentNorm) {
                    const srcPName = String(srcParty.party_name || '').toLowerCase().trim();
                    safePostedLc.forEach(function (plc) {
                      if (plc.party_name && plc.party_name.toLowerCase().trim() === srcPName) {
                        const plcFrom = toIsoDate(plc.from_date);
                        const plcTo = toIsoDate(plc.to_date);
                        if (plcFrom === isoQueryDate || plcTo === isoQueryDate) {
                          todayPostedLcEffect += -Number(plc.lc_amount) || 0;
                        }
                      }
                    });
                  }
                });

                const absoluteLcDisplay = Math.abs(todayPostedLcEffect || 0);

                // Final Net Balance Calculation
                const finalNetBalance = openingBal + grandNetBalanceToday + todayPay + todayPostedLcEffect;

                return res.json({
                  success: true,
                  date: queryDate,
                  agent: agentName,
                  rows: summaryRows,
                  totals: {
                    d_sale: grandDSale,
                    a_sale: grandASale,
                    total_sale: grandTotalSale,
                    comm: grandComm,
                    actual_sale: grandActualSale,
                    winamt: grandWinAmt,
                    balance: grandBalance,
                    hissa: grandHissa,
                    net_balance_today: grandNetBalanceToday,
                    winjoda: grandWinJoda,
                    winakhar: grandWinAkhar,
                    opening: openingBal,
                    pandl: grandNetBalanceToday,
                    today_payment: todayPay,
                    today_posted_lc: absoluteLcDisplay,
                    final_net_balance: finalNetBalance
                  }
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getSummary: getSummary };