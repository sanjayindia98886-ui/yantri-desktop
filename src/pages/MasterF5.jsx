import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePermission } from '../context/PermissionContext';

export default function MasterF5() {
  // Context से Role & Action Permissions पढ़ना
  const { permissions, user } = usePermission();

  // 1. Role Logic
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || user?.role === 'admin' || user?.role === 'ADMIN' || user?.username === 'admin';
  const isUser = !isAdmin;

  // 2. Delete Permission Logic
  const canDelete = isSuperAdmin || !!permissions?.can_delete_voucher;

  // Date States persisted in localStorage
  const getTodayDateStr = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  // Date States (Auto-set to Today)
  const [uploadDate, setUploadDate] = useState(getTodayDateStr());
  const [downloadDate, setDownloadDate] = useState(getTodayDateStr());
  const [userSaleDate, setUserSaleDate] = useState(getTodayDateStr());
  const [uploadLogDate, setUploadLogDate] = useState(getTodayDateStr());

  // Dynamic Game List
  const [gameList, setGameList] = useState([]);
  const [uploadGame, setUploadGame] = useState('GB');
  const [downloadGame, setDownloadGame] = useState('GB');
  const [userSaleGame, setUserSaleGame] = useState('GB');

  const [deleteWithOpeningDate, setDeleteWithOpeningDate] = useState('');
  
  const [deleteWithoutOpeningType, setDeleteWithoutOpeningType] = useState('All');
  const [deleteWithoutOpeningTill, setDeleteWithoutOpeningTill] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [partyList, setPartyList] = useState([]);

  const [userSaleType, setUserSaleType] = useState('Local');
  const [userSaleSummary, setUserSaleSummary] = useState([]);
  const [totalUserSaleAmount, setTotalUserSaleAmount] = useState('0.0');

  const [userSaleLog, setUserSaleLog] = useState([]);
  const [notification, setNotification] = useState('');

  // Helper to restore focus back to main Upload Date input
  const restoreFocus = function() {
    setTimeout(function() {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      const el = document.getElementById('f5UploadDateInput');
      if (el) {
        el.focus();
      }
    }, 50);
  };

  const showNotify = function(msg) {
    setNotification(msg);
    setTimeout(function() {
      setNotification('');
    }, 3000);
  };

  // Date Change Handlers
  const handleUploadDateChange = function(e) {
    const val = e.target.value;
    setUploadDate(val);
    localStorage.setItem('f5_upload_date', val);
  };

  const handleDownloadDateChange = function(e) {
    const val = e.target.value;
    setDownloadDate(val);
    localStorage.setItem('f5_download_date', val);
  };

  const handleUserSaleDateChange = function(e) {
    const val = e.target.value;
    setUserSaleDate(val);
    localStorage.setItem('f5_user_sale_date', val);
  };

  const handleUploadLogDateChange = function(e) {
    const val = e.target.value;
    setUploadLogDate(val);
    localStorage.setItem('f5_upload_log_date', val);
  };

  useEffect(function() {
    fetchParties();
    fetchGames();
  }, []);

  const fetchGames = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/games');
      if (res.data && res.data.success && Array.isArray(res.data.games)) {
        setGameList(res.data.games);
        if (res.data.games.length > 0) {
          const firstGame = res.data.games[0].game_name;
          setUploadGame(firstGame);
          setDownloadGame(firstGame);
          setUserSaleGame(firstGame);
        }
      }
    } catch (err) {
      console.error("Error fetching games in F5:", err);
    }
  };

  const fetchParties = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/parties');
      if (res.data) {
        setPartyList(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error("Error fetching parties:", err);
    }
  };

  const handleUploadSale = async function() {
    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/master/upload-sale', { date: uploadDate, game: uploadGame });
      showNotify(res.data.message || 'Sale Upload Successful!');
      restoreFocus();
    } catch (err) { 
      showNotify('Upload Sale failed!'); 
      restoreFocus();
    }
  };

  const handleUploadParty = async () => {
    try {
      const response = await axios.post('https://yantri-desktop.onrender.com/api/master/upload-party', {
        parties: partyList
      });
      
      if(response.data.status) {
        showNotify('Party uploaded successfully!');
        restoreFocus();
      }
    } catch (error) {
      showNotify('Upload Party failed!');
      restoreFocus();
    }
  };

  const handleDownloadSale = async function() {
    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/master/download-sale', { date: downloadDate, game: downloadGame });
      showNotify(res.data.message || 'Sale Download Completed!');
      restoreFocus();
    } catch (err) { 
      showNotify('Download Sale failed!'); 
      restoreFocus();
    }
  };

  const handleDownloadParty = async function() {
    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/master/download-party', { date: downloadDate, game: downloadGame });
      showNotify(res.data.message || 'Party Accounts Downloaded Successfully!');
      restoreFocus();
    } catch (err) { 
      showNotify('Download Party failed!'); 
      restoreFocus();
    }
  };

  const handleDeleteDownloadedVouchers = async function() {
    if (!canDelete) {
      showNotify('Access Denied: You do not have permission to delete vouchers.');
      restoreFocus();
      return;
    }
    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/master/delete-downloaded-vouchers');
      showNotify(res.data.message || 'Downloaded Vouchers Deleted!');
      restoreFocus();
    } catch (err) { 
      showNotify('Delete failed!'); 
      restoreFocus();
    }
  };

  const handleDeleteWithOpening = async function() {
    if (!canDelete) {
      showNotify('Access Denied: You do not have permission to delete.');
      restoreFocus();
      return;
    }
    if (!deleteWithOpeningDate) {
      showNotify('Please enter Till Date!');
      restoreFocus();
      return;
    }
    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/master/delete-sale-with-opening', { tillDate: deleteWithOpeningDate });
      showNotify(res.data.message || 'Delete With Opening Completed!');
      restoreFocus();
    } catch (err) { 
      showNotify('Delete With Opening failed!'); 
      restoreFocus();
    }
  };

  const handleDeleteWithoutOpening = async function() {
    if (!canDelete) {
      showNotify('Access Denied: You do not have permission to delete.');
      restoreFocus();
      return;
    }
    if (!deleteWithoutOpeningTill) {
      showNotify('Please enter Till Date!');
      restoreFocus();
      return;
    }
    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/master/delete-sale-without-opening', {
        type: deleteWithoutOpeningType,
        tillDate: deleteWithoutOpeningTill,
        partyId: selectedParty
      });
      showNotify(res.data.message || 'Delete Sale Completed!');
      restoreFocus();
    } catch (err) { 
      showNotify('Delete Sale failed!'); 
      restoreFocus();
    }
  };

  const handleDeleteAccount = async function() {
    if (!canDelete) {
      showNotify('Access Denied: You do not have permission to delete account.');
      restoreFocus();
      return;
    }
    if (deleteWithoutOpeningType === 'Selected Party' && !selectedParty) {
      showNotify('Please choose a Party!');
      restoreFocus();
      return;
    }
    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/master/delete-account', {
        type: deleteWithoutOpeningType,
        partyId: selectedParty
      });
      showNotify(res.data.message || 'Delete Account Completed!');
      restoreFocus();
    } catch (err) { 
      showNotify('Delete Account failed!'); 
      restoreFocus();
    }
  };

  const handleFindUserSale = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/master/user-sale-summary', {
        params: { type: userSaleType, date: userSaleDate, game: userSaleGame }
      });
      setUserSaleSummary(res.data.summary || []);
      setTotalUserSaleAmount(res.data.totalAmount || '0.0');
      restoreFocus();
    } catch (err) { 
      showNotify('Error fetching user sale!'); 
      restoreFocus();
    }
  };

  const handleFindUploadLogs = async function() {
    try {
      const res = await axios.get('https://yantri-desktop.onrender.com/api/master/user-sale-logs', {
        params: { date: uploadLogDate }
      });
      setUserSaleLog(res.data.logs || []);
      restoreFocus();
    } catch (err) { 
      showNotify('Error fetching upload logs!'); 
      restoreFocus();
    }
  };

  const panelBoxStyle = {
    border: '1px solid #7a96df',
    background: '#e0e8f8',
    padding: '8px',
    borderRadius: '2px'
  };

  const maroonBtnStyle = {
    background: canDelete ? '#600000' : '#888888',
    color: '#ffffff',
    border: '1px solid #300000',
    cursor: canDelete ? 'pointer' : 'not-allowed',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    opacity: canDelete ? 1 : 0.6
  };

  return (
    <div style={{ padding: '8px', background: '#dcdcdc', minHeight: '93vh', fontSize: '11px', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      {/* Top Notification Banner */}
      {notification && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '6px 12px', border: '1px solid #c3e6cb', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
          {notification}
        </div>
      )}

      {/* Top Panel - Dynamic Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1.1fr 1.2fr 1.3fr 1.4fr' : '1fr 1fr 1.4fr', gap: '8px' }}>
        
        {/* Box 1: Server Upload Section */}
        <div style={panelBoxStyle}>
          <strong style={{ color: '#000', fontSize: '12px' }}>
            {isAdmin ? 'Server Upload' : 'Server Upload-Sale'}
          </strong>
          <div style={{ marginTop: '12px', fontWeight: 'bold' }}>
            Date: <input 
              id="f5UploadDateInput"
              type="text" 
              value={uploadDate} 
              onChange={handleUploadDateChange} 
              autoFocus
              style={{ width: '85px', padding: '1px 3px', fontWeight: 'bold', textAlign: 'center' }} 
            />
          </div>
          <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
            Game: <select value={uploadGame} onChange={function(e) { setUploadGame(e.target.value); }} style={{ width: '90px', fontWeight: 'bold' }}>
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

          <button onClick={handleUploadSale} style={{ marginTop: '16px', width: '100%', padding: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
            Upload Sale
          </button>
          
          {isAdmin && (
            <button onClick={handleUploadParty} style={{ marginTop: '10px', width: '100%', padding: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
              Upload Party
            </button>
          )}
        </div>

        {/* Box 2: Server Download Section */}
        <div style={panelBoxStyle}>
          <strong style={{ color: '#000', fontSize: '12px' }}>
            {isAdmin ? 'Server Download-Sale' : 'Server Download-Party'}
          </strong>
          <div style={{ marginTop: '12px', fontWeight: 'bold' }}>
            Date: <input type="text" value={downloadDate} onChange={handleDownloadDateChange} style={{ width: '85px', padding: '1px 3px', fontWeight: 'bold', textAlign: 'center' }} />
          </div>
          <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
            Game: <select value={downloadGame} onChange={function(e) { setDownloadGame(e.target.value); }} style={{ width: '90px', fontWeight: 'bold' }}>
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

          {isAdmin && (
            <button onClick={handleDownloadSale} style={{ marginTop: '16px', width: '100%', padding: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
              Download Sale
            </button>
          )}

          {isUser && (
            <button onClick={handleDownloadParty} style={{ marginTop: '16px', width: '100%', padding: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
              Download Party
            </button>
          )}

          {isAdmin && (
            <button onClick={handleDeleteDownloadedVouchers} disabled={!canDelete} style={{ ...maroonBtnStyle, marginTop: '20px', width: '100%' }}>
              Delete Downloaded Vouchers
            </button>
          )}
        </div>

        {/* Box 3: Delete Options Stack (Sirf Admin ko dikhega) */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            <div style={panelBoxStyle}>
              <strong style={{ fontSize: '12px' }}>Delete Sale With Opening</strong>
              <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
                Till Date: <input type="text" placeholder="//" value={deleteWithOpeningDate} onChange={function(e) { setDeleteWithOpeningDate(e.target.value); }} style={{ width: '85px', fontWeight: 'bold', textAlign: 'center' }} />
              </div>
              <button onClick={handleDeleteWithOpening} disabled={!canDelete} style={{ ...maroonBtnStyle, marginTop: '8px', width: '100%' }}>Delete Sale With Opening</button>
            </div>

            <div style={panelBoxStyle}>
              <strong style={{ fontSize: '12px' }}>Delete Sale Without Opening</strong>
              <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
                <label><input type="radio" name="dso" checked={deleteWithoutOpeningType === 'All'} onChange={function() { setDeleteWithoutOpeningType('All'); }} /> All</label>
                <label style={{ marginLeft: '12px' }}>
                  <input 
                    type="radio" 
                    name="dso" 
                    checked={deleteWithoutOpeningType === 'Selected Party'} 
                    onChange={function() {
                      setDeleteWithoutOpeningType('Selected Party');
                      fetchParties();
                    }} 
                  /> Selected Party
                </label>
              </div>
              <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
                Till Date: <input type="text" placeholder="//" value={deleteWithoutOpeningTill} onChange={function(e) { setDeleteWithoutOpeningTill(e.target.value); }} style={{ width: '75px', fontWeight: 'bold', textAlign: 'center' }} />
              </div>
              <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
                Party: <select value={selectedParty} onChange={function(e) { setSelectedParty(e.target.value); }} style={{ width: '110px', fontWeight: 'bold' }}>
                  <option value="">-- Choose --</option>
                  {partyList.map(function(p) {
                    const partyId = p.pno || p.Pno || p.id;
                    const partyName = p.party_name || p.PName || p.pname || p.name;
                    return (
                      <option key={partyId} value={partyId}>
                        {partyName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button onClick={handleDeleteWithoutOpening} disabled={!canDelete} style={{ ...maroonBtnStyle, marginTop: '8px', width: '100%' }}>Delete Sale</button>
              <button onClick={handleDeleteAccount} disabled={!canDelete} style={{ ...maroonBtnStyle, marginTop: '5px', width: '100%' }}>Delete Account</button>
            </div>

          </div>
        )}

        {/* Box 4: User Sale Summary Table */}
        <div style={panelBoxStyle}>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>User Sale</div>
          <div style={{ marginTop: '4px', textAlign: 'center', fontWeight: 'bold' }}>
            <label><input type="radio" name="ust" checked={userSaleType === 'Local'} onChange={function() { setUserSaleType('Local'); }} /> Local</label>
            <label style={{ marginLeft: '15px' }}><input type="radio" name="ust" checked={userSaleType === 'Server'} onChange={function() { setUserSaleType('Server'); }} /> Server</label>
          </div>
          <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
            Date: <input type="text" value={userSaleDate} onChange={handleUserSaleDateChange} style={{ width: '80px', fontWeight: 'bold', textAlign: 'center' }} />
          </div>
          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
            <span>Game: <select value={userSaleGame} onChange={function(e) { setUserSaleGame(e.target.value); }} style={{ width: '90px', fontWeight: 'bold' }}>
              {gameList.length > 0 ? (
                gameList.map(function(g) {
                  const gName = g.game_name || g;
                  return <option key={g.game_id || gName} value={gName}>{gName}</option>;
                })
              ) : (
                <option value="GB">GB</option>
              )}
            </select></span>
            <button onClick={handleFindUserSale} style={{ padding: '2px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>Find</button>
          </div>

          <div style={{ marginTop: '8px', height: '170px', overflowY: 'auto', background: '#fff', border: '1px solid #7f9db9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#ece9d8', borderBottom: '1px solid #acd', fontWeight: 'bold' }}>
                  <th style={{ padding: '2px 5px', borderRight: '1px solid #ccc' }}>UserId</th>
                  <th style={{ padding: '2px 5px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {userSaleSummary.length > 0 ? (
                  userSaleSummary.map(function(item, idx) {
                    return (
                      <tr key={idx} style={{ background: idx === 0 ? '#004080' : 'transparent', color: idx === 0 ? '#fff' : '#000', fontWeight: 'bold' }}>
                        <td style={{ padding: '2px 5px', borderRight: '1px solid #eee' }}>{item.userId}</td>
                        <td style={{ padding: '2px 5px' }}>{item.amount}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="2" style={{ textAlign: 'center', padding: '10px', color: '#888', fontWeight: 'bold' }}>No data found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: '6px', fontSize: '13px', paddingRight: '5px' }}>
            {totalUserSaleAmount}
          </div>
        </div>

      </div>

      {/* Lower Log Panel */}
      <div style={{ display: 'flex', gap: '8px' }}>
        
        {/* Delete Server Panel: Sirf Admin Ko Dikhega */}
        {isAdmin && (
          <div style={{ width: '220px', ...panelBoxStyle }}>
            <strong style={{ fontSize: '12px' }}>Delete Server</strong>
            <button disabled={!canDelete} style={{ ...maroonBtnStyle, marginTop: '20px', width: '100%', padding: '6px' }}>Delete Sale</button>
          </div>
        )}

        {/* User Sale Upload Time Table */}
        <div style={{ flex: 1, ...panelBoxStyle }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center', fontWeight: 'bold' }}>
            <strong style={{ color: '#800000', fontSize: '12px' }}>User Sale Upload Time</strong>
            <span>Date: <input type="text" value={uploadLogDate} onChange={handleUploadLogDateChange} style={{ width: '85px', fontWeight: 'bold', textAlign: 'center' }} /></span>
            <button onClick={handleFindUploadLogs} style={{ padding: '2px 14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>Find</button>
          </div>

          <div style={{ marginTop: '8px', height: '140px', overflowY: 'auto', background: '#fff', border: '1px solid #7f9db9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#ece9d8', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
                  <th style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>SaleDate</th>
                  <th style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>Shift</th>
                  <th style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>UserID</th>
                  <th style={{ padding: '3px 6px' }}>UploadedOn</th>
                </tr>
              </thead>
              <tbody>
                {userSaleLog.length > 0 ? (
                  userSaleLog.map(function(log, idx) {
                    return (
                      <tr key={idx} style={{ background: idx === 0 ? '#004080' : 'transparent', color: idx === 0 ? '#fff' : '#000', fontWeight: 'bold' }}>
                        <td style={{ padding: '2px 6px', borderRight: '1px solid #eee' }}>{log.saleDate}</td>
                        <td style={{ padding: '2px 6px', borderRight: '1px solid #eee' }}>{log.shift}</td>
                        <td style={{ padding: '2px 6px', borderRight: '1px solid #eee' }}>{log.userId}</td>
                        <td style={{ padding: '2px 6px' }}>{log.uploadedOn}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '10px', color: '#888', fontWeight: 'bold' }}>No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}