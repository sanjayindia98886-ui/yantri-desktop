import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ResultF6() {
  const getTodayDateStr = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const [resultDate, setResultDate] = useState(getTodayDateStr());
  const [selectedGame, setSelectedGame] = useState('GB');
  const [gameList, setGameList] = useState([]);
  const [resultVal, setResultVal] = useState('');

  const [fromDate, setFromDate] = useState(getTodayDateStr());
  const [toDate, setToDate] = useState(getTodayDateStr());

  const [resultHistory, setResultHistory] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [selectedResultId, setSelectedResultId] = useState(null);

  // Helper to restore focus back to Result Input
  const restoreFocus = function() {
    window.focus();
    setTimeout(function() {
      document.getElementById('f6ResultValInput')?.focus();
    }, 50);
  };

  useEffect(() => {
    fetchGames();
    fetchResultHistory();
  }, []);

  useEffect(() => {
    if (gameList.length > 0) {
      fetchPendingResults();
    }
  }, [resultDate, gameList, resultHistory]);

  const fetchGames = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/games');
      if (res.data && res.data.success && Array.isArray(res.data.games)) {
        setGameList(res.data.games);
        if (res.data.games.length > 0) {
          setSelectedGame(res.data.games[0].game_name);
        }
      }
    } catch (err) {
      console.error('Error fetching games in F6:', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = function(e) {
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        submitResultLogic();
      }
      if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        fetchResultHistory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return function() {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resultDate, selectedGame, resultVal, fromDate, toDate]);

  const fetchResultHistory = async function() {
    try {
      const url = 'https://yantri-desktop.onrender.com/api/results/history?fromDate=' + fromDate + '&toDate=' + toDate;
      const res = await axios.get(url);
      if (res.data) {
        setResultHistory(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Error fetching result history:', err);
    }
  };

  const fetchPendingResults = async function() {
    try {
      const url = 'https://yantri-desktop.onrender.com/api/results/pending?date=' + resultDate;
      const res = await axios.get(url);
      if (res.data && Array.isArray(res.data)) {
        setPendingList(res.data);
      }
    } catch (err) {
      console.error('Error fetching pending results:', err);
      const historyForDate = resultHistory.filter(function(h) { 
        return String(h.date || h.result_date).trim() === String(resultDate).trim(); 
      });

      const declaredMap = {};
      historyForDate.forEach(function(h) {
        const gName = String(h.shift || h.game_name || '').trim().toUpperCase();
        declaredMap[gName] = String(h.result || h.result_val || '').padStart(2, '0');
      });

      const fallbackList = gameList.map(function(g) {
        const gName = String(g.game_name || g).trim().toUpperCase();
        const isDeclared = declaredMap.hasOwnProperty(gName);
        return {
          shift: gName,
          status: isDeclared ? 'Clear' : 'Pending',
          isDeclared: isDeclared,
          winningNumber: isDeclared ? declaredMap[gName] : null
        };
      });

      setPendingList(fallbackList);
    }
  };

  const submitResultLogic = async function() {
    if (!resultVal) {
      alert('Enter result number!');
      restoreFocus();
      return;
    }

    try {
      await axios.post('https://yantri-desktop.onrender.com/api/results/submit', {
        date: resultDate,
        shift: selectedGame,
        result_val: resultVal
      });

      setResultVal('');
      setSelectedResultId(null);
      fetchResultHistory();
      restoreFocus();
    } catch (err) {
      const serverErrMsg = err.response && err.response.data && (err.response.data.error || err.response.data.message);
      alert('Error: ' + (serverErrMsg || err.message));
      restoreFocus();
    }
  };

  const handleSubmitResult = function(e) {
    e.preventDefault();
    submitResultLogic();
  };

  const handleDeleteResult = async function() {
    try {
      if (selectedResultId) {
        await axios.delete('https://yantri-desktop.onrender.com/api/results/delete/' + selectedResultId);
      } else {
        const url = 'https://yantri-desktop.onrender.com/api/results/delete/by-game?date=' + encodeURIComponent(resultDate) + '&game=' + encodeURIComponent(selectedGame);
        await axios.delete(url);
      }
      setSelectedResultId(null);
      setResultVal('');
      fetchResultHistory();
      restoreFocus();
    } catch (err) {
      alert('Error deleting result!');
      restoreFocus();
    }
  };

  const handleSelectHistoryRow = function(row, rowId) {
    setSelectedResultId(rowId);
    if (row.date) setResultDate(row.date);
    if (row.shift) setSelectedGame(row.shift);
    if (row.result || row.result_val) setResultVal(row.result || row.result_val);
  };

  const panelBoxStyle = {
    border: '1px solid #7a96df',
    background: '#e0e8f8',
    padding: '10px',
    borderRadius: '2px'
  };

  return (
    <div style={{ padding: '10px', background: '#dcdcdc', minHeight: '93vh', fontSize: '11px', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', display: 'flex', gap: '10px' }}>
      
      {/* Left Box: Result Entry Form */}
      <div style={{ width: '220px', ...panelBoxStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ textAlign: 'center', margin: '0 0 15px 0', fontSize: '14px', color: '#000', fontWeight: 'bold' }}>Result</h3>
          
          <form onSubmit={handleSubmitResult}>
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontWeight: 'bold' }}>Date: </label>
              <input type="text" value={resultDate} onChange={(e) => setResultDate(e.target.value)} style={{ width: '100px', padding: '2px 4px', fontWeight: 'bold', textAlign: 'center' }} />
            </div>

            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontWeight: 'bold' }}>Game: </label>
              <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} style={{ width: '108px', padding: '1px', fontWeight: 'bold' }}>
                {gameList.length > 0 ? (
                  gameList.map(function(g) {
                    const gName = g.game_name || g;
                    return <option key={g.game_id || gName} value={gName}>{gName}</option>;
                  })
                ) : (
                  <option value="GB">GB</option>
                )}
              </select>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontWeight: 'bold' }}>Result: </label>
              <input 
                id="f6ResultValInput"
                type="text" 
                value={resultVal} 
                onChange={(e) => setResultVal(e.target.value)} 
                autoFocus
                style={{ width: '100px', padding: '2px 4px', fontWeight: 'bold' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              <button type="submit" style={{ padding: '3px 14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Submit</button>
              <button type="button" onClick={handleDeleteResult} style={{ padding: '3px 10px', cursor: 'pointer', fontWeight: 'bold', background: '#600000', color: '#fff', border: '1px solid #300000', fontSize: '11px' }}>Delete</button>
            </div>
          </form>
        </div>

        <div style={{ marginTop: '20px', fontSize: '11px', color: '#800000', fontWeight: 'bold' }}>
          Ctrl+S : Submit Result
        </div>
      </div>

      {/* Middle Box: Result History */}
      <div style={{ flex: 1, ...panelBoxStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '15px', color: '#000', fontWeight: 'bold' }}>Result History</h3>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', marginBottom: '10px', fontWeight: 'bold' }}>
            <span>From: <input type="text" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '85px', padding: '2px 4px', fontWeight: 'bold', textAlign: 'center' }} /></span>
            <span>To: <input type="text" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '85px', padding: '2px 4px', fontWeight: 'bold', textAlign: 'center' }} /></span>
            <button onClick={fetchResultHistory} style={{ padding: '2px 14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Show</button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #7f9db9', height: '320px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#ece9d8', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
                  <th style={{ padding: '4px 8px', borderRight: '1px solid #ccc' }}>Date</th>
                  <th style={{ padding: '4px 8px', borderRight: '1px solid #ccc' }}>Shift</th>
                  <th style={{ padding: '4px 8px' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {resultHistory.length > 0 ? (
                  resultHistory.map(function(row, idx) {
                    const rowId = row.result_id || row.id || idx;
                    const isSelected = selectedResultId === rowId;
                    return (
                      <tr 
                        key={rowId} 
                        onClick={() => handleSelectHistoryRow(row, rowId)}
                        style={{ 
                          background: isSelected ? '#004080' : (idx % 2 === 0 ? '#fff' : '#f9f9f9'), 
                          color: isSelected ? '#fff' : '#000',
                          cursor: 'pointer',
                          fontWeight: 'bold' 
                        }}
                      >
                        <td style={{ padding: '3px 8px', borderRight: '1px solid #eee' }}>{row.date}</td>
                        <td style={{ padding: '3px 8px', borderRight: '1px solid #eee' }}>{row.shift}</td>
                        <td style={{ padding: '3px 8px' }}><strong>{row.result_val || row.result}</strong></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '15px', color: '#777', fontWeight: 'bold' }}>
                      No result history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '11px', color: '#800000', fontWeight: 'bold' }}>
          Ctrl+K : Result History
        </div>
      </div>

      {/* Right Box: Pending Result Panel */}
      <div style={{ width: '280px', border: '1px solid #7a96df', background: '#e0e8f8', padding: '0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#111', color: '#fff', textAlign: 'center', padding: '6px', fontWeight: 'bold', fontSize: '12px' }}>
          Pending Result
        </div>
        <div style={{ flex: 1, padding: '8px', background: '#6c7a89', overflowY: 'auto', minHeight: '340px' }}>
          {pendingList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pendingList.map(function(item, idx) {
                const isClear = item.status === 'Clear' || item.isDeclared;
                return (
                  <div key={idx} style={{ background: '#2c3e50', color: '#fff', padding: '6px 10px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{item.shift}</span>
                    {isClear ? (
                      <span style={{ fontSize: '11px', color: '#5cdb95', fontWeight: 'bold' }}>
                        Clear ✔️ ({item.winningNumber || item.result || ''})
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#ff9999', fontWeight: 'bold' }}>
                        Pending
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: '#e0e0e0', textAlign: 'center', marginTop: '30px', fontSize: '11px', fontWeight: 'bold' }}>
              No Games Found
            </div>
          )}
        </div>
      </div>

    </div>
  );
}