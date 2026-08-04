import React, { useState, useEffect } from 'react';

export default function SummaryF7() {
  const getTodayDateStr = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const [date, setDate] = useState(getTodayDateStr());
  const [agentsList, setAgentsList] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  
  const [summaryType, setSummaryType] = useState('Agent Summary');
  const [viewType, setViewType] = useState('Summary');
  const [allGame, setAllGame] = useState(true);

  const [without3rdPartyComm, setWithout3rdPartyComm] = useState(false);
  const [withoutHissa, setWithoutHissa] = useState(false);

  const [summaryRows, setSummaryRows] = useState([]);
  const [notification, setNotification] = useState('');
  const [totals, setTotals] = useState({
    d_sale: 0,
    a_sale: 0,
    total_sale: 0,
    comm: 0,
    actual_sale: 0,
    winamt: 0,
    balance: 0,
    hissa: 0,
    net_balance_today: 0,
    winjoda: 0,
    winakhar: 0,
    opening: 0,
    pandl: 0,
    today_payment: 0,
    final_net_balance: 0
  });

  const showNotify = function(msg) {
    setNotification(msg);
    setTimeout(function() {
      setNotification('');
    }, 3000);
  };

  // Focus Helper Function
  const restoreFocus = function() {
    setTimeout(function() {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      const el = document.getElementById('f7AgentSelect');
      if (el) {
        el.focus();
      }
    }, 50);
  };

  useEffect(function() {
    fetch('https://yantri-desktop.onrender.com/api/parties')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (Array.isArray(data)) {
          setAgentsList(data);
          if (data.length > 0) {
            setSelectedAgent(data[0].party_name);
          }
        }
      })
      .catch(function(err) { console.error('Error fetching parties:', err); });
  }, []);

  const fetchSummary = function() {
    if (!selectedAgent) {
      showNotify('Please select an Agent!');
      restoreFocus();
      return;
    }

    const url = 'https://yantri-desktop.onrender.com/api/summary?date=' + encodeURIComponent(date) + 
                '&agent=' + encodeURIComponent(selectedAgent) + 
                '&withoutHissa=' + withoutHissa +
                '&without3rdPartyComm=' + without3rdPartyComm;

    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setSummaryRows(data.rows || []);
          
          const t = data.totals || {};
          setTotals({
            d_sale: t.d_sale || 0,
            a_sale: t.a_sale || 0,
            total_sale: t.total_sale || 0,
            comm: t.comm || 0,
            actual_sale: t.actual_sale || 0,
            winamt: t.winamt || 0,
            balance: t.balance || 0,
            hissa: t.hissa || 0,
            net_balance_today: t.net_balance_today || 0,
            winjoda: t.winjoda || 0,
            winakhar: t.winakhar || 0,
            opening: t.opening !== undefined ? t.opening : 0,
            pandl: t.pandl !== undefined ? t.pandl : (t.net_balance_today || 0),
            today_payment: t.today_payment || 0,
            final_net_balance: t.final_net_balance !== undefined ? t.final_net_balance : (t.opening || 0)
          });
          restoreFocus();
        } else {
          showNotify('Error: ' + (data.error || 'Unable to fetch summary'));
          restoreFocus();
        }
      })
      .catch(function(err) {
        console.error('Error fetching summary:', err);
        showNotify('Server Connection Error!');
        restoreFocus();
      });
  };

  return (
    <div style={{ padding: '4px', background: '#d4d0c8', height: '88vh', maxHeight: '88vh', fontSize: '11px', fontFamily: 'Tahoma, Arial, sans-serif', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
      
      {/* Top Notification Banner */}
      {notification && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '4px 8px', border: '1px solid #c3e6cb', fontSize: '11px', fontWeight: 'bold', textAlign: 'center' }}>
          {notification}
        </div>
      )}

      {/* 1. Top Section Title & All Game Checkbox */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', fontFamily: 'Tahoma, sans-serif' }}>Summary</h2>
        <label style={{ position: 'absolute', right: '350px', cursor: 'pointer', fontWeight: 'bold' }}>
          <input type="checkbox" checked={allGame} onChange={function(e) { setAllGame(e.target.checked); }} /> All Game
        </label>
      </div>

      {/* 2. Top Control Filter Box */}
      <div style={{ border: '1px solid #808080', background: '#d4d0c8', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold' }}>Date:</span>
          <input type="text" value={date} onChange={function(e) { setDate(e.target.value); }} style={{ width: '85px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px 3px', background: '#fff' }} />
        </div>

        {/* Type Option Fieldset */}
        <fieldset style={{ border: '1px solid #808080', padding: '1px 6px', margin: 0 }}>
          <legend style={{ fontSize: '10px', fontWeight: 'bold' }}>Type</legend>
          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontWeight: 'bold' }}>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" name="sum_type" checked={summaryType === 'Complete Summary'} onChange={function() { setSummaryType('Complete Summary'); }} /> Complete Summary
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" name="sum_type" checked={summaryType === 'Agent Summary'} onChange={function() { setSummaryType('Agent Summary'); }} /> Agent Summary
            </label>
          </div>
        </fieldset>

        {/* View Option Fieldset */}
        <fieldset style={{ border: '1px solid #808080', padding: '1px 6px', margin: 0 }}>
          <legend style={{ fontSize: '10px', fontWeight: 'bold' }}>View</legend>
          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontWeight: 'bold' }}>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" name="view_type" checked={viewType === 'Summary'} onChange={function() { setViewType('Summary'); }} /> Summary
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" name="view_type" checked={viewType === 'Detail'} onChange={function() { setViewType('Detail'); }} /> Detail
            </label>
          </div>
        </fieldset>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 'bold' }}>Select Agent:</span>
          <select 
            id="f7AgentSelect"
            value={selectedAgent} 
            onChange={function(e) { setSelectedAgent(e.target.value); }} 
            autoFocus
            style={{ width: '150px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #7f9db9', padding: '1px', background: '#fff' }}
          >
            <option value="">-- Select Agent --</option>
            {agentsList.map(function(a) {
              return <option key={a.pno || a.id || a.party_name} value={a.party_name}>{a.party_name}</option>;
            })}
          </select>
          <button onClick={fetchSummary} style={{ padding: '2px 14px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', boxShadow: '1px 1px 1px #808080' }}>
            Show
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px', fontWeight: 'bold' }}>
          <label style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={without3rdPartyComm} onChange={function(e) { setWithout3rdPartyComm(e.target.checked); }} /> Without 3rd Party Hissa Comm
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={withoutHissa} onChange={function(e) { setWithoutHissa(e.target.checked); }} /> Without Hissa
          </label>
        </div>
      </div>

      {/* 3. Sub-Header Banner (DATE & NAME Header) */}
      <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '2px 0', letterSpacing: '1px' }}>
        DATE : {date} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NAME : {selectedAgent || '---'}
      </div>

      {/* 4. Main Summary Table Grid (Dark Bold Cells) */}
      <div style={{ flex: 1, background: '#fff', border: '1px solid #808080', overflowY: 'auto' }}>
        <table border="1" cellPadding="2" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '11px', borderColor: '#404040' }}>
          <thead>
            <tr style={{ background: '#d4d0c8', textAlign: 'center', fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>
              <th style={{ textAlign: 'left' }}>GAME</th>
              <th>RATE</th>
              <th>PATTI_PERC</th>
              <th>TOTAL_SALE</th>
              <th>D_SALE</th>
              <th>A_SALE</th>
              <th>COMM</th>
              <th>BALANCE</th>
              <th>WIN_AMOUNT</th>
              <th>WIN_NO</th>
              <th>WIN_AKHAR</th>
              <th>HISSA</th>
              <th>LENE</th>
              <th>DENE</th>
              <th>RESULT</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.length > 0 ? (
              summaryRows.map(function(row, idx) {
                return (
                  <tr key={idx} style={{ background: '#ffffff', fontWeight: 'bold' }}>
                    <td style={{ textAlign: 'left', fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>{row.game}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.rate}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.patti_perc}</td>
                    <td style={{ color: '#000', fontWeight: 'bold' }}>{row.total_sale}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.d_sale}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.a_sale}</td>
                    <td style={{ color: Number(row.comm) < 0 ? '#000' : '#000', fontWeight: 'bold' }}>{row.comm}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.balance}</td>
                    <td style={{ color: Number(row.win_amount) < 0 ? '#000' : '#000', fontWeight: 'bold' }}>{row.win_amount}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.win_no}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.win_akhar}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.hissa}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.lene}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.dene}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.res || '-'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="15" style={{ textAlign: 'center', color: '#777', padding: '20px', fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>
                  Select an Agent and click <strong>Show</strong> to view F7 Summary
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Bottom Calculations & Totals Area */}
      <div style={{ background: '#d4d0c8', padding: '4px', border: '1px solid #808080', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          
          {/* Left Box: D-SALE, A-SALE, WINJODA, WINAKHAR */}
          <div style={{ border: '1px solid #808080', padding: '4px 6px', width: '200px', background: '#d4d0c8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>D-SALE</span>
              <span>{totals.d_sale}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>A-SALE</span>
              <span>{totals.a_sale}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>WINJODA</span>
              <span>{totals.winjoda}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>WINAKHAR</span>
              <span>{totals.winakhar}</span>
            </div>
          </div>

          {/* Middle Table: Grand Totals */}
          <div style={{ border: '1px solid #808080', flex: 1, background: '#d4d0c8' }}>
            <table border="1" cellPadding="2" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', fontFamily: 'Tahoma, sans-serif', borderColor: '#808080' }}>
              <thead>
                <tr style={{ background: '#d4d0c8', fontWeight: 'bold' }}>
                  <th>TOTAL SALE</th>
                  <th>COMM</th>
                  <th>ACTUAL SALE</th>
                  <th>WINAMT</th>
                  <th>BALANCE</th>
                  <th>HISSA</th>
                  <th>NET BALANCE</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ fontWeight: 'bold', height: '28px', background: '#ffffff' }}>
                  <td>{totals.total_sale}</td>
                  <td>{totals.comm}</td>
                  <td>{totals.actual_sale}</td>
                  <td>{totals.winamt}</td>
                  <td>{totals.balance}</td>
                  <td>{totals.hissa}</td>
                  <td>{totals.net_balance_today}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Print Button Box */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', border: '1px solid #808080', padding: '4px', background: '#d4d0c8', width: '70px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Ctrl+P</span>
            <button onClick={function() { window.print(); }} style={{ padding: '2px 8px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
              Print
            </button>
          </div>

        </div>

        {/* Lower Row: OPENING, P&L, TODAY'S PAYMENT, NET BALANCE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d4d0c8', padding: '4px 10px', border: '1px solid #808080', fontWeight: 'bold', fontSize: '12px' }}>
          <div>
            <span>OPENING : </span>
            <span style={{ color: '#0000aa', fontSize: '13px' }}>{totals.opening}</span>
          </div>

          <div>
            <span>P&L: </span>
            <span style={{ color: Number(totals.pandl) < 0 ? '#cc0000' : '#000', fontSize: '13px' }}>{totals.pandl}</span>
          </div>

          <div>
            <span>TODAY'S PAYMENT/RECEIPT : </span>
            <span style={{ color: '#000', fontSize: '13px' }}>{totals.today_payment}</span>
          </div>

          <div>
            <span style={{ fontSize: '13px', color: '#000' }}>NET BALANCE : </span>
            <span style={{ color: '#000', fontSize: '14px' }}>{totals.final_net_balance}</span>
          </div>
        </div>

      </div>

    </div>
  );
}