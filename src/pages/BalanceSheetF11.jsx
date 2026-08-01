import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';

export default function BalanceSheetF11() {
  const getTodayDateStr = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const [inActive, setInActive] = useState(false);
  const [topFilter, setTopFilter] = useState('All Filter');
  const [ctrlFText, setCtrlFText] = useState('');
  const [withoutHissa, setWithoutHissa] = useState(false);

  // Date States (Auto-set from localStorage or Today)
  const [fromDate, setFromDate] = useState(function() {
    return localStorage.getItem('f11_from_date') || getTodayDateStr();
  });
  const [toDate, setToDate] = useState(function() {
    return localStorage.getItem('f11_to_date') || getTodayDateStr();
  });
  const [pnameSearch, setPnameSearch] = useState('');
  const [rightFilter, setRightFilter] = useState('ALL');

  const [rows, setRows] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [partyDetails, setPartyDetails] = useState(null);

  const [totals, setTotals] = useState({
    grandOpening: 0,
    grandPnL: 0,
    grandTpPatti: 0,
    grandTpComm: 0,
    grandPayment: 0,
    grandNetBalance: 0,
    leneTotal: 0,
    deneTotal: 0,
    rightNetBalance: 0
  });

  const handleFromDateChange = function(e) {
    const val = e.target.value;
    setFromDate(val);
    localStorage.setItem('f11_from_date', val);
  };

  const handleToDateChange = function(e) {
    const val = e.target.value;
    setToDate(val);
    localStorage.setItem('f11_to_date', val);
  };

  const fetchBalanceSheet = function() {
    const url = 'http://localhost:5000/api/reports/balance-sheet?fromDate=' + encodeURIComponent(fromDate) +
                '&toDate=' + encodeURIComponent(toDate) +
                '&withoutHissa=' + withoutHissa;

    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setRows(data.data || []);
        }
      })
      .catch(function(err) {
        console.error('Error fetching balance sheet:', err);
      });
  };

  useEffect(function() {
    fetchBalanceSheet();
  }, [fromDate, toDate, withoutHissa]);

  const filteredRows = rows.filter(function(r) {
    const status = (r.status || 'Active').toLowerCase();
    if (!inActive && status === 'inactive') return false;

    const searchVal = (ctrlFText || pnameSearch).toLowerCase().trim();
    const pName = (r.party_name || r.PName || '').toLowerCase();
    const city = (r.city || r.City || '').toLowerCase();
    if (searchVal && pName.indexOf(searchVal) === -1 && city.indexOf(searchVal) === -1) return false;

    const op = Number(r.opening || 0);
    const todays = Number(r.todays || 0);
    const tpPatti = Number(r.tp_patti || r.tpPatti || 0);
    const tpComm = Number(r.tp_comm || r.tpComm || 0);
    const pay = Number(r.payment || 0);
    const net = Number(r.net_balance || (op + todays + tpPatti + tpComm - pay));
    const has3rdParty = r.hissa_party && String(r.hissa_party).trim() !== '' && String(r.hissa_party).trim() !== '0';

    if (topFilter === 'Balance' && net === 0) return false;
    if (topFilter === 'Settling Report' && pay === 0 && net === 0) return false;
    if (topFilter === 'Today P&L' && (todays === 0 && tpPatti === 0 && tpComm === 0)) return false;
    if (topFilter === '3rd Party' && !has3rdParty && tpPatti === 0 && tpComm === 0) return false;

    if (rightFilter === 'SALE' && todays === 0) return false;
    if (rightFilter === 'PAYMENT' && pay === 0) return false;
    if (rightFilter === 'ALL 2' && net === 0) return false;

    return true;
  });

  useEffect(function() {
    if (filteredRows.length > 0) {
      const idx = Math.min(selectedIndex, filteredRows.length - 1);
      setPartyDetails(filteredRows[idx] || null);
    } else {
      setPartyDetails(null);
    }
  }, [selectedIndex, filteredRows]);

  useEffect(function() {
    function handleKeyDown(e) {
      if (filteredRows.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(function(prev) { return Math.min(prev + 1, filteredRows.length - 1); });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(function(prev) { return Math.max(prev - 1, 0); });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('ctrl-f-input-f11');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return function() { window.removeEventListener('keydown', handleKeyDown); };
  }, [filteredRows]);

  useEffect(function() {
    let opSum = 0;
    let pnlSum = 0;
    let tpPattiSum = 0;
    let tpCommSum = 0;
    let paySum = 0;
    let netSum = 0;
    let lene = 0;
    let dene = 0;

    filteredRows.forEach(function(r) {
      const op = Number(r.opening) || 0;
      const pnl = Number(r.todays) || 0;
      const tpPatti = Number(r.tp_patti || r.tpPatti) || 0;
      const tpComm = Number(r.tp_comm || r.tpComm) || 0;
      const pay = Number(r.payment) || 0;
      const net = Number(r.net_balance) || (op + pnl + tpPatti + tpComm - pay);

      opSum += op;
      pnlSum += pnl;
      tpPattiSum += tpPatti;
      tpCommSum += tpComm;
      paySum += pay;
      netSum += net;

      if (net > 0) lene += net;
      else if (net < 0) dene += Math.abs(net);
    });

    setTotals({
      grandOpening: opSum,
      grandPnL: pnlSum,
      grandTpPatti: tpPattiSum,
      grandTpComm: tpCommSum,
      grandPayment: paySum,
      grandNetBalance: netSum,
      leneTotal: lene,
      deneTotal: dene,
      rightNetBalance: lene - dene
    });
  }, [filteredRows]);

  const handleDownloadPDF = function() {
    const element = document.getElementById('party-statement-print-area');
    if (!element) {
      alert('Please select a party to download PDF!');
      return;
    }

    const partyName = partyDetails ? (partyDetails.party_name || partyDetails.PName || 'Party') : 'Party';
    const opt = {
      margin: 5,
      filename: partyName + 'Statement' + fromDate.replace(/\//g, '-') + 'to' + toDate.replace(/\//g, '-') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div style={{ padding: '8px', background: '#dcdcdc', minHeight: '93vh', fontSize: '11px', fontFamily: 'Tahoma, Arial, sans-serif', boxSizing: 'border-box' }}>
      
      {/* 1. TOP FILTER BAR */}
      <div style={{ background: '#ece9d8', border: '1px solid #7a96df', padding: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 'bold' }}>
            <input type="checkbox" checked={inActive} onChange={function(e) { setInActive(e.target.checked); }} />
            <span>In-Active</span>
          </label>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #7f9db9', padding: '2px 6px', background: '#fff' }}>
            {['Balance', 'Settling Report', 'Today P&L', '3rd Party', 'All Filter'].map(function(item) {
              return (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="topFilter"
                    value={item}
                    checked={topFilter === item}
                    onChange={function(e) { setTopFilter(e.target.value); }}
                  />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>

          <div>
            <input
              id="ctrl-f-input-f11"
              type="text"
              placeholder="Ctrl+F Search..."
              value={ctrlFText}
              onChange={function(e) { setCtrlFText(e.target.value); setSelectedIndex(0); }}
              style={{ width: '100px', padding: '1px 4px', border: '1px solid #7f9db9', background: '#ffffd0', fontWeight: 'bold' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={withoutHissa}
              onChange={function(e) { setWithoutHissa(e.target.checked); }}
            />
            <span>Without Hissa</span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>From:</span>
          <input
            type="text"
            value={fromDate}
            onChange={handleFromDateChange}
            style={{ width: '75px', padding: '1px 3px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
          />

          <span>To:</span>
          <input
            type="text"
            value={toDate}
            onChange={handleToDateChange}
            style={{ width: '75px', padding: '1px 3px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
          />

          <span>Pname:</span>
          <input
            type="text"
            value={pnameSearch}
            onChange={function(e) { setPnameSearch(e.target.value); setSelectedIndex(0); }}
            style={{ width: '90px', padding: '1px 3px', border: '1px solid #7f9db9' }}
          />

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', border: '1px solid #7f9db9', padding: '2px 6px', background: '#fff' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10px' }}>Filter:</span>
            {['ALL', 'SALE', 'PAYMENT', 'ALL 2'].map(function(opt) {
              return (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="rightFilter"
                    value={opt}
                    checked={rightFilter === opt}
                    onChange={function(e) { setRightFilter(e.target.value); }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

      </div>

      {/* 2. MAIN TABLE AREA */}
      <div style={{ display: 'flex', gap: '8px', height: '410px' }}>
        
        {/* LEFT GRID */}
        <div style={{ flex: '1.2', border: '1px solid #7a96df', background: '#fff', overflowY: 'auto' }}>
          <table border="1" cellPadding="2" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Tahoma, sans-serif' }}>
            <thead>
              <tr style={{ background: '#ece9d8', height: '22px', textAlign: 'center' }}>
                <th style={{ width: '35px' }}>SrNo</th>
                <th style={{ textAlign: 'left', paddingLeft: '4px' }}>PName</th>
                <th style={{ width: '45px' }}>City</th>
                <th style={{ textAlign: 'right', paddingRight: '4px' }}>Opening</th>
                <th style={{ textAlign: 'right', paddingRight: '4px' }}>Todays</th>
                <th style={{ textAlign: 'right', paddingRight: '4px', color: '#0000aa' }}>TP_Patti</th>
                <th style={{ textAlign: 'right', paddingRight: '4px', color: '#006600' }}>TP_Comm</th>
                <th style={{ textAlign: 'right', paddingRight: '4px' }}>Payment</th>
                <th style={{ textAlign: 'right', paddingRight: '4px' }}>Net_Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map(function(r, idx) {
                  const pname = r.party_name || r.PName || '';
                  const city = r.city || r.City || '';
                  const op = Number(r.opening || 0);
                  const todays = Number(r.todays || 0);
                  const tpPatti = Number(r.tp_patti || r.tpPatti || 0);
                  const tpComm = Number(r.tp_comm || r.tpComm || 0);
                  const pay = Number(r.payment || 0);
                  const net = Number(r.net_balance || (op + todays + tpPatti + tpComm - pay));

                  const isSelected = selectedIndex === idx;

                  return (
                    <tr
                      key={r.pno || idx}
                      onClick={function() { setSelectedIndex(idx); }}
                      style={{
                        background: isSelected ? '#0a246a' : (idx % 2 === 0 ? '#ffffff' : '#f4f4f4'),
                        color: isSelected ? '#ffffff' : '#000000',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'left', paddingLeft: '4px' }}>{pname}</td>
                      <td style={{ textAlign: 'center' }}>{city}</td>
                      <td style={{ textAlign: 'right', paddingRight: '4px' }}>{op}</td>
                      <td style={{ textAlign: 'right', paddingRight: '4px', color: isSelected ? '#fff' : (todays < 0 ? 'red' : 'black') }}>{todays}</td>
                      <td style={{ textAlign: 'right', paddingRight: '4px', color: isSelected ? '#fff' : (tpPatti < 0 ? 'red' : 'blue') }}>{tpPatti}</td>
                      <td style={{ textAlign: 'right', paddingRight: '4px', color: isSelected ? '#fff' : (tpComm < 0 ? 'red' : 'green') }}>{tpComm}</td>
                      <td style={{ textAlign: 'right', paddingRight: '4px' }}>{pay}</td>
                      <td style={{ textAlign: 'right', paddingRight: '4px', color: isSelected ? '#fff' : (net < 0 ? 'red' : 'blue') }}>{net}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                    No Balance Sheet records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* RIGHT BLUE DETAILS CONTAINER */}
        <div style={{ flex: '0.8', border: '1px solid #7a96df', background: '#5478a0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '6px' }}>
          
          <div style={{ color: '#fff' }} id="party-statement-print-area">
            {partyDetails ? (
              <div style={{ background: '#5478a0', padding: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #a0c0e0', paddingBottom: '4px', marginBottom: '6px', color: '#fff' }}>
                  Party Statement: {partyDetails.party_name || partyDetails.PName} ({partyDetails.city || 'No City'}) [{fromDate} to {toDate}]
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#3b5998', color: '#fff', padding: '4px', borderRadius: '3px', marginBottom: '8px', fontSize: '9px', flexWrap: 'wrap', gap: '2px' }}>
                  <span>Opening: <strong>{partyDetails.opening}</strong></span>
                  <span>Todays: <strong>{partyDetails.todays}</strong></span>
                  <span>TP Patti: <strong>{partyDetails.tp_patti || partyDetails.tpPatti || 0}</strong></span>
                  <span>TP Comm: <strong>{partyDetails.tp_comm || partyDetails.tpComm || 0}</strong></span>
                  <span>Payment: <strong>{partyDetails.payment}</strong></span>
                  <span>Net Bal: <strong>{partyDetails.net_balance}</strong></span>
                </div>

                {/* DYNAMIC GAME BREAKDOWN TABLE */}
                <table border="1" cellPadding="3" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', color: '#000', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ background: '#ece9d8', textAlign: 'center' }}>
                      <th>Game</th>
                      <th>Sale</th>
                      <th>Win Amt</th>
                      <th>Comm</th>
                      <th>Net Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partyDetails.games ? Object.keys(partyDetails.games).map(function(game) {
                      const gData = partyDetails.games[game];
                      const sale = gData ? gData.sale : 0;
                      const win = gData ? gData.win : 0;
                      const comm = gData ? gData.comm : 0;
                      const net = gData ? gData.net : 0;

                      return (
                        <tr key={game} style={{ textAlign: 'center' }}>
                          <td style={{ fontWeight: 'bold' }}>{game}</td>
                          <td>{sale}</td>
                          <td>{win}</td>
                          <td>{comm}</td>
                          <td style={{ fontWeight: 'bold', color: net < 0 ? 'red' : 'blue' }}>{net}</td>
                        </tr>
                      );
                    }) : null}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '12px', fontWeight: 'bold', padding: '10px' }}>
                Select a party row to view details
              </div>
            )}
          </div>

          {/* RIGHT BOTTOM SUMMARY TABLE (LENE / DENE) */}
          <div style={{ background: '#ece9d8', border: '1px solid #7a96df', padding: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}>Total</div>
            
            <table border="1" cellPadding="2" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: '10px', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#e0e0e0' }}>
                  <th>LENE</th>
                  <th>DENE</th>
                  <th>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ fontWeight: 'bold' }}>
                  <td style={{ color: 'blue' }}>{totals.leneTotal}</td>
                  <td style={{ color: 'red' }}>{totals.deneTotal}</td>
                  <td>{totals.rightNetBalance}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '6px' }}>
              <button
                onClick={handleDownloadPDF}
                style={{ padding: '2px 14px', background: '#008cba', color: '#fff', border: '1px solid #005f73', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}
              >
                Download PDF
              </button>
              <button
                onClick={function() { window.print(); }}
                style={{ padding: '2px 14px', background: '#ece9d8', border: '1px solid #777', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}
              >
                Print
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 3. FOOTER TOTALS */}
      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        <div style={{ width: '65%', background: '#ece9d8', border: '1px solid #7a96df', padding: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}>Total</div>
          
          <table border="1" cellPadding="2" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: '10px', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#e0e0e0' }}>
                <th>Opening</th>
                <th>P & L</th>
                <th>TP Patti</th>
                <th>TP Comm</th>
                <th>Payment</th>
                <th>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: 'bold' }}>
                <td>{totals.grandOpening}</td>
                <td style={{ color: totals.grandPnL < 0 ? 'red' : 'green' }}>{totals.grandPnL}</td>
                <td style={{ color: totals.grandTpPatti < 0 ? 'red' : 'blue' }}>{totals.grandTpPatti}</td>
                <td style={{ color: totals.grandTpComm < 0 ? 'red' : 'green' }}>{totals.grandTpComm}</td>
                <td>{totals.grandPayment}</td>
                <td style={{ color: totals.grandNetBalance < 0 ? 'red' : 'blue' }}>{totals.grandNetBalance}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <button
            onClick={function() { window.print(); }}
            style={{ padding: '4px 20px', background: '#ece9d8', border: '1px solid #777', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}
          >
            Print
          </button>
          
          <button
            onClick={fetchBalanceSheet}
            style={{ padding: '4px 20px', background: '#ece9d8', border: '1px solid #777', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', color: '#0000aa' }}
          >
            Report
          </button>
        </div>

        <div style={{ width: '20%' }}></div>
      </div>

    </div>
  );
}