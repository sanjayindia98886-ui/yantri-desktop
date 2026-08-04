import React, { useState, useEffect } from 'react';

export default function AccountF10() {
  // Today's Date Helper Function (DD/MM/YYYY)
  const getTodayDateStr = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  // 1. Entry Form State
  const [party, setParty] = useState('');
  const [oppositeParty, setOppositeParty] = useState('');
  const [entryDate, setEntryDate] = useState(function() {
    return localStorage.getItem('f10_entry_date') || getTodayDateStr();
  });
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [selectedAccId, setSelectedAccId] = useState(null);

  // Custom Delete Confirm Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 2. History Filter State
  const [historyParty, setHistoryParty] = useState('All');
  const [historyType, setHistoryType] = useState('All');
  const [fromDate, setFromDate] = useState(function() {
    return localStorage.getItem('f10_from_date') || getTodayDateStr();
  });
  const [toDate, setToDate] = useState(function() {
    return localStorage.getItem('f10_to_date') || getTodayDateStr();
  });

  // 3. Data Lists, Totals & Notification State
  const [partiesList, setPartiesList] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [totals, setTotals] = useState({ totalDiye: 0, totalLiye: 0 });
  const [notification, setNotification] = useState('');

  // Persistence Handlers
  const handleEntryDateChange = function(e) {
    const val = e.target.value;
    setEntryDate(val);
    localStorage.setItem('f10_entry_date', val);
  };

  const handleFromDateChange = function(e) {
    const val = e.target.value;
    setFromDate(val);
    localStorage.setItem('f10_from_date', val);
  };

  const handleToDateChange = function(e) {
    const val = e.target.value;
    setToDate(val);
    localStorage.setItem('f10_to_date', val);
  };

  // Helper to restore focus directly to Amount Input Box
  const restoreFocusToAmount = function() {
    setTimeout(function() {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      const el = document.getElementById('amount-input-f10');
      if (el) {
        el.focus();
        if (typeof el.select === 'function') {
          el.select();
        }
      }
    }, 50);
  };

  // Fetch F1 Parties Master dynamically
  useEffect(function() {
    fetchParties();
  }, []);

  const fetchParties = function() {
    fetch('https://yantri-desktop.onrender.com/api/parties')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.parties)) {
          list = data.parties;
        } else if (data && Array.isArray(data.rows)) {
          list = data.rows;
        }

        setPartiesList(list);
        if (list.length > 0 && !party) {
          const firstPartyName = list[0].party_name || list[0].PName || '';
          setParty(firstPartyName);
        }
      })
      .catch(function(err) {
        console.error('Error fetching parties in F10:', err);
      });
  };

  // Keyboard Shortcuts (Ctrl+P, Ctrl+T)
  useEffect(function() {
    function handleShortcuts(e) {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'p') {
          e.preventDefault();
          const elem = document.getElementById('party-select-f10');
          if (elem) elem.focus();
        } else if (key === 't') {
          e.preventDefault();
          const elem = document.getElementById('history-type-f10');
          if (elem) elem.focus();
        }
      }
    }
    window.addEventListener('keydown', handleShortcuts);
    return function() {
      window.removeEventListener('keydown', handleShortcuts);
    };
  }, []);

  // Fetch History Records
  const fetchHistory = function() {
    const url = 'https://yantri-desktop.onrender.com/api/accounts?party=' + encodeURIComponent(historyParty) +
                '&type=' + encodeURIComponent(historyType) +
                '&fromDate=' + encodeURIComponent(fromDate) +
                '&toDate=' + encodeURIComponent(toDate);

    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          const list = data.rows || [];
          setHistoryRows(list);

          let diyeSum = 0;
          let liyeSum = 0;
          list.forEach(function(r) {
            const amt = Number(r.amount) || 0;
            if (r.type === 'Payment/Diye') diyeSum += amt;
            else if (r.type === 'Receipt/Liye') liyeSum += amt;
          });

          setTotals({ totalDiye: diyeSum, totalLiye: liyeSum });
        } else {
          setNotification('Error: ' + (data.error || 'Failed to load history'));
        }
        restoreFocusToAmount();
      })
      .catch(function(err) {
        console.error('Fetch history error:', err);
        setNotification('Server Connection Error!');
        restoreFocusToAmount();
      });
  };

  // Reset Input Form
  const resetForm = function() {
    setAmount('');
    setNarration('');
    setOppositeParty('');
    setSelectedAccId(null);
  };

  // Save or Update Entry
  const handleSave = function(e) {
    if (e) e.preventDefault();
    if (!party) {
      setNotification('Please select Party (जिसको पैसे दिए)!');
      restoreFocusToAmount();
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setNotification('Please enter valid Amount!');
      restoreFocusToAmount();
      return;
    }

    const payload = {
      acc_id: selectedAccId,
      party_name: party,
      opposite_party: oppositeParty,
      date_val: entryDate,
      amount: Number(amount),
      type: 'Payment/Diye',
      narration: narration
    };

    fetch('https://yantri-desktop.onrender.com/api/accounts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setNotification(selectedAccId ? 'Transaction Updated Successfully!' : 'Transaction Saved Successfully!');
          setTimeout(function() {
            setNotification('');
          }, 3000);
          resetForm();
          fetchHistory();
        } else {
          setNotification('Error: ' + (data.error || 'Failed to save transaction'));
          restoreFocusToAmount();
        }
      })
      .catch(function(err) {
        console.error('Save error:', err);
        setNotification('Server Connection Error!');
        restoreFocusToAmount();
      });
  };

  // Open Custom Delete Modal
  const handleOpenDeleteModal = function() {
    if (!selectedAccId) {
      setNotification('Please select an entry from History grid to delete!');
      restoreFocusToAmount();
      return;
    }
    setShowDeleteConfirm(true);
  };

  // Execute Actual Delete
  const handleConfirmDelete = function() {
    setShowDeleteConfirm(false);

    fetch('https://yantri-desktop.onrender.com/api/accounts/delete/' + selectedAccId, {
      method: 'DELETE'
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setNotification('Transaction Deleted Successfully!');
          resetForm();
          fetchHistory();

          setTimeout(function() {
            setNotification('');
          }, 3000);
        } else {
          setNotification('Error: ' + (data.error || 'Failed to delete transaction'));
          restoreFocusToAmount();
        }
      })
      .catch(function(err) {
        console.error('Delete error:', err);
        setNotification('Server Connection Error!');
        restoreFocusToAmount();
      });
  };

  // Select Row for Editing
  const handleSelectRow = function(r) {
    setSelectedAccId(r.acc_id);
    setParty(r.party_name || '');
    setOppositeParty(r.opposite_party || '');
    setEntryDate(r.date_val || entryDate);
    setAmount(String(r.amount || ''));
    setNarration(r.narration || '');
  };

  return (
    <div style={{ padding: '10px', background: '#dcdcdc', minHeight: '92vh', fontSize: '11px', display: 'flex', gap: '15px', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Custom Windows Classic Style Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#ece9d8', border: '2px solid #0055ea', width: '300px', padding: '3px', boxShadow: '2px 2px 8px rgba(0,0,0,0.4)', fontFamily: 'Tahoma, sans-serif' }}>
            <div style={{ background: 'linear-[#0058e6], [#3a93ff]', color: '#fff', padding: '3px 6px', fontWeight: 'bold', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Confirm Delete</span>
              <button onClick={function() { setShowDeleteConfirm(false); restoreFocusToAmount(); }} style={{ background: '#d13c23', color: '#fff', border: '1px solid #fff', width: '16px', height: '16px', cursor: 'pointer', fontSize: '10px', lineHeight: '10px', padding: 0 }}>✕</button>
            </div>
            <div style={{ padding: '15px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#000' }}>
              Are you sure you want to delete this transaction?
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', paddingBottom: '8px' }}>
              <button
                onClick={handleConfirmDelete}
                autoFocus
                style={{ padding: '3px 18px', background: '#ece9d8', border: '1px solid #7f9db9', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
              >
                Yes
              </button>
              <button
                onClick={function() { setShowDeleteConfirm(false); restoreFocusToAmount(); }}
                style={{ padding: '3px 18px', background: '#ece9d8', border: '1px solid #7f9db9', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Section: Accounts Entry Form */}
      <div style={{ width: '38%', border: '1px solid #7a96df', background: '#ece9d8', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 15px 0', fontSize: '14px', fontWeight: 'bold' }}>Accounts</h3>

        {/* Notification Banner */}
        {notification && (
          <div style={{ background: '#d4edda', color: '#155724', padding: '4px 6px', marginBottom: '8px', border: '1px solid #c3e6cb', fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>
            {notification}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#111' }}>Party (जिसको पैसे दिए):</label>
            <select
              id="party-select-f10"
              value={party}
              onChange={function(e) { setParty(e.target.value); }}
              autoFocus
              style={{ width: '100%', padding: '3px', border: '1px solid #7f9db9', fontWeight: 'bold', fontSize: '11px' }}
            >
              <option value="">-- Select Party --</option>
              {partiesList.map(function(p, idx) {
                const pname = p.party_name || p.PName || '';
                return <option key={p.pno || p.id || idx} value={pname}>{pname}</option>;
              })}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#111' }}>Opposite Party (किसने पैसे दिए):</label>
            <select
              value={oppositeParty}
              onChange={function(e) { setOppositeParty(e.target.value); }}
              style={{ width: '100%', padding: '3px', border: '1px solid #7f9db9', fontWeight: 'bold', fontSize: '11px' }}
            >
              <option value="">-- Select Opposite Party --</option>
              {partiesList
                .filter(function(p) { return (p.party_name || p.PName) !== party; })
                .map(function(p, idx) {
                  const pname = p.party_name || p.PName || '';
                  return <option key={p.pno || p.id || idx} value={pname}>{pname}</option>;
                })
              }
            </select>
          </div>

          <div style={{ height: '70px', background: '#5478a0', border: '1px solid #777', marginBottom: '10px' }}></div>

          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '60px', fontWeight: 'bold' }}>Date: </label>
            <input
              type="text"
              value={entryDate}
              onChange={handleEntryDateChange}
              style={{ width: '110px', padding: '3px', border: '1px solid #7f9db9', fontWeight: 'bold', textAlign: 'center' }}
            />
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '60px', fontWeight: 'bold' }}>Amount: </label>
            <input
              id="amount-input-f10"
              type="text"
              value={amount}
              onChange={function(e) { setAmount(e.target.value); }}
              style={{ width: '130px', padding: '3px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '60px', fontWeight: 'bold' }}>Type: </label>
            <span style={{ padding: '3px 8px', background: '#fff', border: '1px solid #7f9db9', fontWeight: 'bold', color: '#800000' }}>
              Payment / Diye
            </span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>Narration:</label>
            <input
              type="text"
              value={narration}
              onChange={function(e) { setNarration(e.target.value); }}
              style={{ width: '100%', padding: '3px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
              placeholder="Cash / Bank / Rokad Details..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{ padding: '5px 22px', cursor: 'pointer', background: '#ece9d8', border: '2px solid #7a96df', fontWeight: 'bold', fontSize: '11px' }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleOpenDeleteModal}
              style={{ padding: '5px 22px', background: '#800000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', borderRadius: '2px' }}
            >
              Delete
            </button>
          </div>
        </form>

        <div style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '10px', color: '#333', fontWeight: 'bold' }}>
          <strong>Ctrl+P</strong> - Focus Party For Entry
        </div>
      </div>

      {/* Right Section: Transaction History Grid */}
      <div style={{ width: '62%', border: '1px solid #7a96df', background: '#ece9d8', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>History</h3>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '11px', fontWeight: 'bold' }}>
          <span>Party: 
            <select
              value={historyParty}
              onChange={function(e) { setHistoryParty(e.target.value); }}
              style={{ fontSize: '11px', border: '1px solid #7f9db9', fontWeight: 'bold', marginLeft: '3px' }}
            >
              <option value="All">All</option>
              {partiesList.map(function(p, idx) {
                const pname = p.party_name || p.PName || '';
                return <option key={p.pno || p.id || idx} value={pname}>{pname}</option>;
              })}
            </select>
          </span>

          <span>Type: 
            <select
              id="history-type-f10"
              value={historyType}
              onChange={function(e) { setHistoryType(e.target.value); }}
              style={{ fontSize: '11px', border: '1px solid #7f9db9', fontWeight: 'bold', marginLeft: '3px' }}
            >
              <option value="All">All</option>
              <option value="Receipt/Liye">Receipt/Liye</option>
              <option value="Payment/Diye">Payment/Diye</option>
            </select>
          </span>

          <span>From: 
            <input
              type="text"
              value={fromDate}
              onChange={handleFromDateChange}
              style={{ width: '70px', fontSize: '11px', border: '1px solid #7f9db9', fontWeight: 'bold', textAlign: 'center', marginLeft: '3px' }}
            />
          </span>

          <span>To: 
            <input
              type="text"
              value={toDate}
              onChange={handleToDateChange}
              style={{ width: '70px', fontSize: '11px', border: '1px solid #7f9db9', fontWeight: 'bold', textAlign: 'center', marginLeft: '3px' }}
            />
          </span>

          <button
            onClick={fetchHistory}
            style={{ padding: '3px 12px', cursor: 'pointer', background: '#ece9d8', border: '1px solid #777', fontWeight: 'bold', color: '#0000aa', fontSize: '11px' }}
          >
            Show
          </button>
        </div>

        {/* History Table Container */}
        <div style={{ flex: 1, background: '#5478a0', border: '1px solid #777', minHeight: '250px', marginBottom: '8px', overflowY: 'auto' }}>
          <table border="1" cellPadding="4" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '11px', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#d8dee8', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                <th>Date</th>
                <th style={{ textAlign: 'left' }}>Party</th>
                <th style={{ textAlign: 'left' }}>Opposite Party</th>
                <th>Amount</th>
                <th>Type</th>
                <th style={{ textAlign: 'left' }}>Narration</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length > 0 ? (
                historyRows.map(function(r, idx) {
                  const isSelected = selectedAccId === r.acc_id;
                  return (
                    <tr
                      key={r.acc_id || idx}
                      onClick={function() { handleSelectRow(r); }}
                      style={{
                        background: isSelected ? '#0a246a' : (idx % 2 === 0 ? '#ffffff' : '#f4f4f4'),
                        color: isSelected ? '#ffffff' : '#000000',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>{r.date_val}</td>
                      <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{r.party_name}</td>
                      <td style={{ textAlign: 'left' }}>{r.opposite_party || '-'}</td>
                      <td><strong>{r.amount}</strong></td>
                      <td style={{ textAlign: 'center', color: isSelected ? '#fff' : (r.type === 'Receipt/Liye' ? 'blue' : 'red'), fontWeight: 'bold' }}>{r.type}</td>
                      <td style={{ textAlign: 'left' }}>{r.narration || ''}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#fff', padding: '30px', background: '#5478a0', fontWeight: 'bold' }}>
                    Click <strong>Show</strong> to view History records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px 12px', border: '1px solid #aaa', fontWeight: 'bold', fontSize: '12px' }}>
          <div>Total Diye: <strong style={{ color: 'red', fontSize: '13px' }}>{totals.totalDiye}</strong></div>
          <div>Total Liye: <strong style={{ color: 'blue', fontSize: '13px' }}>{totals.totalLiye}</strong></div>
          <button
            onClick={function() { window.print(); }}
            style={{ padding: '3px 18px', cursor: 'pointer', fontWeight: 'bold', background: '#ece9d8', border: '1px solid #777', fontSize: '11px' }}
          >
            Print
          </button>
        </div>

        <div style={{ marginTop: '8px', fontSize: '10px', color: '#333', fontWeight: 'bold' }}>
          <strong>Ctrl+T</strong> - Focus Type For History
        </div>
      </div>

    </div>
  );
}