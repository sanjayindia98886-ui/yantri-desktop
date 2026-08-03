const db = require('../config/database');

// Normalize Number Keys for 10x10 Grid (1 to 100, B0-B9, A0-A9)
const normalizeNumberKey = (rawKey) => {
  if (!rawKey && rawKey !== 0) return '';
  let str = String(rawKey).trim().toUpperCase().replace(/[\s\-_]+/g, '');

  if (str === '0' || str === '00' || str === '100') {
    return '100';
  }

  // Bahar Haruf Check (B1..B0, 111..000)
  for (let i = 0; i <= 9; i++) {
    const d = String(i);
    const bKey = 'B' + d;
    const triple = d + d + d;

    if (
      str === bKey ||
      str === (d + 'B') ||
      str === triple ||
      str === (d + 'BAHAR') ||
      str === ('BAHAR' + d)
    ) {
      return bKey;
    }
  }

  // Ander Haruf Check (A1..A0, 1111..0000)
  for (let i = 0; i <= 9; i++) {
    const d = String(i);
    const aKey = 'A' + d;
    const quad = d + d + d + d;

    if (
      str === aKey ||
      str === (d + 'A') ||
      str === quad ||
      str === (d + 'ANDER') ||
      str === ('ANDER' + d)
    ) {
      return aKey;
    }
  }

  let num = Number(str);
  if (!isNaN(num) && num >= 1 && num <= 100) {
    return String(num);
  }

  return str;
};

const getYantriGridData = (req, res) => {
  try {
    const queryDate = String(req.query.date || '').trim();
    const queryGame = String(req.query.game || '').trim().toUpperCase();
    const partyName = String(req.query.party || '').trim();
    const yantriType = String(req.query.type || 'Actual Yantri').trim();
    
    // User Permissions & Filtering Parameters
    const userId = String(req.query.userId || '').trim();
    const userRole = String(req.query.userRole || '').trim().toLowerCase();
    const filterUserId = String(req.query.filterUserId || '').trim();

    if (!queryDate || !queryGame) {
      return res.json({ success: true, gridData: {}, grandTotal: 0 });
    }

    let salesQuery = 'SELECT s.sale_id, s.party_name, s.sale_date, s.uid, ' +
      'COALESCE(s.d_comm, p.d_comm, 10) AS d_comm, ' +
      'COALESCE(s.a_comm, p.a_comm, 10) AS a_comm, ' +
      'COALESCE(s.patti_perc, p.patti_perc, 0) AS patti_perc, ' +
      'COALESCE(p.hissa_patti_perc, 0) AS hissa_patti_perc, ' +
      'si.number_val, si.amount ' +
      'FROM sales s ' +
      'JOIN sale_items si ON s.sale_id = si.sale_id ' +
      'LEFT JOIN parties p ON LOWER(TRIM(s.party_name)) = LOWER(TRIM(p.party_name)) ' +
      'WHERE LOWER(TRIM(s.sale_date)) = LOWER(TRIM($1)) ' +
      'AND UPPER(TRIM(s.game_name)) = UPPER(TRIM($2))';

    const queryParams = [queryDate, queryGame];
    let paramIndex = 3;

    const upperParty = partyName.toUpperCase();
    if (
      partyName !== '' &&
      !upperParty.includes('ALL PARTIES') &&
      !upperParty.includes('-- ALL PARTIES --')
    ) {
      salesQuery += ' AND LOWER(TRIM(s.party_name)) = LOWER(TRIM($' + paramIndex + '))';
      queryParams.push(partyName.trim());
      paramIndex++;
    }

    // User Data Isolation
    if (userRole !== 'super_admin') {
      if (userId) {
        salesQuery += ' AND LOWER(TRIM(s.uid)) = LOWER(TRIM($' + paramIndex + '))';
        queryParams.push(userId);
        paramIndex++;
      }
    } else if (filterUserId && filterUserId.toUpperCase() !== 'ALL') {
      salesQuery += ' AND LOWER(TRIM(s.uid)) = LOWER(TRIM($' + paramIndex + '))';
      queryParams.push(filterUserId);
      paramIndex++;
    }

    salesQuery += ';';

    db.all(salesQuery, queryParams, function(err, rows) {
      if (err) {
        console.error('Error fetching yantri grid data:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }

      const safeRows = rows || [];
      const gridMap = {};
      let grandTotal = 0;

      safeRows.forEach(function(row) {
        const rawAmt = Number(row.amount) || 0;
        if (rawAmt <= 0) return;

        let finalAmt = rawAmt;

        const dComm = Number(row.d_comm) || 0;
        const aComm = Number(row.a_comm) || 0;
        const pattiPerc = Number(row.patti_perc) || 0;
        const hissaPerc = Number(row.hissa_patti_perc) || 0;

        const mappedKey = normalizeNumberKey(row.number_val);

        if (yantriType === 'Actual Yantri') {
          let commRate = (mappedKey.startsWith('A') || mappedKey.startsWith('B')) ? aComm : dComm;
          let commAmt = (rawAmt * commRate) / 100;
          let afterComm = rawAmt - commAmt;
          let pattiAmt = (afterComm * pattiPerc) / 100;
          let hissaAmt = (afterComm * hissaPerc) / 100;
          finalAmt = Math.trunc(afterComm - pattiAmt - hissaAmt);
        } else if (yantriType === 'Patti') {
          let pattiAmt = (rawAmt * pattiPerc) / 100;
          finalAmt = Math.trunc(rawAmt - pattiAmt);
        } else if (yantriType === 'Daily Collection' || yantriType === 'Agent') {
          finalAmt = rawAmt;
        }

        // Safety check for NaN
        if (isNaN(finalAmt)) {
          finalAmt = rawAmt;
        }

        if (!gridMap[mappedKey]) {
          gridMap[mappedKey] = 0;
        }
        gridMap[mappedKey] += finalAmt;
        grandTotal += finalAmt;
      });

      return res.json({
        success: true,
        gridData: gridMap,
        grandTotal: grandTotal
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Trace High Amount Client / Party
const traceClientByAmt = (req, res) => {
  try {
    const queryDate = String(req.query.date || '').trim();
    const queryGame = String(req.query.game || '').trim().toUpperCase();
    const targetAmt = Number(req.query.amt) || 0;

    if (!queryDate || !queryGame || targetAmt <= 0) {
      return res.json({ success: false, party_name: '' });
    }

    const traceQuery = 'SELECT s.party_name, SUM(si.amount) as total_amt ' +
      'FROM sales s ' +
      'JOIN sale_items si ON s.sale_id = si.sale_id ' +
      'WHERE LOWER(TRIM(s.sale_date)) = LOWER(TRIM($1)) ' +
      'AND UPPER(TRIM(s.game_name)) = UPPER(TRIM($2)) ' +
      'GROUP BY s.party_name ' +
      'HAVING SUM(si.amount) >= $3 ' +
      'ORDER BY total_amt DESC LIMIT 1;';

    db.all(traceQuery, [queryDate, queryGame, targetAmt], function(err, rows) {
      if (err || !rows || rows.length === 0) {
        return res.json({ success: false, party_name: 'Party Not Found' });
      }
      return res.json({ success: true, party_name: rows[0].party_name });
    });
  } catch (error) {
    return res.status(500).json({ success: false, party_name: '' });
  }
};

module.exports = {
  getYantriGridData: getYantriGridData,
  traceClientByAmt: traceClientByAmt
};