import React, { useState, useEffect, useRef } from 'react';

export default function SaleLCF9() {
  const getTodayDateStr = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const [fromDate, setFromDate] = useState(function() {
    return localStorage.getItem('f9_from_date') || getTodayDateStr();
  });
  const [toDate, setToDate] = useState(function() {
    return localStorage.getItem('f9_to_date') || getTodayDateStr();
  });

  const [lcType, setLcType] = useState('Customer LC');
  const [filterText, setFilterText] = useState('');

  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const [rows, setRows] = useState([]);
  const tableWrapperRef = useRef(null);

  const handleFromDateChange = function(e) {
    const val = e.target.value;
    setFromDate(val);
    localStorage.setItem('f9_from_date', val);
  };

  const handleToDateChange = function(e) {
    const val = e.target.value;
    setToDate(val);
    localStorage.setItem('f9_to_date', val);
  };

  // Filter Rows
  const filteredRows = rows.filter(function(r) {
    if (!filterText) return true;
    const query = filterText.toLowerCase().trim();
    return String(r.pno || '').includes(query) || String(r.name || '').toLowerCase().includes(query);
  });

  const selectedParty = filteredRows[selectedRowIndex] || filteredRows[0] || null;

  // Dynamic Totals Calculation
  const dynamicTotals = filteredRows.reduce(function(acc, row) {
    acc.amount += Number(row.amount || 0);
    acc.comm += Number(row.comm || 0);
    acc.balance += Number(row.balance || 0);
    acc.dene += Number(row.dene || 0);
    acc.lene += Number(row.lene || 0);
    acc.totalComm += Number(row.commAmount || 0);
    return acc;
  }, { amount: 0, comm: 0, balance: 0, dene: 0, lene: 0, totalComm: 0 });

  const netBalanceStatus = dynamicTotals.lene - dynamicTotals.dene;

  // Keyboard Arrow Navigation
  useEffect(function() {
    function handleKeyDown(e) {
      if (!isLoaded || filteredRows.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedRowIndex(function(prev) {
          return Math.min(prev + 1, filteredRows.length - 1);
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedRowIndex(function(prev) {
          return Math.max(prev - 1, 0);
        });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return function() {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoaded, filteredRows]);

  // Auto Scroll to selected row
  useEffect(function() {
    if (tableWrapperRef.current) {
      const el = tableWrapperRef.current.querySelector('.selected-row');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedRowIndex]);

  // Helper function for restoring focus
  const restoreFocus = function() {
    window.focus();
    setTimeout(function() {
      document.getElementById('f9FilterInput')?.focus();
    }, 50);
  };

  // Fetch LC Data
  const fetchLCData = async function() {
    setLoading(true);
    try {
      const url = 'https://yantri-desktop.onrender.com/api/sale-lc?fromDate=' + encodeURIComponent(fromDate) + '&toDate=' + encodeURIComponent(toDate) + '&lcType=' + encodeURIComponent(lcType);
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRows(data.rows || []);
        setIsLoaded(true);
        setSelectedRowIndex(0);
        restoreFocus();
      } else {
        alert('Error: ' + (data.error || 'Unable to fetch LC data'));
        restoreFocus();
      }
    } catch (error) {
      console.error('Error fetching Sale LC data:', error);
      alert('Server Connection Error!');
      restoreFocus();
    } finally {
      setLoading(false);
    }
  };

  // Post LC Function (F10 se alag, Direct Open/Net Balance Sync)
  const handlePostLC = async function() {
    if (!isLoaded || filteredRows.length === 0) return;
    if (!window.confirm('क्या आप F9 की इस LC बोनस राशि को सीधे ओपनिंग / नेट बैलेंस में जोड़ना चाहते हैं?')) return;

    try {
      const response = await fetch('https://yantri-desktop.onrender.com/api/sale-lc/post-lc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate: fromDate,
          toDate: toDate,
          rows: filteredRows
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message || 'LC सफलतापूर्वक जमा होकर नेट बैलेंस में जुड़ गई है!');
        fetchLCData();
      } else {
        alert('Error: ' + (data.error || 'Failed to post LC'));
        restoreFocus();
      }
    } catch (error) {
      console.error('Error posting LC:', error);
      alert('Server Connection Error!');
      restoreFocus();
    }
  };

  // Delete LC Function (Specific Party Rollback)
  const handleDeleteLC = async function() {
    if (!selectedParty) return;
    if (!selectedParty.isPosted) {
      alert('चुनी गई पार्टी की LC अभी पोस्ट नहीं हुई है!');
      restoreFocus();
      return;
    }

    if (!window.confirm('क्या आप ' + selectedParty.name + ' की पोस्टेड LC को हटाना (Delete) चाहते हैं?')) return;

    try {
      const response = await fetch('https://yantri-desktop.onrender.com/api/sale-lc/delete-lc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyName: selectedParty.name,
          fromDate: fromDate,
          toDate: toDate
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message || 'LC पोस्टिंग सफलतापूर्वक डिलीट कर दी गई है!');
        fetchLCData();
      } else {
        alert('Error: ' + (data.error || 'Failed to delete LC entry'));
        restoreFocus();
      }
    } catch (error) {
      console.error('Error deleting LC:', error);
      alert('Server Connection Error!');
      restoreFocus();
    }
  };

  const handlePrint = function() {
    window.print();
  };

  // CSS Styling Updated for Layout & Typography Fixes
  const cssStyles = 
    '.f9-container { padding: 4px; background-color: #d0d5dd; height: 96vh; font-size: 11px; font-family: "Segoe UI", Tahoma, Arial, sans-serif; display: flex; flex-direction: column; box-sizing: border-box; outline: none; overflow: hidden; }\n' +
    '.filter-bar { background: #e0e5eb; padding: 6px 8px; border: 1px solid #999; margin-bottom: 4px; font-size: 11px; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }\n' +
    '.filter-row { display: flex; gap: 12px; align-items: center; font-weight: 600; }\n' +
    '.table-wrapper { flex: 1; background: #ffffff; border: 1px solid #777; overflow: auto; margin-bottom: 4px; position: relative; min-height: 0; }\n' +
    '.table-wrapper.blank-screen { background: #5478a0; }\n' +
    '.lc-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 11px; background: #ffffff; }\n' +
    '.lc-table th { background-color: #d8dee8; border: 1px solid #777; padding: 4px 6px; position: sticky; top: 0; z-index: 2; font-weight: bold; text-align: center; color: #111; font-size: 11px; height: 22px; }\n' +
    '.lc-table td { border: 1px solid #b0b0b0; padding: 3px 6px; white-space: nowrap; font-size: 11px; cursor: pointer; color: #111; }\n' +
    '.lc-table tr:hover { background-color: #e5f1fb; }\n' +
    '.lc-table tr.selected-row { background-color: #0078d7 !important; color: #ffffff !important; }\n' +
    '.lc-table tr.selected-row td { color: #ffffff !important; background-color: #0078d7 !important; font-weight: bold; }\n' +
    '.pname-td { text-align: left !important; font-weight: bold; color: #000; font-size: 11px; }\n' +
    '.pno-td { text-align: center !important; font-weight: 600; }\n' +
    '.status-tag { font-size: 9px; padding: 2px 6px; border-radius: 2px; font-weight: bold; text-align: center; display: inline-block; }\n' +
    '.tag-posted { background-color: #28a745; color: #fff; }\n' +
    '.tag-pending { background-color: #ffc107; color: #000; }\n' +
    '.bottom-bar { display: flex; gap: 8px; align-items: center; margin-top: auto; padding: 4px; background: #c5cbd5; border: 1px solid #888; flex-shrink: 0; box-shadow: 0px -2px 5px rgba(0,0,0,0.1); }\n' +
    '.totals-card { flex: 1; border: 1px solid #888; background: #e8e8e8; padding: 1px; }\n' +
    '.totals-table { width: 100%; border-collapse: collapse; background: #ffffff; font-size: 11px; text-align: right; }\n' +
    '.totals-table th, .totals-table td { border: 1px solid #999; padding: 3px 6px; font-weight: bold; color: #000; }\n' +
    '.totals-table th { background: #d0d0d0; text-align: center; font-size: 10px; }\n' +
    '.status-box { font-size: 12px; font-weight: bold; padding: 6px 10px; border: 1px solid #888; background: #ffffff; min-width: 140px; text-align: center; border-radius: 2px; }\n' +
    '.post-btn { background-color: #d9534f; color: #fff; font-weight: bold; border: 1px solid #c9302c; padding: 6px 18px; cursor: pointer; border-radius: 3px; font-size: 11px; }\n' +
    '.post-btn:hover { background-color: #c9302c; }\n' +
    '.delete-btn { background-color: #6c757d; color: #fff; font-weight: bold; border: 1px solid #5a6268; padding: 6px 16px; cursor: pointer; border-radius: 3px; font-size: 11px; }\n' +
    '.delete-btn:hover { background-color: #5a6268; }\n' +
    '@media print {\n' +
    '  body * { visibility: hidden; }\n' +
    '  .f9-container, .f9-container * { visibility: visible; }\n' +
    '  .f9-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; background: #fff !important; }\n' +
    '  .filter-bar, .action-btns, .post-btn, .delete-btn { display: none !important; }\n' +
    '  .table-wrapper { height: auto !important; overflow: visible !important; border: none; background: #fff; }\n' +
    '}\n';

  return (
    <div className="f9-container" tabIndex={0}>
      <style>{cssStyles}</style>

      {/* Top Filter Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <span>Date: <input type="text" value={fromDate} onChange={handleFromDateChange} style={{ width: '80px', textAlign: 'center', fontWeight: 'bold' }} /></span>
          <span>To: <input type="text" value={toDate} onChange={handleToDateChange} style={{ width: '80px', textAlign: 'center', fontWeight: 'bold' }} /></span>

          <span>LC Type: </span>
          <select value={lcType} onChange={function(e) { setLcType(e.target.value); }} style={{ fontWeight: 'bold', padding: '1px 4px' }}>
            <option value="Customer LC">Customer LC</option>
            <option value="Third Party LC">Third Party LC</option>
            <option value="Agent LC">Agent LC</option>
          </select>

          <button onClick={fetchLCData} style={{ padding: '2px 18px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Loading...' : 'Show'}
          </button>
        </div>

        <div className="filter-row">
          <span>Filter: </span>
          <input 
            id="f9FilterInput"
            type="text" 
            value={filterText} 
            onChange={function(e) { setFilterText(e.target.value); setSelectedRowIndex(0); }} 
            placeholder="Search Party Name or Pno..." 
            autoFocus
            style={{ width: '280px', padding: '2px 6px', fontWeight: 'bold' }} 
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className={isLoaded ? "table-wrapper" : "table-wrapper blank-screen"} ref={tableWrapperRef}>
        {isLoaded && (
          <table className="lc-table">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>Pno</th>
                <th style={{ width: '130px', textAlign: 'left' }}>Name</th>
                <th>Amount</th>
                <th>Comm</th>
                <th>Balance</th>
                <th>Payment</th>
                <th>Hissa</th>
                <th>AdjustReceipt</th>
                <th>AdjustPayment</th>
                <th>DENE</th>
                <th>LENE</th>
                <th>Comm(%)</th>
                <th>CommAmount</th>
                <th style={{ width: '60px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(function(row, idx) {
                const isSelected = selectedRowIndex === idx;
                return (
                  <tr 
                    key={idx} 
                    className={isSelected ? "selected-row" : ""}
                    onClick={function() { setSelectedRowIndex(idx); }}
                  >
                    <td className="pno-td">{row.pno}</td>
                    <td className="pname-td">{row.name}</td>
                    <td>{row.amount || 0}</td>
                    <td>{row.comm || 0}</td>
                    <td>{row.balance || 0}</td>
                    <td>{row.payment || 0}</td>
                    <td>{row.hissa || 0}</td>
                    <td>{row.adjustReceipt || 0}</td>
                    <td>{row.adjustPayment || 0}</td>
                    <td>{row.dene || 0}</td>
                    <td>{row.lene || 0}</td>
                    <td style={{ textAlign: 'center' }}>{row.commPerc || 0}</td>
                    <td><strong>{row.commAmount || 0}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={row.isPosted ? "status-tag tag-posted" : "status-tag tag-pending"}>
                        {row.isPosted ? 'Posted' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Bar Fixed at Bottom */}
      <div className="bottom-bar">
        
        <div className="totals-card">
          <table className="totals-table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Comm</th>
                <th>Balance</th>
                <th>DENE</th>
                <th>LENE</th>
                <th>Total Comm</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{dynamicTotals.amount || 0}</td>
                <td>{dynamicTotals.comm || 0}</td>
                <td>{dynamicTotals.balance || 0}</td>
                <td>{dynamicTotals.dene || 0}</td>
                <td>{dynamicTotals.lene || 0}</td>
                <td>{dynamicTotals.totalComm || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="status-box">
          BALANCE: <span style={{ color: netBalanceStatus < 0 ? 'red' : 'green' }}>{netBalanceStatus || 0}</span>
        </div>

        {/* Delete / Revert LC Button */}
        <button onClick={handleDeleteLC} className="delete-btn" title="Delete Posted LC for Selected Party">
          Delete LC
        </button>

        {/* Post LC Button */}
        <button onClick={handlePostLC} className="post-btn">
          Post LC
        </button>

        {/* Print Button */}
        <div className="action-btns" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#333', fontWeight: 'bold' }}>Ctrl+P</span>
          <button onClick={handlePrint} style={{ padding: '3px 12px', cursor: 'pointer', fontWeight: 'bold' }}>Print</button>
        </div>

      </div>

    </div>
  );
}