import React, { useState, useEffect, useRef } from 'react';

export default function BalanceHistoryF8() {
  var getTodayDateStr = function() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  var [balanceType, setBalanceType] = useState('/ Daily Balance / Win');
  var [fromDate, setFromDate] = useState(getTodayDateStr());
  var [toDate, setToDate] = useState(getTodayDateStr());
  var [withoutHissa, setWithoutHissa] = useState(false);
  
  var [isLoaded, setIsLoaded] = useState(false);
  var [loading, setLoading] = useState(false);

  // Active Focused Table Tracker: 'TOP', 'BAL', or 'SALE'
  var [activeTable, setActiveTable] = useState('TOP');

  // Row Selection States for All 3 Grids
  var [selectedTopRow, setSelectedTopRow] = useState(0);
  var [selectedBalIndex, setSelectedBalIndex] = useState(0);
  var [selectedSaleIndex, setSelectedSaleIndex] = useState(0);

  var [games, setGames] = useState([]);
  var [historyData, setHistoryData] = useState([]);
  var [shiftBalance, setShiftBalance] = useState({});
  var [shiftSale, setShiftSale] = useState({});

  // Container Refs for Auto Scrolling
  var topWrapperRef = useRef(null);
  var balWrapperRef = useRef(null);
  var saleWrapperRef = useRef(null);

  // Helper to restore focus back to Date input
  var restoreFocus = function() {
    setTimeout(function() {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      var el = document.getElementById('f8FromDateInput');
      if (el) {
        el.focus();
        if (typeof el.select === 'function') {
          el.select();
        }
      }
    }, 50);
  };

  // Global Keyboard Arrow Navigation for ALL THREE TABLES
  useEffect(function() {
    function handleKeyDown(e) {
      if (!isLoaded) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var isDown = e.key === 'ArrowDown';

        if (activeTable === 'TOP' && historyData.length > 0) {
          e.preventDefault();
          setSelectedTopRow(function(prev) {
            var current = (prev === null || prev === undefined) ? 0 : prev;
            return isDown ? Math.min(current + 1, historyData.length - 1) : Math.max(current - 1, 0);
          });
        } else if (activeTable === 'BAL' && games.length > 0) {
          e.preventDefault();
          setSelectedBalIndex(function(prev) {
            var current = (prev === null || prev === undefined) ? 0 : prev;
            return isDown ? Math.min(current + 1, games.length - 1) : Math.max(current - 1, 0);
          });
        } else if (activeTable === 'SALE' && games.length > 0) {
          e.preventDefault();
          setSelectedSaleIndex(function(prev) {
            var current = (prev === null || prev === undefined) ? 0 : prev;
            return isDown ? Math.min(current + 1, games.length - 1) : Math.max(current - 1, 0);
          });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return function() {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoaded, historyData, games, activeTable]);

  // Auto-scroll logic when arrow keys change selection
  useEffect(function() {
    if (activeTable === 'TOP' && topWrapperRef.current) {
      var el = topWrapperRef.current.querySelector('.selected-row');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedTopRow, activeTable]);

  useEffect(function() {
    if (activeTable === 'BAL' && balWrapperRef.current) {
      var el = balWrapperRef.current.querySelector('.selected-row');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedBalIndex, activeTable]);

  useEffect(function() {
    if (activeTable === 'SALE' && saleWrapperRef.current) {
      var el = saleWrapperRef.current.querySelector('.selected-row');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedSaleIndex, activeTable]);

  var fetchBalanceHistory = function(overrideWithoutHissa) {
    var checkHissa = overrideWithoutHissa !== undefined ? overrideWithoutHissa : withoutHissa;
    setLoading(true);
    
    // Base API Endpoint Setup
    var baseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
      ? 'http://localhost:5000'
      : 'https://yantri-desktop.onrender.com';

    var url = baseUrl + '/api/balance-history?fromDate=' + encodeURIComponent(fromDate) + '&toDate=' + encodeURIComponent(toDate) + '&withoutHissa=' + checkHissa;
    
    fetch(url)
      .then(function(res) {
        if (!res.ok) {
          throw new Error('Server returned status: ' + res.status);
        }
        return res.json();
      })
      .then(function(data) {
        if (data && data.success) {
          var fetchedGames = data.games || [];
          var fetchedRows = data.rows || [];
          setGames(fetchedGames);
          setHistoryData(fetchedRows);
          setShiftBalance(data.shiftBalance || {});
          setShiftSale(data.shiftSale || {});
          setIsLoaded(true);

          if (fetchedRows.length > 0) setSelectedTopRow(0);
          if (fetchedGames.length > 0) {
            setSelectedBalIndex(0);
            setSelectedSaleIndex(0);
          }
          restoreFocus();
        } else {
          alert('Error: ' + (data ? data.error : 'Data fetch failed'));
          restoreFocus();
        }
      })
.catch(function(error) {
    console.error('Error fetching balance history:', error);
    alert('Server Error (500/Connection Failed): ' + error.message);
    restoreFocus();
  }) 
       .finally(function() {
        setLoading(false);
      });
  };

  var handleShowClick = function() {
    fetchBalanceHistory(withoutHissa);
  };

  var handleWithoutHissaChange = function(e) {
    var isChecked = e.target.checked;
    setWithoutHissa(isChecked);
    if (isLoaded) {
      fetchBalanceHistory(isChecked);
    }
  };

  var handlePrint = function() {
    window.print();
    restoreFocus();
  };

  var cssStyles = 
    ".f8-container { padding: 4px; background-color: #d0d5dd; height: 95vh; font-size: 10px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; display: flex; flex-direction: column; box-sizing: border-box; outline: none; }\n" +
    ".filter-bar { display: flex; gap: 8px; align-items: center; background: #e0e5eb; padding: 3px 6px; border: 1px solid #999; margin-bottom: 4px; font-size: 11px; font-weight: bold; }\n" +
    ".table-wrapper { flex: 1; background: #ffffff; border: 1px solid #777; overflow: auto; margin-bottom: 4px; position: relative; }\n" +
    ".table-wrapper.blank-screen { background: #5478a0; }\n" +
    ".history-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; background: #ffffff; }\n" +
    ".history-table th { background-color: #e0e0e0; border: 1px solid #888; padding: 2px 4px; position: sticky; top: 0; z-index: 2; font-weight: bold; text-align: center; color: #000; font-size: 10px; height: 20px; }\n" +
    ".history-table td { border: 1px solid #a0a0a0; padding: 2px 4px; vertical-align: top; white-space: nowrap; font-size: 10px; cursor: pointer; color: #000; font-weight: bold; }\n" +
    ".history-table tr:hover { background-color: #e5f1fb; }\n" +
    ".history-table tr.selected-row { background-color: #0078d7 !important; color: #ffffff !important; }\n" +
    ".history-table tr.selected-row td { color: #ffffff !important; background-color: #0078d7 !important; }\n" +
    ".pname-col { text-align: left !important; font-weight: bold; background: #eaeaea; width: 110px; color: #000; vertical-align: top !important; padding-top: 3px !important; }\n" +
    ".line-empty { height: 13px; }\n" +
    ".line-sale { height: 13px; font-weight: bold; }\n" +
    ".line-bal { height: 13px; font-weight: bold; }\n" +
    ".line-win { font-size: 9px; font-weight: bold; height: 13px; }\n" +
    ".split-grids { display: flex; gap: 6px; height: 200px; }\n" +
    ".bottom-card { flex: 1; border: 1px solid #888; background: #e8e8e8; padding: 2px; display: flex; flex-direction: column; }\n" +
    ".bottom-title { font-weight: bold; margin-bottom: 2px; font-size: 10px; color: #000; padding-left: 2px; }\n" +
    ".bottom-box { flex: 1; background: #ffffff; border: 1px solid #777; overflow-y: auto; }\n" +
    ".bottom-box.blank-screen { background: #5478a0; }\n" +
    ".bottom-table { width: 100%; border-collapse: collapse; background: #ffffff; font-size: 10px; }\n" +
    ".bottom-table th, .bottom-table td { border: 1px solid #a0a0a0; padding: 2px 5px; line-height: 1.25; font-size: 10px; cursor: pointer; font-weight: bold; }\n" +
    ".bottom-table th { background: #dcdcdc; text-align: left; position: sticky; top: 0; font-weight: bold; }\n" +
    ".bottom-table tr:hover { background-color: #e5f1fb; }\n" +
    ".bottom-table tr.selected-row { background-color: #0078d7 !important; color: #ffffff !important; }\n" +
    ".bottom-table tr.selected-row td { color: #ffffff !important; background-color: #0078d7 !important; }\n" +
    ".indicator-col { width: 14px; text-align: center !important; font-size: 8px; padding: 0 !important; background: #e0e0e0; font-weight: bold; color: #000; }\n" +
    "@media print {\n" +
    "  body * { visibility: hidden; }\n" +
    "  .f8-container, .f8-container * { visibility: visible; }\n" +
    "  .f8-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; background: #fff !important; }\n" +
    "  .filter-bar, .action-btns { display: none !important; }\n" +
    "  .table-wrapper { height: auto !important; overflow: visible !important; border: none; background: #fff; }\n" +
    "}";

  return (
    <div className="f8-container" tabIndex={0}>
      <style>{cssStyles}</style>

      {/* Top Filter Bar */}
      <div className="filter-bar">
        <span>Type: </span>
        <select value={balanceType} onChange={function(e) { setBalanceType(e.target.value); }} style={{ fontWeight: 'bold' }}>
          <option value="/ Daily Balance / Win">/ Daily Balance / Win</option>
        </select>

        <span>Date: <input id="f8FromDateInput" type="text" value={fromDate} onChange={function(e) { setFromDate(e.target.value); }} autoFocus style={{ width: '75px', textAlign: 'center', fontWeight: 'bold' }} /></span>
        <span>To: <input type="text" value={toDate} onChange={function(e) { setToDate(e.target.value); }} style={{ width: '75px', textAlign: 'center', fontWeight: 'bold' }} /></span>

        <button onClick={handleShowClick} style={{ padding: '1px 12px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Loading...' : 'Show'}
        </button>

        <label style={{ marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <input type="checkbox" checked={withoutHissa} onChange={handleWithoutHissaChange} /> Without Hissa
        </label>
      </div>

      {/* Main Top Grid */}
      <div 
        className={isLoaded ? "table-wrapper" : "table-wrapper blank-screen"} 
        ref={topWrapperRef}
        onClick={function() { setActiveTable('TOP'); }}
      >
        {isLoaded && (
          <table className="history-table">
            <thead>
              <tr>
                <th className="pname-col">PName</th>
                {games.map(function(g) { return <th key={g}>{g}</th>; })}
                <th>TotalAmount</th>
                <th>TotalBalance</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map(function(row, idx) {
                var isSelected = selectedTopRow === idx;
                return (
                  <tr 
                    key={idx} 
                    className={isSelected ? "selected-row" : ""}
                    onClick={function(e) {
                      e.stopPropagation();
                      setActiveTable('TOP');
                      setSelectedTopRow(idx); 
                    }}
                  >
                    <td className="pname-col">{row.pname}</td>
                    {games.map(function(g) {
                      var item = row.games ? row.games[g] : null;
                      if (!item) return <td key={g}></td>;
                      return (
                        <td key={g}>
                          <div className="line-sale">{item.sale || ''}</div>
                          <div className="line-bal">{item.balance !== undefined ? item.balance : ''}</div>
                          <div className="line-win">
                            {(item.winJoda || item.winAkhar) ? ('N:' + (item.winJoda || 0) + ' A:' + (item.winAkhar || 0)) : ''}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ verticalAlign: 'top', paddingTop: '3px' }}>
                      <strong>{row.totalAmount || 0}</strong>
                    </td>
                    <td>
                      <div className="line-empty"></div>
                      <div className="line-bal"><strong>{row.totalBalance || 0}</strong></div>
                      <div className="line-win">
                        {(row.winJodaTotal || row.winAkharTotal) ? ('N:' + (row.winJodaTotal || 0) + ' A:' + (row.winAkharTotal || 0)) : ''}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Split Grids: BALANCE & SALE */}
      <div className="split-grids">
        
        {/* Left Balance Grid */}
        <div className="bottom-card">
          <span className="bottom-title">BALANCE</span>
          <div 
            className={isLoaded ? "bottom-box" : "bottom-box blank-screen"}
            ref={balWrapperRef}
            onClick={function() { setActiveTable('BAL'); }}
          >
            {isLoaded && (
              <table className="bottom-table">
                <thead>
                  <tr>
                    <th className="indicator-col"></th>
                    <th>Shift</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map(function(g, idx) {
                    var isSelected = selectedBalIndex === idx;
                    return (
                      <tr 
                        key={g} 
                        className={isSelected ? "selected-row" : ""}
                        onClick={function(e) {
                          e.stopPropagation();
                          setActiveTable('BAL');
                          setSelectedBalIndex(idx); 
                        }}
                      >
                        <td className="indicator-col">{isSelected ? '▶️' : ''}</td>
                        <td>{g}</td>
                        <td style={{ textAlign: 'right' }}>{shiftBalance[g] || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Sale Grid */}
        <div className="bottom-card">
          <span className="bottom-title">SALE</span>
          <div 
            className={isLoaded ? "bottom-box" : "bottom-box blank-screen"}
            ref={saleWrapperRef}
            onClick={function() { setActiveTable('SALE'); }}
          >
            {isLoaded && (
              <table className="bottom-table">
                <thead>
                  <tr>
                    <th className="indicator-col"></th>
                    <th>Shift</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map(function(g, idx) {
                    var isSelected = selectedSaleIndex === idx;
                    return (
                      <tr 
                        key={g} 
                        className={isSelected ? "selected-row" : ""}
                        onClick={function(e) {
                          e.stopPropagation();
                          setActiveTable('SALE');
                          setSelectedSaleIndex(idx); 
                        }}
                      >
                        <td className="indicator-col">{isSelected ? '▶️' : ''}</td>
                        <td>{g}</td>
                        <td style={{ textAlign: 'right' }}>{shiftSale[g] || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-btns" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '10px', textAlign: 'center', color: '#555', fontWeight: 'bold' }}>Ctrl+P</span>
          <button onClick={handlePrint} style={{ padding: '4px 14px', cursor: 'pointer', fontWeight: 'bold' }}>Print</button>
        </div>

      </div>

    </div>
  );
}