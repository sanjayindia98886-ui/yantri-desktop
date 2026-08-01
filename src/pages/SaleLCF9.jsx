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

  // Fetch LC Data
  const fetchLCData = async function() {
    setLoading(true);
    try {
      const url = 'http://localhost:5000/api/sale-lc?fromDate=' + encodeURIComponent(fromDate) + '&toDate=' + encodeURIComponent(toDate) + '&lcType=' + encodeURIComponent(lcType);
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRows(data.rows || []);
        setIsLoaded(true);
        setSelectedRowIndex(0);
      } else {
        alert('Error: ' + (data.error || 'Unable to fetch LC data'));
      }
    } catch (error) {
      console.error('Error fetching Sale LC data:', error);
      alert('Server Connection Error!');
    } finally {
      setLoading(false);
    }
  };

  // Post LC Function (F10 se alag, Direct Open/Net Balance Sync)
  const handlePostLC = async function() {
    if (!isLoaded || filteredRows.length === 0) return;
    if (!window.confirm('क्या आप F9 की इस LC बोनस राशि को सीधे ओपनिंग / नेट बैलेंस में जोड़ना चाहते हैं?')) return;

    try {
      const response = await fetch('http://localhost:5000/api/sale-lc/post-lc', {
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
      }
    } catch (error) {
      console.error('Error posting LC:', error);
      alert('Server Connection Error!');
    }
  };

  // Delete LC Function (Specific Party Rollback)
  const handleDeleteLC = async function() {
    if (!selectedParty) return;
    if (!selectedParty.isPosted) {
      alert('चुनी गई पार्टी की LC अभी पोस्ट नहीं हुई है!');
      return;
    }

    if (!window.confirm('क्या आप ' + selectedParty.name + ' की पोस्टेड LC को हटाना (Delete) चाहते हैं?')) return;

    try {
      const response = await fetch('http://localhost:5000/api/sale-lc/delete-lc', {
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
      }
    } catch (error) {
      console.error('Error deleting LC:', error);
      alert('Server Connection Error!');
    }
  };

  const handlePrint = function() {
    window.print();
  };

  // Pure CSS String without Backticks
  const cssStyles = 
    '.f9-container { padding: 4px; background-color: #d0d5dd; height: 95vh; font-size: 10px; font-family: "Segoe UI", Tahoma, Arial, sans-serif; display: flex; flex-direction: column; box-sizing: border-box; outline: none; }\n' +
    '.filter-bar { background: #e0e5eb; padding: 4px 8px; border: 1px solid #999; margin-bottom: 4px; font-size: 11px; display: flex; flex-direction: column; gap: 4px; }\n' +
    '.filter-row { display: flex; gap: 12px; align-items: center; }\n' +
    '.table-wrapper { flex: 1; background: #ffffff; border: 1px solid #777; overflow: auto; margin-bottom: 4px; position: relative; }\n' +
    '.table-wrapper.blank-screen { background: #5478a0; }\n' +
    '.lc-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; background: #ffffff; }\n' +
    '.lc-table th { background-color: #e0e0e0; border: 1px solid #888; padding: 3px 4px; position: sticky; top: 0; z-index: 2; font-weight: bold; text-align: center; color: #000; font-size: 10px; height: 20px; }\n' +
    '.lc-table td { border: 1px solid #a0a0a0; padding: 2px 4px; white-space: nowrap; font-size: 10px; cursor: pointer; }\n' +
    '.lc-table tr:hover { background-color: #e5f1fb; }\n' +
    '.lc-table tr.selected-row { background-color: #0078d7 !important; color: #ffffff !important; }\n' +
    '.lc-table tr.selected-row td { color: #ffffff !important; background-color: #0078d7 !important; }\n' +
    '.pname-td { text-align: left !important; font-weight: bold; }\n' +
    '.pno-td { text-align: center !important; }\n' +
    '.status-tag { font-size: 9px; padding: 1px 4px; border-radius: 2px; font-weight: bold; text-align: center; }\n' +
    '.tag-posted { background-color: #28a745; color: #fff; }\n' +
    '.tag-pending { background-color: #ffc107; color: #000; }\n' +
    '.bottom-bar { display: flex; gap: 8px; align-items: flex-end; margin-top: 2px; }\n' +
    '.totals-card { flex: 1; border: 1px solid #888; background: #e8e8e8; padding: 2px; }\n' +
    '.totals-table { width: 100%; border-collapse: collapse; background: #ffffff; font-size: 10px; text-align: right; }\n' +
    '.totals-table th, .totals-table td { border: 1px solid #a0a0a0; padding: 2px 6px; font-weight: bold; }\n' +
    '.totals-table th { background: #dcdcdc; text-align: center; }\n' +
    '.status-box { font-size: 12px; font-weight: bold; padding: 4px 8px; border: 1px solid #999; background: #e8e8e8; min-width: 140px; text-align: center; }\n' +
    '.post-btn { background-color: #d9534f; color: #fff; font-weight: bold; border: 1px solid #c9302c; padding: 6px 16px; cursor: pointer; border-radius: 2px; }\n' +
    '.delete-btn { background-color: #6c757d; color: #fff; font-weight: bold; border: 1px solid #5a6268; padding: 6px 14px; cursor: pointer; border-radius: 2px; }\n' +
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
          <span>Date: <input type="text" value={fromDate} onChange={handleFromDateChange} style={{ width: '75px', textAlign: 'center' }} /></span>
          <span>To: <input type="text" value={toDate} onChange={handleToDateChange} style={{ width: '75px', textAlign: 'center' }} /></span>

          <span>LC Type: </span>
          <select value={lcType} onChange={function(e) { setLcType(e.target.value); }}>
            <option value="Customer LC">Customer LC</option>
            <option value="Third Party LC">Third Party LC</option>
            <option value="Agent LC">Agent LC</option>
          </select>

          <button onClick={fetchLCData} style={{ padding: '1px 16px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Loading...' : 'Show'}
          </button>
        </div>

        <div className="filter-row">
          <span>Filter: </span>
          <input 
            type="text" 
            value={filterText} 
            onChange={function(e) { setFilterText(e.target.value); setSelectedRowIndex(0); }} 
            placeholder="Search Party Name or Pno..." 
            style={{ width: '260px' }} 
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
                <th style={{ width: '120px', textAlign: 'left' }}>Name</th>
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
                <th style={{ width: '55px' }}>Status</th>
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

      {/* Bottom Bar */}
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
          <span style={{ fontSize: '10px', color: '#555' }}>Ctrl+P</span>
          <button onClick={handlePrint} style={{ padding: '3px 12px', cursor: 'pointer', fontWeight: 'bold' }}>Print</button>
        </div>

      </div>

    </div>
  );
}