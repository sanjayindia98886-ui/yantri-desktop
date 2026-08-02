import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';

export default function ProfitLossF12() {
  const getTodayDateStr = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const [partyTypeFilter, setPartyTypeFilter] = useState('All');
  const [fromDate, setFromDate] = useState(function() {
    return localStorage.getItem('f12_from_date') || getTodayDateStr();
  });
  const [toDate, setToDate] = useState(function() {
    return localStorage.getItem('f12_to_date') || getTodayDateStr();
  });
  const [thirdPartyFilter, setThirdPartyFilter] = useState('All');
  const [filterText, setFilterText] = useState('');

  const [rows, setRows] = useState([]);
  const [thirdPartyOptions, setThirdPartyOptions] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const [pnlSummary, setPnlSummary] = useState({
    sale: 0, comm: 0, win: 0, patti: 0, tpPatti: 0, tpComm: 0,
    adjustment: 0, lc: 0, netPL: 0, opening: 0, payment: 0, netBalance: 0
  });

  // Helper to restore focus back to Filter Input
  const restoreFocus = function() {
    window.focus();
    setTimeout(function() {
      document.getElementById('f12FilterInput')?.focus();
    }, 50);
  };

  const handleFromDateChange = function(e) {
    const val = e.target.value;
    setFromDate(val);
    localStorage.setItem('f12_from_date', val);
  };

  const handleToDateChange = function(e) {
    const val = e.target.value;
    setToDate(val);
    localStorage.setItem('f12_to_date', val);
  };

  const fetchProfitLoss = function() {
    // ✅ Exact URL matching backend route
    const url = 'https://yantri-desktop.onrender.com/api/profit-loss?fromDate=' + encodeURIComponent(fromDate) +
                '&toDate=' + encodeURIComponent(toDate) +
                '&partyType=' + encodeURIComponent(partyTypeFilter) +
                '&thirdParty=' + encodeURIComponent(thirdPartyFilter);

    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setRows(data.rows || []);
          if (Array.isArray(data.thirdParties)) {
            setThirdPartyOptions(data.thirdParties);
          }
        } else {
          alert('Error: ' + (data.error || 'Failed to fetch Profit & Loss data'));
        }
        restoreFocus();
      })
      .catch(function(err) {
        console.error('Fetch Profit & Loss Error:', err);
        alert('Server Connection Error!');
        restoreFocus();
      });
  };

  useEffect(function() {
    fetchProfitLoss();
  }, [fromDate, toDate, partyTypeFilter, thirdPartyFilter]);

  const filteredRows = rows.filter(function(r) {
    if (!filterText) return true;
    const txt = filterText.toLowerCase().trim();
    const pName = (r.party_name || r.PName || '').toLowerCase();
    const city = (r.city || '').toLowerCase();
    return pName.indexOf(txt) !== -1 || city.indexOf(txt) !== -1;
  });

  const selectedParty = filteredRows[selectedIdx] || filteredRows[0] || null;

  useEffect(function() {
    let saleSum = 0, commSum = 0, winSum = 0, pattiSum = 0;
    let tpPattiSum = 0, tpCommSum = 0, adjSum = 0, lcSum = 0;
    let netPLSum = 0, opSum = 0, paySum = 0, netBalSum = 0;

    filteredRows.forEach(function(r) {
      saleSum += Number(r.sale) || 0;
      commSum += Number(r.comm) || 0;
      winSum += Number(r.win) || 0;
      pattiSum += Number(r.patti) || 0;
      tpPattiSum += Number(r.tpPatti) || 0;
      tpCommSum += Number(r.tpComm) || 0;
      adjSum += Number(r.adjustment) || 0;
      lcSum += Number(r.lc) || 0;
      netPLSum += Number(r.netPL) || 0;
      opSum += Number(r.opening) || 0;
      paySum += Number(r.payment) || 0;
      netBalSum += Number(r.netBalance) || 0;
    });

    setPnlSummary({
      sale: saleSum,
      comm: commSum,
      win: winSum,
      patti: pattiSum,
      tpPatti: tpPattiSum,
      tpComm: tpCommSum,
      adjustment: adjSum,
      lc: lcSum,
      netPL: netPLSum,
      opening: opSum,
      payment: paySum,
      netBalance: netBalSum
    });
  }, [filteredRows]);

  // 2. Post TP Commission Function
  const handlePostTPComm = function() {
    if (!selectedParty) {
      alert('Please select a party first!');
      restoreFocus();
      return;
    }
    const currentTpComm = Number(selectedParty.tpComm || 0);
    if (Math.abs(currentTpComm) === 0) {
      alert('No TP Commission available to post for ' + (selectedParty.party_name || 'selected party'));
      restoreFocus();
      return;
    }

    if (!window.confirm('Are you sure you want to Post TP Commission (' + currentTpComm + ') for ' + selectedParty.party_name + '?')) {
      restoreFocus();
      return;
    }

    // ✅ FIXED ROUTE: Corrected from /api/reports/profit-loss/... to /api/profit-loss/post-tp-comm
    fetch('https://yantri-desktop.onrender.com/api/profit-loss/post-tp-comm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyName: selectedParty.party_name,
        toDate: toDate,
        tpCommAmount: currentTpComm
      })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert(data.message || 'TP Commission Posted Successfully!');
          fetchProfitLoss();
        } else {
          alert('Error: ' + (data.error || 'Failed to post TP Commission'));
          restoreFocus();
        }
      })
      .catch(function(err) {
        console.error('Post TP Comm Error:', err);
        alert('Server Connection Error!');
        restoreFocus();
      });
  };

  // 3. Delete / Unpost TP Commission Function
  const handleDeleteTPComm = function() {
    if (!selectedParty) {
      alert('Please select a party first!');
      restoreFocus();
      return;
    }

    if (!selectedParty.isTpPosted) {
      alert('Selected party TP Commission is not posted yet!');
      restoreFocus();
      return;
    }

    if (!window.confirm('Are you sure you want to Delete/Unpost TP Commission entry for ' + selectedParty.party_name + '?')) {
      restoreFocus();
      return;
    }

    // ✅ FIXED ROUTE: Corrected from /api/reports/profit-loss/... to /api/profit-loss/delete-tp-comm
    fetch('https://yantri-desktop.onrender.com/api/profit-loss/delete-tp-comm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyName: selectedParty.party_name,
        toDate: toDate
      })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert(data.message || 'Posted TP Commission Deleted Successfully!');
          fetchProfitLoss();
        } else {
          alert('Error: ' + (data.error || 'Failed to delete TP Commission entry'));
          restoreFocus();
        }
      })
      .catch(function(err) {
        console.error('Delete TP Comm Error:', err);
        alert('Server Connection Error!');
        restoreFocus();
      });
  };

  const handleDownloadPDF = function() {
    const element = document.getElementById('pnl-report-print-area');
    if (!element) return;

    const opt = {
      margin: 5,
      filename: 'Profit_Loss_Report_' + fromDate.replace(/\//g, '-') + 'to' + toDate.replace(/\//g, '-') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
    restoreFocus();
  };

  return (
    <div style={{ padding: '8px', background: '#dcdcdc', minHeight: '92vh', fontSize: '11px', display: 'flex', flexDirection: 'column', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Top Filter Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#ece9d8', padding: '6px 10px', border: '1px solid #7a96df', marginBottom: '8px', flexWrap: 'wrap', fontWeight: 'bold' }}>
        
        <div style={{ display: 'flex', gap: '8px', background: '#fff', border: '1px solid #7f9db9', padding: '2px 6px' }}>
          <label style={{ cursor: 'pointer' }}>
            <input type="radio" name="ptf" checked={partyTypeFilter === 'All'} onChange={function() { setPartyTypeFilter('All'); }} /> All
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input type="radio" name="ptf" checked={partyTypeFilter === 'Customer'} onChange={function() { setPartyTypeFilter('Customer'); }} /> Customer
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input type="radio" name="ptf" checked={partyTypeFilter === 'Uttar'} onChange={function() { setPartyTypeFilter('Uttar'); }} /> Uttar
          </label>
        </div>

        <span>From: 
          <input type="text" value={fromDate} onChange={handleFromDateChange} style={{ width: '75px', padding: '1px 3px', border: '1px solid #7f9db9', fontWeight: 'bold', textAlign: 'center' }} />
        </span>
        
        <span>To: 
          <input type="text" value={toDate} onChange={handleToDateChange} style={{ width: '75px', padding: '1px 3px', border: '1px solid #7f9db9', fontWeight: 'bold', textAlign: 'center' }} />
        </span>

        <span>3rd Party Filter: 
          <select value={thirdPartyFilter} onChange={function(e) { setThirdPartyFilter(e.target.value); }} style={{ padding: '1px', border: '1px solid #7f9db9', fontWeight: 'bold' }}>
            <option value="All">All</option>
            {thirdPartyOptions.map(function(tp) {
              return <option key={tp} value={tp}>{tp}</option>;
            })}
          </select>
        </span>

        <span>Filter: 
          <input 
            id="f12FilterInput"
            type="text" 
            value={filterText} 
            onChange={function(e) { setFilterText(e.target.value); }} 
            autoFocus
            style={{ width: '100px', padding: '1px 3px', border: '1px solid #7f9db9', fontWeight: 'bold' }} 
            placeholder="Search Party..." 
          />
        </span>

        <button onClick={fetchProfitLoss} style={{ padding: '2px 15px', background: '#ece9d8', border: '1px solid #777', fontWeight: 'bold', cursor: 'pointer' }}>
          Show
        </button>

        {/* Post TP Commission Button */}
        <button onClick={handlePostTPComm} style={{ padding: '2px 12px', background: '#d9534f', color: '#fff', border: '1px solid #c9302c', fontWeight: 'bold', cursor: 'pointer' }}>
          Post TP Comm
        </button>

        {/* Delete / Unpost TP Commission Button */}
        <button onClick={handleDeleteTPComm} style={{ padding: '2px 12px', background: '#6c757d', color: '#fff', border: '1px solid #5a6268', fontWeight: 'bold', cursor: 'pointer' }}>
          Delete TP Comm
        </button>

        <button onClick={handleDownloadPDF} style={{ padding: '2px 15px', background: '#008cba', color: '#fff', border: '1px solid #005f73', fontWeight: 'bold', cursor: 'pointer' }}>
          Download PDF
        </button>
      </div>

      {/* Main Grid View */}
      <div id="pnl-report-print-area" style={{ flex: 1, background: '#fff', border: '1px solid #7a96df', minHeight: '320px', marginBottom: '8px', overflow: 'auto' }}>
        <table border="1" cellPadding="3" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#ece9d8', textAlign: 'center', height: '22px', fontWeight: 'bold' }}>
              <th style={{ width: '35px' }}>SrNo</th>
              <th style={{ textAlign: 'left', paddingLeft: '4px' }}>Party</th>
              <th style={{ textAlign: 'left', paddingLeft: '4px' }}>City</th>
              <th>Sale</th>
              <th>Comm</th>
              <th>Win</th>
              <th>Patti</th>
              <th>TP Patti</th>
              <th>TP Comm</th>
              <th>Adjustment</th>
              <th>LC</th>
              <th>Net P/L</th>
              <th>Opening</th>
              <th>Payment</th>
              <th>Net Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map(function(r, idx) {
                const isSelected = selectedIdx === idx;
                const netPL = Number(r.netPL) || 0;
                const tpComm = Number(r.tpComm) || 0;

                return (
                  <tr
                    key={r.party_name || idx}
                    onClick={function() { setSelectedIdx(idx); }}
                    style={{
                      background: isSelected ? '#0a246a' : (idx % 2 === 0 ? '#ffffff' : '#f4f4f4'),
                      color: isSelected ? '#ffffff' : '#000000',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'left', paddingLeft: '4px' }}>{r.party_name}</td>
                    <td style={{ textAlign: 'left', paddingLeft: '4px' }}>{r.city || '-'}</td>
                    <td>{r.sale}</td>
                    <td>{r.comm}</td>
                    <td>{r.win}</td>
                    <td>{r.patti}</td>
                    <td>{r.tpPatti}</td>
                    <td style={{ color: isSelected ? '#fff' : (tpComm < 0 ? 'red' : 'black') }}>
                      {r.tpComm}
                    </td>
                    <td>{r.adjustment}</td>
                    <td>{r.lc}</td>
                    <td style={{ color: isSelected ? '#fff' : (netPL < 0 ? 'red' : 'green') }}>{r.netPL}</td>
                    <td>{r.opening}</td>
                    <td>{r.payment}</td>
                    <td style={{ color: isSelected ? '#fff' : (r.netBalance < 0 ? 'red' : 'blue') }}>{r.netBalance}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="15" style={{ textAlign: 'center', padding: '30px', color: '#666', background: '#fff', fontWeight: 'bold' }}>
                  Click <strong>Show</strong> button to load Profit & Loss report.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Calculated Totals Bar */}
      <div style={{ background: '#ece9d8', padding: '4px', border: '1px solid #7a96df' }}>
        <table border="1" cellPadding="3" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: '#fff', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#e0e0e0', fontWeight: 'bold' }}>
              <th>Sale</th>
              <th>Comm</th>
              <th>Win</th>
              <th>Patti</th>
              <th>TP Patti</th>
              <th>TP Comm</th>
              <th>Adjustment</th>
              <th>LC</th>
              <th>Net P/L</th>
              <th>Opening</th>
              <th>Payment</th>
              <th>Net Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 'bold' }}>
              <td>{pnlSummary.sale}</td>
              <td>{pnlSummary.comm}</td>
              <td>{pnlSummary.win}</td>
              <td>{pnlSummary.patti}</td>
              <td>{pnlSummary.tpPatti}</td>
              <td>{pnlSummary.tpComm}</td>
              <td>{pnlSummary.adjustment}</td>
              <td>{pnlSummary.lc}</td>
              <td style={{ color: pnlSummary.netPL < 0 ? 'red' : 'green', fontSize: '11px' }}>
                {pnlSummary.netPL}
              </td>
              <td>{pnlSummary.opening}</td>
              <td>{pnlSummary.payment}</td>
              <td style={{ color: pnlSummary.netBalance < 0 ? 'red' : 'blue', fontSize: '11px' }}>
                {pnlSummary.netBalance}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}