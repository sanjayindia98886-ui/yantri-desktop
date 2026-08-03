const db = require('../config/database');

// Dynamic Date Parsing Helper
function parseDateToNum(dateStr) {
  if (!dateStr) return 0;
  var str = String(dateStr).trim();
  if (str.indexOf('/') !== -1) {
    var parts = str.split('/');
    if (parts.length === 3) {
      return Number(parts[2] + parts[1].padStart(2, '0') + parts[0].padStart(2, '0'));
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

function toIsoDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return dateStr;
  if (dateStr.indexOf('/') !== -1) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    }
  }
  return dateStr;
}

// Bet Parser Engine
function parseBetItem(numStr, betType) {
  let num = String(numStr || '').trim().toUpperCase().replace(/[\s\-_]+/g, '');
  let bet = String(betType || '').trim().toUpperCase();

  if (!num && bet) num = bet;

  for (let i = 0; i <= 9; i++) {
    const d = String(i);
    const aKey = 'A' + d;
    if (
      num === aKey || num === (d + 'A') || num === (d + d + d + d) ||
      num === (d + 'ANDER') || num === ('ANDER' + d) ||
      (bet === 'A' && num === d) || (bet === 'ANDER' && num === d) || (bet === aKey)
    ) {
      return { type: 'ANDER', digit: d, key: aKey };
    }
  }

  for (let i = 0; i <= 9; i++) {
    const d = String(i);
    const bKey = 'B' + d;
    if (
      num === bKey || num === (d + 'B') || num === (d + d + d) ||
      num === (d + 'BAHAR') || num === ('BAHAR' + d) ||
      (bet === 'B' && num === d) || (bet === 'BAHAR' && num === d) || (bet === bKey)
    ) {
      return { type: 'BAHAR', digit: d, key: bKey };
    }
  }

  if (num.startsWith('A') || num.endsWith('A') || bet === 'A' || bet === 'ANDER') {
    const digits = num.replace(/[^0-9]/g, '');
    if (digits.length > 0) return { type: 'ANDER', digit: digits[digits.length - 1], key: 'A' + digits[digits.length - 1] };
  }

  if (num.startsWith('B') || num.endsWith('B') || bet === 'B' || bet === 'BAHAR') {
    const digits = num.replace(/[^0-9]/g, '');
    if (digits.length > 0) return { type: 'BAHAR', digit: digits[0], key: 'B' + digits[0] };
  }

  let cleaned = num.replace(/[^0-9]/g, '');
  if (cleaned === '100' || cleaned === '0') cleaned = '00';
  if (cleaned.length > 0) {
    cleaned = cleaned.padStart(2, '0');
    if (cleaned.length > 2) cleaned = cleaned.slice(-2);
    return { type: 'JODI', jodi: cleaned, key: cleaned };
  }

  return { type: 'UNKNOWN', key: num };
}

// Winning Calculation Engine
function calculateGameWinning(itemsList, resNo) {
  let winNoPlayedAmt = 0;
  let winAkharPlayedAmt = 0;

  if (!resNo) return { winNoPlayedAmt: 0, winAkharPlayedAmt: 0, winAmount: 0 };

  let normRes = String(resNo).trim();
  if (normRes === '100' || normRes === '0') normRes = '00';
  normRes = normRes.padStart(2, '0');
  if (normRes.length > 2) normRes = normRes.slice(-2);

  const resJodi = normRes;
  const resAnder = normRes[0];
  const resBahar = normRes[1];

  (itemsList || []).forEach(function (item) {
    const amt = Number(item.amount) || 0;
    const parsed = parseBetItem(item.number_val, item.bet_type);

    if (parsed.type === 'ANDER') {
      if (parsed.digit === resAnder) winAkharPlayedAmt += amt;
    } else if (parsed.type === 'BAHAR') {
      if (parsed.digit === resBahar) winAkharPlayedAmt += amt;
    } else if (parsed.type === 'JODI') {
      if (parsed.jodi === resJodi) winNoPlayedAmt += amt;
    }
  });

  return { winNoPlayedAmt: winNoPlayedAmt, winAkharPlayedAmt: winAkharPlayedAmt };
}

