import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { usePermission } from '../context/PermissionContext';

export default function YantriF4() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = usePermission();

  const getTodayFormattedDate = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const initialDate = (location.state && location.state.date) ? location.state.date : getTodayFormattedDate();
  const initialGame = (location.state && location.state.game) ? location.state.game : '';
  const initialParty = (location.state && location.state.party) ? location.state.party : '-- ALL PARTIES --';

  const [date, setDate] = useState(initialDate);
  const [game, setGame] = useState(initialGame);
  const [gameList, setGameList] = useState([]);
  const [party, setParty] = useState(initialParty);
  const [partyList, setPartyList] = useState([]);
  const [yantriType, setYantriType] = useState('Actual Yantri');
  
  const [userFilter, setUserFilter] = useState('ALL');
  const [userList, setUserList] = useState([]);

  const [gridData, setGridData] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);

  const [roundOff, setRoundOff] = useState('0');
  const [symbol, setSymbol] = useState('=');
  const [cuttingMode, setCuttingMode] = useState('Decrease');
  const [cuttingAmt, setCuttingAmt] = useState('0');
  const [cuttingPercentage, setCuttingPercentage] = useState('0');
  const [adjN, setAdjN] = useState('0');
  const [adjA, setAdjA] = useState('0');

  const [multiplyN, setMultiplyN] = useState('0');
  const [multiplyA, setMultiplyA] = useState('0');

  const [highColorAmt, setHighColorAmt] = useState('0');
  const [isFindActive, setIsFindActive] = useState(false);

  const [highAmtVal, setHighAmtVal] = useState('0');
  const [highAmtClient, setHighAmtClient] = useState('');

  const [outputText, setOutputText] = useState('');

  const [isProfitLossOpen, setIsProfitLossOpen] = useState(false);

  // Helper to restore focus back to Date input
  const restoreFocus = function() {
    window.focus();
    setTimeout(function() {
      document.getElementById('f4DateInput')?.focus();
    }, 50);
  };

  useEffect(function() {
    fetchGames();
    fetchParties();
    if (user && user.role === 'super_admin') {
      fetchUsersList();
    }
  }, [user]);

  useEffect(function() {
  }, []);

  const fetchUsersList = function() {
    fetch('https://yantri-desktop.onrender.com/api/access/users')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (Array.isArray(data)) {
          setUserList(data);
        }
      })
      .catch(function(err) { console.error('Error fetching users in F4:', err); });
  };

  const fetchGames = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/games');
      if (res.data && res.data.success && Array.isArray(res.data.games)) {
        setGameList(res.data.games);
        
        if (!initialGame && res.data.games.length > 0) {
          const firstGName = res.data.games[0].game_name || res.data.games[0];
          setGame(firstGName);
        } else if (initialGame) {
          setGame(initialGame);
        }
      }
    } catch (err) {
      console.error('Error fetching games in F4:', err);
    }
  };

  const fetchParties = function() {
    fetch('https://yantri-desktop.onrender.com/api/parties')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (Array.isArray(data)) {
          setPartyList(data);
        }
      })
      .catch(function(err) { console.error('Error fetching parties:', err); });
  };

  const fetchYantriData = function() {
    if (!game || !date) return;

    const currentUserId = (user && user.id) ? user.id : '1';
    const currentUserRole = (user && user.role) ? user.role : 'user';

    const url = 'https://yantri-desktop.onrender.com/api/yantri/grid?date=' + encodeURIComponent(date) + 
      '&game=' + encodeURIComponent(game) + 
      '&party=' + encodeURIComponent(party) + 
      '&type=' + encodeURIComponent(yantriType) +
      '&userId=' + encodeURIComponent(currentUserId) +
      '&userRole=' + encodeURIComponent(currentUserRole) +
      '&filterUserId=' + encodeURIComponent(userFilter);

    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.gridData) {
          setGridData(data.gridData);
          setGrandTotal(data.grandTotal || 0);
        } else {
          setGridData({});
          setGrandTotal(0);
        }
        restoreFocus();
      })
      .catch(function(err) { 
        console.error('Error fetching yantri grid:', err); 
        restoreFocus();
      });
  };

  const formatNumStr = function(num) {
    if (num === 100) return '00';
    return num < 10 ? '0' + num : '' + num;
  };

  const getRowTotal = function(rowIndex) {
    let sum = 0;
    for (let c = 0; c < 10; c++) {
      const num = rowIndex * 10 + c + 1;
      const numStr = formatNumStr(num);
      sum += Number(gridData[num] || gridData[numStr] || 0);
    }
    return sum;
  };

  const getColTotal = function(colIndex) {
    let sum = 0;
    for (let r = 0; r < 10; r++) {
      const num = r * 10 + colIndex + 1;
      const numStr = formatNumStr(num);
      sum += Number(gridData[num] || gridData[numStr] || 0);
    }
    return sum;
  };

  const getBaharTotal = function() {
    let sum = 0;
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function(val) {
      sum += Number(gridData['B' + val] || 0);
    });
    return sum;
  };

  const getAnderTotal = function() {
    let sum = 0;
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function(val) {
      sum += Number(gridData['A' + val] || 0);
    });
    return sum;
  };

  const handleShiftAToD = function() {
    const updatedGrid = { ...gridData };

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function(val) {
      const bKey = 'B' + val;
      const totalBAmt = Number(updatedGrid[bKey] || 0);
      if (totalBAmt > 0) {
        const perHouse = Math.floor(totalBAmt / 10);
        for (let r = 0; r < 10; r++) {
          const targetNum = r * 10 + (val === 0 ? 10 : val);
          const numStr = formatNumStr(targetNum);
          updatedGrid[numStr] = (Number(updatedGrid[numStr] || 0) + perHouse);
        }
        updatedGrid[bKey] = 0;
      }
    });

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function(val) {
      const aKey = 'A' + val;
      const totalAAmt = Number(updatedGrid[aKey] || 0);
      if (totalAAmt > 0) {
        const perHouse = Math.floor(totalAAmt / 10);
        const startNum = val === 0 ? 91 : (val - 1) * 10 + 1;
        for (let i = 0; i < 10; i++) {
          const targetNum = startNum + i;
          const numStr = formatNumStr(targetNum);
          updatedGrid[numStr] = (Number(updatedGrid[numStr] || 0) + perHouse);
        }
        updatedGrid[aKey] = 0;
      }
    });

    setGridData(updatedGrid);
  };

  const handleCalculateCutting = function() {
    const limit = Number(cuttingAmt || adjN || 0);
    if (limit <= 0) return;

    const cutList = [];
    const utarGridDisplay = {};
    let rOff = Number(roundOff) || 1;
    let utarGrandTotal = 0;

    for (let i = 1; i <= 100; i++) {
      const numStr = formatNumStr(i);
      const currentAmt = Number(gridData[i] || gridData[numStr] || 0);

      if (cuttingMode === 'Decrease') {
        if (currentAmt > limit) {
          let excess = currentAmt - limit;
          if (rOff > 1) {
            excess = Math.round(excess / rOff) * rOff;
          }
          if (excess > 0) {
            cutList.push(numStr + symbol + excess);
            utarGridDisplay[numStr] = excess;
            utarGrandTotal += excess;
          } else {
            utarGridDisplay[numStr] = 0;
          }
        } else {
          utarGridDisplay[numStr] = 0;
        }
      } else if (cuttingMode === 'Increase') {
        if (currentAmt >= limit) {
          utarGridDisplay[numStr] = currentAmt;
          cutList.push(numStr + symbol + currentAmt);
          utarGrandTotal += currentAmt;
        } else {
          utarGridDisplay[numStr] = 0;
        }
      }
    }

    setGridData(utarGridDisplay);
    setGrandTotal(utarGrandTotal);
    setOutputText(cutList.join('\n'));
  };

  const handleApplyMultiply = function() {
    const multN = Number(multiplyN) || 1;
    const multA = Number(multiplyA) || 1;

    if (multN === 1 && multA === 1) return;

    const updatedGrid = { ...gridData };

    for (let i = 1; i <= 100; i++) {
      const numStr = formatNumStr(i);
      if (updatedGrid[i]) updatedGrid[i] = Number(updatedGrid[i]) * multN;
      if (updatedGrid[numStr]) updatedGrid[numStr] = Number(updatedGrid[numStr]) * multN;
    }

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function(val) {
      if (updatedGrid['B' + val]) updatedGrid['B' + val] = Number(updatedGrid['B' + val]) * multA;
      if (updatedGrid['A' + val]) updatedGrid['A' + val] = Number(updatedGrid['A' + val]) * multA;
    });

    setGridData(updatedGrid);
  };

  const handleAdjustNegative = function() {
    const updatedGrid = { ...gridData };
    let newTotal = 0;

    Object.keys(updatedGrid).forEach(function(key) {
      if (Number(updatedGrid[key]) < 0) {
        updatedGrid[key] = 0;
      }
      newTotal += Number(updatedGrid[key] || 0);
    });

    setGridData(updatedGrid);
    setGrandTotal(newTotal);
  };

  const handleFindHighAmtClient = function() {
    const targetAmt = Number(highAmtVal);
    if (!targetAmt) return;

    const url = 'https://yantri-desktop.onrender.com/api/yantri/trace-client?date=' + encodeURIComponent(date) + 
      '&game=' + encodeURIComponent(game) + 
      '&amt=' + encodeURIComponent(targetAmt);

    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.party_name) {
          setHighAmtClient(data.party_name);
        } else {
          setHighAmtClient('Party Not Found');
        }
      })
      .catch(function() { setHighAmtClient('Party A/c Found'); });
  };

  const handleCopyToVerticalAndSendF3 = function() {
    if (!outputText || outputText.trim() === '') return;

    const lines = outputText.split('\n').filter(function(l) { return l.trim() !== ''; });
    const importedItems = [];

    lines.forEach(function(line) {
      const parts = line.split(symbol);
      if (parts.length === 2) {
        importedItems.push({
          no: parts[0].trim(),
          amount: parts[1].trim()
        });
      }
    });

    if (importedItems.length > 0) {
      navigate('/voucher-yantri', {
        state: {
          importedItems: importedItems,
          date: date,
          game: game,
          party: party
        }
      });
    }
  };

  const handleCopyText = function() {
    if (outputText) {
      navigator.clipboard.writeText(outputText);
    }
  };

  const handleFindToggle = function() {
    setIsFindActive(!isFindActive);
  };

  const getProfitLossList = function() {
    const list = [];
    let maxVal = { no: '-', amt: 0 };
    let minVal = { no: '-', amt: Infinity };

    for (let i = 1; i <= 100; i++) {
      const numStr = formatNumStr(i);
      const amt = Number(gridData[i] || gridData[numStr] || 0);

      if (amt > maxVal.amt) {
        maxVal = { no: numStr, amt: amt };
      }
      if (amt > 0 && amt < minVal.amt) {
        minVal = { no: numStr, amt: amt };
      }

      const winLossAmt = grandTotal - (amt * 90);
      list.push({ number: numStr, amt: amt, winLossAmt: winLossAmt });
    }

    if (minVal.amt === Infinity) minVal = { no: '-', amt: 0 };
    list.sort(function(a, b) { return a.winLossAmt - b.winLossAmt; });

    return { list: list, maxVal: maxVal, minVal: minVal };
  };

  const profitLossData = getProfitLossList();
  const profitLossList = profitLossData.list;
  const maxVal = profitLossData.maxVal;
  const minVal = profitLossData.minVal;

  return (
    <div style={{ padding: '4px', background: '#d4d0c8', height: '88vh', maxHeight: '88vh', fontSize: '11px', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
      
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', gap: '6px', background: '#d4d0c8', padding: '3px 6px', border: '1px solid #808080', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>Date: </span>
          <input 
            id="f4DateInput"
            type="text" 
            value={date} 
            onChange={function(e) { setDate(e.target.value); }} 
            autoFocus
            style={{ width: '75px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px 3px', background: '#fff', textAlign: 'center' }} 
          />
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>Game: </span>
          <select value={game} onChange={function(e) { setGame(e.target.value); }} style={{ fontSize: '11px', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px', background: '#fff' }}>
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

        <div>
          <span style={{ fontWeight: 'bold' }}>Select Party: </span>
          <select value={party} onChange={function(e) { setParty(e.target.value); }} style={{ width: '130px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px', background: '#fff' }}>
            <option value="-- ALL PARTIES --">-- ALL PARTIES --</option>
            {partyList.map(function(p) {
              return <option key={p.pno || p.id} value={p.party_name}>{p.party_name}</option>;
            })}
          </select>
        </div>

        {/* Type Fieldset */}
        <fieldset style={{ border: '1px solid #808080', padding: '1px 4px', margin: 0, display: 'flex', gap: '4px', alignItems: 'center' }}>
          <legend style={{ fontSize: '10px', fontWeight: 'bold' }}>Type (Insert)</legend>
          <label style={{ cursor: 'pointer', fontWeight: 'bold' }}><input type="radio" name="yt" checked={yantriType === 'Actual Yantri'} onChange={function() { setYantriType('Actual Yantri'); }} /> Actual Yantri</label>
          <label style={{ cursor: 'pointer', fontWeight: 'bold' }}><input type="radio" name="yt" checked={yantriType === 'Daily Collection'} onChange={function() { setYantriType('Daily Collection'); }} /> Daily Collection</label>
          <label style={{ cursor: 'pointer', fontWeight: 'bold' }}><input type="radio" name="yt" checked={yantriType === 'Agent'} onChange={function() { setYantriType('Agent'); }} /> Agent</label>
          <label style={{ cursor: 'pointer', fontWeight: 'bold' }}><input type="radio" name="yt" checked={yantriType === 'Patti'} onChange={function() { setYantriType('Patti'); }} /> Patti</label>
        </fieldset>

        {/* SHOW BUTTON */}
        <button onClick={fetchYantriData} style={{ padding: '2px 10px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontWeight: 'bold', boxShadow: '1px 1px 1px #808080' }}>
          Show
        </button>

        {/* User Filter Controls & Min/Max Box */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <fieldset style={{ border: '1px solid #808080', padding: '1px 4px', margin: 0 }}>
            <legend style={{ fontSize: '10px', fontWeight: 'bold' }}>USER FILTER</legend>
            {(user && user.role === 'super_admin') ? (
              <select 
                value={userFilter} 
                onChange={function(e) { setUserFilter(e.target.value); }}
                style={{ fontSize: '11px', fontWeight: 'bold', padding: '1px', border: '1px solid #7f9db9' }}
              >
                <option value="ALL">-- ALL USERS --</option>
                {userList.map(function(u) {
                  return <option key={u.id} value={u.id}>{u.username}</option>;
                })}
              </select>
            ) : (
              <span style={{ fontWeight: 'bold', color: '#004080' }}>
                {(user && user.username) ? user.username : 'Current User'}
              </span>
            )}
          </fieldset>

          {/* Min/Max Header Box */}
          <div style={{ border: '1px solid #808080', padding: '1px 4px', background: '#fff', fontSize: '10px', fontWeight: 'bold', minWidth: '85px' }}>
            <div style={{ textDecoration: 'underline', textAlign: 'center' }}>Min/Max</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Min</span>
              <span style={{ color: '#0000aa' }}>{minVal.no} ({minVal.amt})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Max</span>
              <span style={{ color: '#cc0000' }}>{maxVal.no} ({maxVal.amt})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: 'flex', gap: '4px', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Section: Grid & Cutting Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          
          {/* 10x10 Grid */}
          <div style={{ background: '#d4d0c8', padding: '2px', border: '1px solid #808080' }}>
            <table border="1" cellPadding="1" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', borderColor: '#808080' }}>
              <tbody>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function(row) {
                  const rowSum = getRowTotal(row);
                  return (
                    <tr key={row} style={{ height: '22px' }}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function(col) {
                        const numVal = row * 10 + col + 1;
                        const numStr = formatNumStr(numVal);
                        const liveAmt = Number(gridData[numVal] || gridData[numStr] || 0);

                        const targetHighAmt = Number(highColorAmt) || 0;
                        const isHighlighted = isFindActive && liveAmt >= targetHighAmt && liveAmt > 0;

                        return (
                          <td
                            key={numVal}
                            style={{
                              border: '1px solid #808080',
                              width: '9%',
                              background: isHighlighted ? '#ffff99' : '#ffffff',
                              padding: '1px'
                            }}
                          >
                            <div style={{ color: '#cc0000', fontWeight: 'bold', fontSize: '10px', textAlign: 'left' }}>{numStr}</div>
                            <div style={{ fontSize: '12px', color: liveAmt > 0 ? '#000000' : '#404040', fontWeight: 'bold', textAlign: 'center' }}>
                              {liveAmt > 0 ? liveAmt : '0'}
                            </div>
                          </td>
                        );
                      })}
                      
                      {/* Row Total */}
                      <td style={{ width: '10%', border: '1px solid #808080', background: '#d4d0c8', fontWeight: 'bold', color: '#000000', fontSize: '12px' }}>
                        {rowSum}
                      </td>
                    </tr>
                  );
                })}

                {/* Column Totals Row */}
                <tr style={{ background: '#d4d0c8', height: '20px', fontWeight: 'bold' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function(col) {
                    return (
                      <td key={col} style={{ border: '1px solid #808080', color: '#000000', fontSize: '12px' }}>
                        {getColTotal(col)}
                      </td>
                    );
                  })}
                  <td style={{ border: '1px solid #808080', color: '#cc0000', background: '#d4d0c8', fontSize: '12px' }}>
                    {grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Harufs Rows (B & A) */}
            <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              
              {/* Row B (Bahar) */}
              <div style={{ display: 'flex', background: '#d4d0c8', border: '1px solid #808080', fontSize: '11px', alignItems: 'center' }}>
                <span style={{ width: '25px', fontWeight: 'bold', textAlign: 'center', color: '#000' }}>B</span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(function(val) {
                  const bKey = 'B' + val;
                  const bAmt = Number(gridData[bKey] || 0);
                  return (
                    <div key={bKey} style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #808080', padding: '1px 0', background: '#fff' }}>
                      <div style={{ color: '#000', fontWeight: 'bold', fontSize: '10px' }}>B{val}</div>
                      <div style={{ color: '#000', fontWeight: 'bold', fontSize: '11px' }}>
                        {bAmt}
                      </div>
                    </div>
                  );
                })}
                <div style={{ width: '60px', textAlign: 'center', borderLeft: '1px solid #808080', fontWeight: 'bold', color: '#000', background: '#d4d0c8', fontSize: '12px' }}>
                  {getBaharTotal()}
                </div>
              </div>

              {/* Row A (Ander) */}
              <div style={{ display: 'flex', background: '#d4d0c8', border: '1px solid #808080', fontSize: '11px', alignItems: 'center' }}>
                <span style={{ width: '25px', fontWeight: 'bold', textAlign: 'center', color: '#000' }}>A</span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(function(val) {
                  const aKey = 'A' + val;
                  const aAmt = Number(gridData[aKey] || 0);
                  return (
                    <div key={aKey} style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #808080', padding: '1px 0', background: '#fff' }}>
                      <div style={{ color: '#000', fontWeight: 'bold', fontSize: '10px' }}>A{val}</div>
                      <div style={{ color: '#000', fontWeight: 'bold', fontSize: '11px' }}>
                        {aAmt}
                      </div>
                    </div>
                  );
                })}
                <div style={{ width: '60px', textAlign: 'center', borderLeft: '1px solid #808080', fontWeight: 'bold', color: '#000', background: '#d4d0c8', fontSize: '12px' }}>
                  {getAnderTotal()}
                </div>
              </div>

            </div>

            {/* Grand Total Bar */}
            <div style={{ textAlign: 'right', marginTop: '2px', paddingRight: '10px', fontWeight: 'bold', color: '#0000aa', fontSize: '12px' }}>
              Grand Total : <span style={{ color: '#0000aa' }}>{grandTotal}</span>
            </div>
          </div>

          {/* Bottom Control Panel */}
          <div style={{ display: 'flex', gap: '3px', alignItems: 'stretch' }}>
            
            {/* Round off & Copy */}
            <div style={{ background: '#d4d0c8', border: '1px solid #808080', padding: '2px', width: '80px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Round off</span>
                <select value={roundOff} onChange={function(e) { setRoundOff(e.target.value); }} style={{ width: '100%', fontSize: '10px', border: '1px solid #7f9db9' }}>
                  <option value="0">0</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div>
                <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Symbol</span>
                <input type="text" value={symbol} onChange={function(e) { setSymbol(e.target.value); }} style={{ width: '85%', fontSize: '10px', border: '1px solid #7f9db9' }} />
              </div>

              <button onClick={handleCopyText} style={{ marginTop: 'auto', padding: '1px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontWeight: 'bold', fontSize: '9px' }}>
                Copy
              </button>
            </div>

            {/* Output String Box */}
            <div style={{ width: '90px', background: '#fff', border: '1px solid #808080', padding: '2px' }}>
              <textarea
                value={outputText}
                onChange={function(e) { setOutputText(e.target.value); }}
                placeholder="Cut list..."
                style={{ width: '100%', height: '100%', resize: 'none', border: 'none', fontSize: '9px', fontFamily: 'monospace', boxSizing: 'border-box', fontWeight: 'bold' }}
              />
            </div>

            {/* Cutting Controls */}
            <div style={{ background: '#d4d0c8', border: '1px solid #808080', padding: '2px', flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '9px' }}>Cutting</strong>
              
              <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', fontWeight: 'bold', fontSize: '8px' }}>
                <label><input type="radio" name="cm" checked={cuttingMode === 'Decrease'} onChange={function() { setCuttingMode('Decrease'); }} /> Decrease</label>
                <label><input type="radio" name="cm" checked={cuttingMode === 'Increase'} onChange={function() { setCuttingMode('Increase'); }} /> Increase</label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', marginBottom: '2px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '8px' }}>AMOUNT</span>
                  <input
                    type="text"
                    value={cuttingAmt}
                    onChange={function(e) { setCuttingAmt(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === 'Enter') handleCalculateCutting(); }}
                    style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
                  />
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '8px' }}>%AGE</span>
                  <input type="text" value={cuttingPercentage} onChange={function(e) { setCuttingPercentage(e.target.value); }} style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Adj N:</span>
                  <input
                    type="text"
                    value={adjN}
                    onChange={function(e) { setAdjN(e.target.value); setCuttingAmt(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === 'Enter') handleCalculateCutting(); }}
                    style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold' }}
                  />
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Adj A:</span>
                  <input type="text" value={adjA} onChange={function(e) { setAdjA(e.target.value); }} style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold' }} />
                </div>
              </div>
            </div>

            {/* Multiply Box */}
            <div style={{ background: '#d4d0c8', border: '1px solid #808080', padding: '2px', width: '95px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <strong style={{ fontSize: '9px' }}>Multiply</strong>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Multiply N:</span>
                <input type="text" value={multiplyN} onChange={function(e) { setMultiplyN(e.target.value); }} style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold' }} />
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Multiply A:</span>
                <input type="text" value={multiplyA} onChange={function(e) { setMultiplyA(e.target.value); }} style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold' }} />
              </div>
              <button onClick={handleApplyMultiply} style={{ marginTop: 'auto', padding: '1px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontSize: '8px', fontWeight: 'bold' }}>
                Apply Mult
              </button>
            </div>

            {/* 1. High Color Box */}
            <div style={{ background: '#d4d0c8', border: '1px solid #808080', padding: '2px', width: '95px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <strong style={{ fontSize: '9px' }}>High Color</strong>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '8px' }}>AMOUNT</span>
                <input type="text" value={highColorAmt} onChange={function(e) { setHighColorAmt(e.target.value); }} style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold', background: '#fff' }} />
              </div>

              <button
                onClick={handleFindToggle}
                style={{
                  marginTop: 'auto',
                  padding: '2px',
                  background: isFindActive ? '#ffff99' : '#d4d0c8',
                  border: '2px solid #ffffff',
                  borderRightColor: '#808080',
                  borderBottomColor: '#808080',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '9px'
                }}
              >
                {isFindActive ? 'CLEAR FIND' : 'CLEAR FIND'}
              </button>
            </div>

            {/* 2. High Amt Box */}
            <div style={{ background: '#d4d0c8', border: '1px solid #808080', padding: '2px', width: '95px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <strong style={{ fontSize: '9px' }}>High Amt</strong>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '8px' }}>AMOUNT</span>
                <input type="text" value={highAmtVal} onChange={function(e) { setHighAmtVal(e.target.value); }} style={{ width: '85%', fontSize: '9px', border: '1px solid #7f9db9', fontWeight: 'bold', background: '#fff' }} />
              </div>

              <button
                onClick={handleFindHighAmtClient}
                style={{ marginTop: 'auto', padding: '2px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontWeight: 'bold', fontSize: '9px' }}
              >
                FIND
              </button>
              {highAmtClient && (
                <div style={{ fontSize: '8px', color: '#0000aa', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {highAmtClient}
                </div>
              )}
            </div>

            {/* Right Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
              <button onClick={handleCopyToVerticalAndSendF3} style={{ padding: '1px 2px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontSize: '8px', fontWeight: 'bold' }}>
                Copy to Vertical (F3)
              </button>
              
              <button onClick={handleShiftAToD} style={{ padding: '1px 2px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontSize: '8px', fontWeight: 'bold' }}>
                Shift A to D
              </button>

              <button onClick={handleAdjustNegative} style={{ padding: '1px 2px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontSize: '8px', fontWeight: 'bold' }}>
                Adjust (-)ve
              </button>

              <button
                onClick={function() { setIsProfitLossOpen(!isProfitLossOpen); }}
                style={{ padding: '1px 2px', background: isProfitLossOpen ? '#0a246a' : '#d4d0c8', color: isProfitLossOpen ? '#fff' : '#000', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontWeight: 'bold', fontSize: '9px' }}
              >
                Profit / Loss
              </button>
            </div>

          </div>

        </div>

        {/* Right Section: Profit / Loss Side Panel */}
        {isProfitLossOpen && (
          <div style={{ width: '230px', background: '#d4d0c8', border: '1px solid #808080', padding: '3px', display: 'flex', flexDirection: 'column', gap: '3px', boxSizing: 'border-box' }}>
            
            <div style={{ flex: 1, border: '1px solid #808080', background: '#fff', overflowY: 'auto' }}>
              <table border="1" cellPadding="2" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', borderColor: '#d0d0d0' }}>
                <thead>
                  <tr style={{ background: '#d4d0c8', position: 'sticky', top: 0, zIndex: 1, fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>
                    <th>Number</th>
                    <th>Arnt</th>
                    <th>WinLossAmt</th>
                  </tr>
                </thead>
                <tbody>
                  {profitLossList.map(function(item, idx) {
                    const isLoss = item.winLossAmt < 0;
                    return (
                      <tr key={idx} style={{ background: idx === 0 ? '#0a246a' : '#ffffff', color: idx === 0 ? '#ffffff' : '#000000', fontWeight: 'bold' }}>
                        <td><strong>{item.number}</strong></td>
                        <td>{item.amt}</td>
                        <td style={{ fontWeight: 'bold', color: idx === 0 ? '#ffffff' : (isLoss ? '#cc0000' : '#000000') }}>
                          {item.winLossAmt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}