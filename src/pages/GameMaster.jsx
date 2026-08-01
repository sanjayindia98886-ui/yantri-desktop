import React, { useState, useEffect } from 'react';

export default function GameMaster() {
  const [games, setGames] = useState([]);
  const [newGameName, setNewGameName] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);

  // Fetch All Games from Database
  const fetchGames = function() {
    fetch('http://localhost:5000/api/games')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setGames(data.games || []);
          if ((data.games || []).length > 0) {
            setSelectedGame(data.games[0]);
          } else {
            setSelectedGame(null);
          }
        }
      })
      .catch(function(err) {
        console.error('Error fetching games:', err);
      });
  };

  useEffect(function() {
    fetchGames();
  }, []);

  // Add New Game Handler
  const handleAddGame = function() {
    const trimmed = newGameName.toUpperCase().trim();
    if (!trimmed) {
      alert('कृपया गेम का नाम दर्ज करें!');
      return;
    }

    fetch('http://localhost:5000/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_name: trimmed })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setNewGameName('');
          fetchGames();
          alert('गेम सफलता पूर्वक ऐड हो गया!');
        } else {
          alert('Error: ' + (data.message || 'गेम ऐड नहीं हो सका'));
        }
      })
      .catch(function(err) {
        console.error('Add Game Error:', err);
        alert('Server connection error!');
      });
  };

  // Delete Selected Game Handler
  const handleDeleteGame = function() {
    if (!selectedGame) {
      alert('कृपया डिलीट करने के लिए गेम सिलेक्ट करें!');
      return;
    }

    const confirmDelete = window.confirm('क्या आप सच में ' + selectedGame.game_name + ' को डिलीट करना चाहते हैं?');
    if (!confirmDelete) return;

    fetch('http://localhost:5000/api/games/' + selectedGame.game_id, {
      method: 'DELETE'
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          fetchGames();
          alert('गेम डिलीट कर दिया गया!');
        } else {
          alert('Error: ' + (data.message || 'गेम डिलीट नहीं हो सका'));
        }
      })
      .catch(function(err) {
        console.error('Delete Game Error:', err);
        alert('Server connection error!');
      });
  };

  return (
    <div style={{ padding: '15px', background: '#dcdcdc', minHeight: '92vh', fontSize: '12px', fontFamily: 'Tahoma, Arial, sans-serif' }}>
      
      <div style={{ width: '280px', border: '1px solid #7a96df', background: '#ece9d8', padding: '10px', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)' }}>
        
        <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', background: '#0a246a', color: '#fff', padding: '4px', fontSize: '13px' }}>
          Game Master
        </h3>

        {/* Input & Add/Delete Controls */}
        <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>Name:</span>
            <input
              type="text"
              placeholder="e.g. NEW FB"
              value={newGameName}
              onChange={function(e) { setNewGameName(e.target.value); }}
              style={{ flex: 1, padding: '3px', border: '1px solid #7f9db9', textTransform: 'uppercase', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
            <button
              onClick={handleAddGame}
              style={{ flex: 1, padding: '4px', background: '#ece9d8', border: '1px solid #777', fontWeight: 'bold', cursor: 'pointer', color: 'green' }}
            >
              + Add / Save
            </button>
            <button
              onClick={handleDeleteGame}
              style={{ flex: 1, padding: '4px', background: '#ece9d8', border: '1px solid #777', fontWeight: 'bold', cursor: 'pointer', color: 'red' }}
            >
              - Delete
            </button>
          </div>
        </div>

        {/* Game List Table */}
        <div style={{ background: '#fff', border: '1px solid #7f9db9', maxHeight: '350px', overflowY: 'auto' }}>
          <table border="1" cellPadding="4" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#d4d0c8', textAlign: 'center' }}>
                <th style={{ width: '40px' }}>SrNo</th>
                <th>Game Name</th>
              </tr>
            </thead>
            <tbody>
              {games.length > 0 ? (
                games.map(function(g, idx) {
                  const isSelected = selectedGame && selectedGame.game_id === g.game_id;
                  return (
                    <tr
                      key={g.game_id || idx}
                      onClick={function() { setSelectedGame(g); }}
                      style={{
                        background: isSelected ? '#0a246a' : (idx % 2 === 0 ? '#ffffff' : '#f4f4f4'),
                        color: isSelected ? '#ffffff' : '#000000',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td><strong>{g.game_name}</strong></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', padding: '15px', color: '#666' }}>
                    No Games Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}