import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function VoucherYantriF3() {
  const navigate = useNavigate();
  const location = useLocation();

  const getTodayFormattedDate = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const initialDate = (location.state && location.state.date) ? location.state.date : getTodayFormattedDate();
  const initialGame = (location.state && location.state.game) ? location.state.game : 'GB';
  const rawParty = (location.state && location.state.party) ? location.state.party : '';

  const [date, setDate] = useState(initialDate);
  const [game, setGame] = useState(initialGame);
  const [gameList, setGameList] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [displayPartyName, setDisplayPartyName] = useState('');
  const [partyList, setPartyList] = useState([]);

  const [negativeEntry, setNegativeEntry] = useState(false);
  const [navDirection, setNavDirection] = useState('UP-DOWN');

  const createInitialGrid = function() {
    const grid = {};
    for (let i = 1; i <= 100; i++) grid[i] = '';
    return grid;
  };
  const [gridData, setGridData] = useState(createInitialGrid());

  const [baharHaruf, setBaharHaruf] = useState({ '1': '', '2': '', '3': '', '4': '', '5': '', '6': '', '7': '', '8': '', '9': '', '0': '' });
  const [anderHaruf, setAnderHaruf] = useState({ '1': '', '2': '', '3': '', '4': '', '5': '', '6': '', '7': '', '8': '', '9': '', '0': '' });

  // Helper to restore focus back to first grid input box
  const restoreFocus = function() {
    setTimeout(function() {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      const el = document.getElementById('yantri-box-1');
      if (el) {
        el.focus();
      }
    }, 50);
  };

  useEffect(function() {
    fetchGames();
    fetchParties();
  }, []);

  const fetchGames = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/games');
      if (res.data && res.data.success && Array.isArray(res.data.games)) {
        setGameList(res.data.games);
      }
    } catch (err) {
      console.error('Error fetching games in F3:', err);
    }
  };

  const fetchParties = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/parties');
      let dataArray = [];
      if (Array.isArray(res.data)) {
        dataArray = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        dataArray = res.data.data;
      } else if (res.data && Array.isArray(res.data.parties)) {
        dataArray = res.data.parties;
      } else if (res.data && Array.isArray(res.data.rows)) {
        dataArray = res.data.rows;
      }
      setPartyList(dataArray);
    } catch (err) {
      console.error('Error fetching parties in F3:', err);
    }
  };

  useEffect(function() {
    if (!rawParty) {
      setDisplayPartyName('');
      return;
    }

    if (typeof rawParty === 'object') {
      const pName = rawParty.party_name || rawParty.PName || rawParty.pname || rawParty.name || '';
      setDisplayPartyName(pName);
      setSelectedParty(rawParty.pno || rawParty.Pno || rawParty.id || '');
    } else {
      const found = partyList.find(function(p) {
        const pId = String(p.pno || p.Pno || p.id || '');
        return pId === String(rawParty);
      });

      if (found) {
        setDisplayPartyName(found.party_name || found.PName || found.pname || found.name || '');
        setSelectedParty(String(rawParty));
      } else {
        setDisplayPartyName(String(rawParty));
      }
    }
  }, [rawParty, partyList]);

  useEffect(function() {
    if (location.state && location.state.importedItems && Array.isArray(location.state.importedItems)) {
      setGridData(function(prevGrid) {
        const newGrid = { ...prevGrid };
        location.state.importedItems.forEach(function(item) {
          if (item.no && item.amount) {
            let numKey = Number(item.no);
            if (item.no === '00') numKey = 100;
            if (numKey >= 1 && numKey <= 100) {
              newGrid[numKey] = String(item.amount);
            }
          }
        });
        return newGrid;
      });
    }
  }, [location.state]);

  const handleGridChange = function(num, val) { setGridData(function(prev) { const obj = { ...prev }; obj[num] = val; return obj; }); };
  const handleBaharChange = function(digit, val) { setBaharHaruf(function(prev) { const obj = { ...prev }; obj[digit] = val; return obj; }); };
  const handleAnderChange = function(digit, val) { setAnderHaruf(function(prev) { const obj = { ...prev }; obj[digit] = val; return obj; }); };

  const handleSubmitToF2 = function() {
    const convertedItems = [];

    for (let i = 1; i <= 100; i++) {
      if (gridData[i] && Number(gridData[i]) > 0) {
        let numStr = i < 10 ? '0' + i : String(i);
        if (i === 100) numStr = '00';
        convertedItems.push({ no: numStr, amount: String(gridData[i]) });
      }
    }

    Object.keys(baharHaruf).forEach(function(digit) {
      const amt = Number(baharHaruf[digit]);
      if (amt > 0) {
        convertedItems.push({ no: digit + 'B', amount: String(amt) });
      }
    });

    Object.keys(anderHaruf).forEach(function(digit) {
      const amt = Number(anderHaruf[digit]);
      if (amt > 0) {
        for (let i = 0; i <= 9; i++) convertedItems.push({ no: digit + String(i), amount: String(amt) });
      }
    });

    if (convertedItems.length === 0) return;

    navigate('/voucher-sale', {
      state: { 
        importedItems: convertedItems,
        date: date,
        game: game,
        party: displayPartyName || selectedParty
      }
    });
  };

  const handleGridKeyDown = function(e, currentNum) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentNum === 100) {
        const baharElem = document.getElementById('bahar-box-1');
        if (baharElem) baharElem.focus();
        return;
      }

      let nextNum = currentNum;
      if (navDirection === 'UP-DOWN') {
        if (currentNum + 10 <= 100) {
          nextNum = currentNum + 10;
        } else {
          const col = currentNum % 10;
          if (col === 0) {
            const baharElem = document.getElementById('bahar-box-1');
            if (baharElem) baharElem.focus();
            return;
          } else {
            nextNum = col + 1;
          }
        }
      } else {
        if (currentNum + 1 <= 100) nextNum = currentNum + 1;
        else {
          const baharElem = document.getElementById('bahar-box-1');
          if (baharElem) baharElem.focus();
          return;
        }
      }

      const nextElem = document.getElementById('yantri-box-' + nextNum);
      if (nextElem) nextElem.focus();
    }
  };

  const handleBaharKeyDown = function(e, digit) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sequence = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      const currentIndex = sequence.indexOf(digit);

      if (currentIndex < sequence.length - 1) {
        const nextDigit = sequence[currentIndex + 1];
        const nextElem = document.getElementById('bahar-box-' + nextDigit);
        if (nextElem) nextElem.focus();
      } else {
        const submitBtn = document.getElementById('f3-submit-btn');
        if (submitBtn) submitBtn.focus();
      }
    }
  };

  const handleReset = function() {
    setGridData(createInitialGrid());
    setBaharHaruf({ '1': '', '2': '', '3': '', '4': '', '5': '', '6': '', '7': '', '8': '', '9': '', '0': '' });
    setAnderHaruf({ '1': '', '2': '', '3': '', '4': '', '5': '', '6': '', '7': '', '8': '', '9': '', '0': '' });
    restoreFocus();
  };

  const getRowTotal = function(rowIndex) {
    let sum = 0;
    const start = rowIndex * 10 + 1;
    for (let i = start; i < start + 10; i++) sum += Number(gridData[i]) || 0;
    return sum;
  };

  const gridTotal = Object.values(gridData).reduce(function(s, v) { return s + (Number(v) || 0); }, 0);
  const baharTotal = Object.values(baharHaruf).reduce(function(s, v) { return s + (Number(v) || 0); }, 0);
  const anderTotal = Object.values(anderHaruf).reduce(function(s, v) { return s + (Number(v) || 0); }, 0);
  const grandTotal = gridTotal + baharTotal + anderTotal;

  const anderLabels = ['1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '0000'];
  const digitSequence = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div style={{ padding: '4px', background: '#3a4856', color: '#fff', height: '88vh', maxHeight: '88vh', fontSize: '11px', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#3a4856', padding: '2px 4px', marginBottom: '4px' }}>
        <button onClick={handleReset} style={{ background: '#008000', color: '#fff', border: '1px solid #fff', padding: '2px 10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
          Reset
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          <input type="checkbox" checked={negativeEntry} onChange={function(e) { setNegativeEntry(e.target.checked); }} />
          <span>Negative Entry</span>
        </label>
        
        <div><span style={{ fontWeight: 'bold' }}>F2 Date: </span><input type="text" value={date} onChange={function(e) { setDate(e.target.value); }} style={{ width: '75px', textAlign: 'center', background: '#fff', color: '#000', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px' }} /></div>
        
        <div>
          <span style={{ fontWeight: 'bold' }}>Game: </span>
          <select value={game} onChange={function(e) { setGame(e.target.value); }} style={{ width: '80px', background: '#fff', color: '#000', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px' }}>
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
          <span style={{ fontWeight: 'bold' }}>Party: </span>
          {displayPartyName ? (
            <input type="text" value={displayPartyName} readOnly style={{ width: '130px', background: '#fff', color: '#000', fontWeight: 'bold', paddingLeft: '4px', border: '1px solid #7f9db9' }} />
          ) : (
            <select 
              value={selectedParty} 
              onChange={function(e) {
                setSelectedParty(e.target.value);
                const found = partyList.find(function(p) { return String(p.pno || p.id) === String(e.target.value); });
                if (found) setDisplayPartyName(found.party_name || found.PName || found.name);
              }} 
              style={{ width: '130px', background: '#fff', color: '#000', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px' }}
            >
              <option value="">-- Select Party --</option>
              {partyList.map(function(p) {
                const pId = p.pno || p.Pno || p.id;
                const pName = p.party_name || p.PName || p.pname || p.name;
                return <option key={pId} value={pId}>{pName}</option>;
              })}
            </select>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', border: '1px solid #808080', padding: '1px 6px', background: '#3a4856' }}>
          <span style={{ color: '#ccc', fontSize: '10px', fontWeight: 'bold' }}>(Insert)</span>
          <label style={{ cursor: 'pointer', fontWeight: 'bold' }}><input type="radio" name="navDir" checked={navDirection === 'UP-DOWN'} onChange={function() { setNavDirection('UP-DOWN'); }} /> UP-DOWN</label>
          <label style={{ cursor: 'pointer', fontWeight: 'bold' }}><input type="radio" name="navDir" checked={navDirection === 'LEFT-RIGHT'} onChange={function() { setNavDirection('LEFT-RIGHT'); }} /> LEFT-RIGHT</label>
        </div>
      </div>

      {/* Main Full Height Grid Area */}
      <div style={{ flex: 1, display: 'flex', gap: '6px', overflow: 'hidden' }}>
        
        {/* Left Section: 1 to 100 Inputs Grid */}
        <div style={{ flex: 1, background: '#3a4856', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Column Headers (1 to 10) */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', paddingLeft: '22px', paddingRight: '45px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function(cNum) {
              return (
                <div key={cNum} style={{ flex: 1, textAlign: 'center', color: '#ffff00', fontWeight: 'bold', fontSize: '12px' }}>
                  {cNum}
                </div>
              );
            })}
          </div>

          {/* 10 Rows Expanding to Fill Screen */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function(rowIndex) {
              const rowStartNum = rowIndex * 10 + 1;
              return (
                <div key={rowIndex} style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                  
                  {/* Row Label (1, 11, 21...) */}
                  <span style={{ width: '20px', color: '#ffff00', fontWeight: 'bold', fontSize: '12px', textAlign: 'right' }}>
                    {rowStartNum}
                  </span>

                  {/* 10 Input Boxes Stretching Vertical Height */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function(colIndex) {
                    const num = rowIndex * 10 + colIndex;
                    return (
                      <div key={num} style={{ flex: 1, height: '100%' }}>
                        <input
                          id={'yantri-box-' + num}
                          type="text"
                          value={gridData[num]}
                          onChange={function(e) { handleGridChange(num, e.target.value); }}
                          onKeyDown={function(e) { handleGridKeyDown(e, num); }}
                          autoFocus={num === 1}
                          style={{ width: '100%', height: '100%', textAlign: 'center', fontSize: '13px', background: '#fff', color: '#000', border: '1px solid #7f9db9', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    );
                  })}

                  {/* Row Total */}
                  <div style={{ width: '40px', textAlign: 'right', color: '#ffff00', fontWeight: 'bold', fontSize: '12px' }}>
                    {getRowTotal(rowIndex)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Series Inputs (111, 222, 333... 000) */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', paddingLeft: '22px', paddingRight: '45px', alignItems: 'center' }}>
            {digitSequence.map(function(digit) {
              return (
                <div key={digit} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#ffff00', fontWeight: 'bold' }}>{digit + digit + digit}</span>
                  <input
                    id={'bahar-box-' + digit}
                    type="text"
                    value={baharHaruf[digit]}
                    onChange={function(e) { handleBaharChange(digit, e.target.value); }}
                    onKeyDown={function(e) { handleBaharKeyDown(e, digit); }}
                    style={{ width: '100%', height: '26px', textAlign: 'center', fontSize: '13px', background: '#fff', color: '#000', border: '1px solid #7f9db9', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Panel: Side Series Inputs (10..100 & 1111..0000) */}
        <div style={{ width: '110px', background: '#3a4856', display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'space-between', paddingTop: '15px', paddingBottom: '30px' }}>
          {digitSequence.map(function(digit, idx) {
            const rowLabelNum = (idx + 1) * 10;
            const seriesCode = anderLabels[idx];
            return (
              <div key={digit} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '11px', width: '18px', textAlign: 'right' }}>{rowLabelNum}</span>
                <span style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '10px', width: '28px' }}>{seriesCode}</span>
                <input
                  id={'ander-box-' + digit}
                  type="text"
                  value={anderHaruf[digit]}
                  onChange={function(e) { handleAnderChange(digit, e.target.value); }}
                  style={{ width: '45px', height: '100%', textAlign: 'center', fontSize: '12px', background: '#fff', color: '#000', border: '1px solid #7f9db9', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            );
          })}
        </div>

      </div>

      {/* Bottom Footer Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#3a4856', padding: '4px 8px', borderTop: '1px solid #777', marginTop: '4px' }}>
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          <div>D-Amount: <span style={{ color: '#fff' }}>0</span></div>
          <div>A-Amount: <span style={{ color: '#fff' }}>0</span></div>
          <div>AA Amount: <span style={{ color: '#fff' }}>0</span></div>
        </div>

        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>
          GRAND TOTAL: <span style={{ color: '#ffff00', fontSize: '16px' }}>{grandTotal}</span>
        </div>

        <button
          id="f3-submit-btn"
          type="button"
          onClick={handleSubmitToF2}
          onKeyDown={function(e) { if (e.key === 'Enter') { e.preventDefault(); handleSubmitToF2(); } }}
          style={{ background: '#b30000', color: '#fff', border: '1px solid #fff', padding: '4px 22px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '1px 1px 2px #000' }}
        >
          Submit
        </button>
      </div>

    </div>
  );
}