// FULLY DYNAMIC OPENING CALCULATOR (FIXED FOR 3RD PARTY OVERRIDE LC)
function calculatePartyOpening(party, safeSales, safeResults, safeLedger, partyList, targetIsoDate, safePostedLc) {
  if (!party) return 0;

  const normPName = (party.party_name || '').toLowerCase().trim();
  const targetNum = parseDateToNum(targetIsoDate);

  // 1. Master Opening
  let masterOpening = Number(party.opening_balance ?? party.opening ?? party.opening_bal ?? party.d_amt_opening ?? 0);

  // 2. Dynamic Past Sales Net P&L (Strictly before target date)
  const pastSalesMap = {};
  (safeSales || []).forEach(function (s) {
    if (s.party_name && s.party_name.toLowerCase().trim() === normPName) {
      const sNum = parseDateToNum(s.sale_date);
      if (sNum > 0 && sNum < targetNum) {
        if (!pastSalesMap[s.sale_date]) pastSalesMap[s.sale_date] = [];
        pastSalesMap[s.sale_date].push(s);
      }
    }
  });

  let pastNetPL = 0;

  Object.keys(pastSalesMap).forEach(function (pDate) {
    const daySales = pastSalesMap[pDate];
    let dayDSale = 0, dayASale = 0, dayWinAmt = 0, dayComm = 0;

    daySales.forEach(function (pItem) {
      const pAmt = Number(pItem.amount) || 0;
      
      let itemDComm = (pItem.voucher_d_comm !== null && pItem.voucher_d_comm !== undefined) ? Number(pItem.voucher_d_comm) : ((pItem.d_comm !== null && pItem.d_comm !== undefined) ? Number(pItem.d_comm) : (party.d_comm || 0));
      let itemAComm = (pItem.voucher_a_comm !== null && pItem.voucher_a_comm !== undefined) ? Number(pItem.voucher_a_comm) : ((pItem.a_comm !== null && pItem.a_comm !== undefined) ? Number(pItem.a_comm) : (party.a_comm || 0));
      let pDAmt = (pItem.d_amt !== null && pItem.d_amt !== undefined) ? Number(pItem.d_amt) : (party.d_amt || 90);
      let pAAmt = (pItem.a_amt !== null && pItem.a_amt !== undefined) ? Number(pItem.a_amt) : (party.a_amt || 9);

      const parsed = parseBetItem(pItem.number_val, pItem.bet_type);

      if (parsed.type === 'ANDER' || parsed.type === 'BAHAR') {
        dayASale += pAmt;
        dayComm += Math.trunc((pAmt * itemAComm) / 100);
      } else {
        dayDSale += pAmt;
        dayComm += Math.trunc((pAmt * itemDComm) / 100);
      }

      let declaredWinNo = '';
      (safeResults || []).forEach(function (resItem) {
        if (resItem.game_name && String(resItem.game_name).toUpperCase().trim() === String(pItem.game_name).toUpperCase().trim()) {
          if (String(resItem.result_date).trim() === String(pDate).trim()) {
            declaredWinNo = String(resItem.winning_number || '').trim();
          }
        }
      });

      const winRes = calculateGameWinning([pItem], declaredWinNo);
      dayWinAmt += (winRes.winNoPlayedAmt * pDAmt) + (winRes.winAkharPlayedAmt * pAAmt);
    });

    const dayTotalSale = dayDSale + dayASale;
    const dayBasePL = (dayTotalSale - dayComm) - dayWinAmt;
    
    // Patti Deduction for Past Days
    const pattiPerc = Number(party.patti_perc) || 0;
    const dayPatti = pattiPerc > 0 ? Math.trunc((dayBasePL * pattiPerc) / 100) : 0;

    pastNetPL += (dayBasePL - dayPatti);
  });

  // 3. Dynamic Past Ledger (Debit (+) minus Credit (-))
  let pastLedgerBalance = 0;
  (safeLedger || []).forEach(function (l) {
    if (l.party_name && l.party_name.toLowerCase().trim() === normPName) {
      const lNum = parseDateToNum(l.entry_date);
      if (lNum > 0 && lNum < targetNum) {
        pastLedgerBalance += ((Number(l.debit_amt) || 0) - (Number(l.credit_amt) || 0));
      }
    }
  });

  // 4. FIX FOR RAHUL: Dynamic Past Posted LC Entries (Direct + 3rd Party Override LC)
  let pastPostedLcAmount = 0;
  
  // A. Direct Posted LC
  (safePostedLc || []).forEach(function (plc) {
    if (plc.party_name && plc.party_name.toLowerCase().trim() === normPName) {
      const lcNum = parseDateToNum(plc.to_date || plc.from_date);
      if (lcNum > 0 && lcNum < targetNum) {
        pastPostedLcAmount += Number(plc.lc_amount) || 0;
      }
    }
  });

  // B. 3rd Party Override LC (Sanjay ki Posted LC se Rahul ki opening me judne ke liye)
  (partyList || []).forEach(function (srcParty) {
    const ovParty = String(srcParty.override_lc_party || srcParty.hissa_party || '').toLowerCase().trim();
    if (ovParty === normPName) {
      const srcPName = String(srcParty.party_name || '').toLowerCase().trim();
      (safePostedLc || []).forEach(function (plc) {
        if (plc.party_name && plc.party_name.toLowerCase().trim() === srcPName) {
          const lcNum = parseDateToNum(plc.to_date || plc.from_date);
          if (lcNum > 0 && lcNum < targetNum) {
            pastPostedLcAmount += Number(plc.lc_amount) || 0;
          }
        }
      });
    }
  });

  // Clean Dynamic Balance Return
  return Math.round(masterOpening + pastNetPL + pastLedgerBalance - pastPostedLcAmount);
}

module.exports = {
  toIsoDate: toIsoDate,
  parseBetItem: parseBetItem,
  calculateGameWinning: calculateGameWinning,
  calculatePartyOpening: calculatePartyOpening
};