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

  // 2. History Filter State
  const [historyParty, setHistoryParty] = useState('All');
  const [historyType, setHistoryType] = useState('All');
  const [fromDate, setFromDate] = useState(function() {
    return localStorage.getItem('f10_from_date') || getTodayDateStr();
  });
  const [toDate, setToDate] = useState(function() {
    return localStorage.getItem('f10_to_date') || getTodayDateStr();
  });

  // 3. Data Lists & Totals
  const [partiesList, setPartiesList] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [totals, setTotals] = useState({ totalDiye: 0, totalLiye: 0 });

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

  // Fetch F1 Parties Master dynamically
  useEffect(function() {
    fetchParties();
  }, []);

  const fetchParties = function() {
    fetch('http://localhost:5000/api/parties')
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
    const url = 'http://localhost:5000/api/accounts?party=' + encodeURIComponent(historyParty) +
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
          alert('Error: ' + (data.error || 'Failed to load history'));
        }
      })
      .catch(function(err) {
        console.error('Fetch history error:', err);
        alert('Server Connection Error!');
      });
  };

  // Reset Input Form
  const resetForm = function() {
    setAmount('');
    setNarration('');
    setOppositeParty('');
    setSelectedAccId(null);
  };

  // Save or Update Entry (Rule: Party = Payment/Diye)
  const handleSave = function(e) {
    if (e) e.preventDefault();
    if (!party) {
      alert('Please select Party (जिसको पैसे दिए)!');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('Please enter valid Amount!');
      return;
    }

    const payload = {
      acc_id: selectedAccId,
      party_name: party,
      opposite_party: oppositeParty,
      date_val: entryDate,
      amount: Number(amount),
      type: 'Payment/Diye', // Fixed logic
      narration: narration
    };

    fetch('http://localhost:5000/api/accounts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert(selectedAccId ? 'Transaction Updated Successfully!' : 'Transaction Saved Successfully!');
          resetForm();
          fetchHistory();
        } else {
          alert('Error: ' + (data.error || 'Failed to save transaction'));
        }
      })
      .catch(function(err) {
        console.error('Save error:', err);
        alert('Server Connection Error!');
      });
  };

  // Delete Entry
  const handleDelete = function() {
    if (!selectedAccId) {
      alert('Please select an entry from History grid to delete!');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    fetch('http://localhost:5000/api/accounts/delete/' + selectedAccId, {
      method: 'DELETE'
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert('Transaction Deleted Successfully!');
          resetForm();
          fetchHistory();
        } else {
          alert('Error: ' + (data.error || 'Failed to delete transaction'));
        }
      })
      .catch(function(err) {
        console.error('Delete error:', err);
        alert('Server Connection Error!');
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
    <div style={{ padding: '10px', background: '#dcdcdc', minHeight: '92vh', fontSize: '11px', display: 'flex', gap: '15px', fontFamily: 'Tahoma, Arial, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Left Section: Accounts Entry Form */}
      <div style={{ width: '38%', border: '1px solid #7a96df', background: '#ece9d8', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 15px 0', fontSize: '13px' }}>Accounts</h3>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>Party (जिसको पैसे दिए):</label>
            <select
              id="party-select-f10"
              value={party}
              onChange={function(e) { setParty(e.target.value); }}
              style={{ width: '100%', padding: '2px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
            >
              <option value="">-- Select Party --</option>
              {partiesList.map(function(p, idx) {
                const pname = p.party_name || p.PName || '';
                return <option key={p.pno || p.id || idx} value={pname}>{pname}</option>;
              })}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px' }}>Opposite Party (किसने पैसे दिए):</label>
            <select
              value={oppositeParty}
              onChange={function(e) { setOppositeParty(e.target.value); }}
              style={{ width: '100%', padding: '2px', border: '1px solid #7f9db9' }}
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
            <label style={{ width: '60px' }}>Date: </label>
            <input
              type="text"
              value={entryDate}
              onChange={handleEntryDateChange}
              style={{ width: '110px', padding: '2px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '60px' }}>Amount: </label>
            <input
              type="text"
              value={amount}
              onChange={function(e) { setAmount(e.target.value); }}
              style={{ width: '130px', padding: '2px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '60px' }}>Type: </label>
            <span style={{ padding: '2px 8px', background: '#fff', border: '1px solid #7f9db9', fontWeight: 'bold', color: '#800000' }}>
              Payment / Diye
            </span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '2px' }}>Narration:</label>
            <input
              type="text"
              value={narration}
              onChange={function(e) { setNarration(e.target.value); }}
              style={{ width: '100%', padding: '2px', border: '1px solid #7f9db9' }}
              placeholder="Cash / Bank / Rokad Details..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{ padding: '4px 20px', cursor: 'pointer', background: '#ece9d8', border: '2px solid #7a96df', fontWeight: 'bold' }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleDelete}
              style={{ padding: '4px 20px', background: '#800000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Delete
            </button>
          </div>
        </form>

        <div style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '10px', color: '#555' }}>
          <strong>Ctrl+P</strong> - Focus Party For Entry
        </div>
      </div>

      {/* Right Section: Transaction History Grid */}
      <div style={{ width: '62%', border: '1px solid #7a96df', background: '#ece9d8', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', fontSize: '13px' }}>History</h3>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '10px' }}>
          <span>Party: 
            <select
              value={historyParty}
              onChange={function(e) { setHistoryParty(e.target.value); }}
              style={{ fontSize: '10px', border: '1px solid #7f9db9' }}
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
              style={{ fontSize: '10px', border: '1px solid #7f9db9' }}
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
              style={{ width: '70px', fontSize: '10px', border: '1px solid #7f9db9' }}
            />
          </span>

          <span>To: 
            <input
              type="text"
              value={toDate}
              onChange={handleToDateChange}
              style={{ width: '70px', fontSize: '10px', border: '1px solid #7f9db9' }}
            />
          </span>

          <button
            onClick={fetchHistory}
            style={{ padding: '2px 10px', cursor: 'pointer', background: '#ece9d8', border: '1px solid #777', fontWeight: 'bold', color: '#0000aa' }}
          >
            Show
          </button>
        </div>

        {/* History Table Container */}
        <div style={{ flex: 1, background: '#5478a0', border: '1px solid #777', minHeight: '250px', marginBottom: '8px', overflowY: 'auto' }}>
          <table border="1" cellPadding="3" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '10px', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#ece9d8', textAlign: 'center' }}>
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
                      <td style={{ textAlign: 'left' }}>{r.party_name}</td>
                      <td style={{ textAlign: 'left' }}>{r.opposite_party || '-'}</td>
                      <td>{r.amount}</td>
                      <td style={{ textAlign: 'center', color: isSelected ? '#fff' : (r.type === 'Receipt/Liye' ? 'blue' : 'red') }}>{r.type}</td>
                      <td style={{ textAlign: 'left' }}>{r.narration || ''}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#fff', padding: '30px', background: '#5478a0' }}>
                    Click <strong>Show</strong> to view History records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px', border: '1px solid #aaa' }}>
          <div>Total Diye: <strong style={{ color: 'red' }}>{totals.totalDiye}</strong></div>
          <div>Total Liye: <strong style={{ color: 'blue' }}>{totals.totalLiye}</strong></div>
          <button
            onClick={function() { window.print(); }}
            style={{ padding: '2px 15px', cursor: 'pointer', fontWeight: 'bold', background: '#ece9d8', border: '1px solid #777' }}
          >
            Print
          </button>
        </div>

        <div style={{ marginTop: '8px', fontSize: '10px', color: '#555' }}>
          <strong>Ctrl+T</strong> - Focus Type For History
        </div>
      </div>

    </div>
  );
}