import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculateLaddi, calculatePehada, calculateHaruf, parseBulkData } from '../utils/mathCalculators';
import { usePermission } from '../context/PermissionContext';
import WhatsAppPasteModal from '../components/common/WhatsAppPasteModal';

export default function VoucherSaleF2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = usePermission();

  // Dynamic Today Date Helper (DD/MM/YYYY)
  const getTodayFormattedDate = function() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  };

  const [date, setDate] = useState(getTodayFormattedDate());
  const [selectedGame, setSelectedGame] = useState('GB');
  const [availableGames, setAvailableGames] = useState(['GB', 'DN', 'FB', 'DS']);
  const [selectedParty, setSelectedParty] = useState('');

  const [masterParties, setMasterParties] = useState([]);
  const [savedVouchersList, setSavedVouchersList] = useState([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);

  // Editable Top Header Rates State
  const [dPcomm, setDPcomm] = useState('10');
  const [dAmt, setDAmt] = useState('90');
  const [aPcomm, setAPcomm] = useState('10');
  const [aAmt, setAAmt] = useState('9');
  const [pattiPerc, setPattiPerc] = useState('0');
  const [hissaParty, setHissaParty] = useState('');
  const [hissaPerc, setHissaPerc] = useState('0');

  const [focusedCell, setFocusedCell] = useState({ index: null, field: null });
  const [manualRows, setManualRows] = useState([{ no: '', amount: '' }]);
  const [formErrorMsg, setFormErrorMsg] = useState('');

  const [laddi, setLaddi] = useState({ from: '', to: '', amount: '' });
  const [pehada, setPehada] = useState({ text: '', amt: '', add3: false });
  const [haruf, setHaruf] = useState({ type: 'Bahar', no: '', amount: '' });
  const [equalAmt, setEqualAmt] = useState({ amt: '', no: '' });
  const [jode, setJode] = useState({ amt: '', include00: false });
  const [bulk, setBulk] = useState({ type: 'Bulk (F6)', nos: '', amt: '', palatAmt: '' });

  const [filterText, setFilterText] = useState('');
  const [uidText, setUidText] = useState('');

  // Move Dialog State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveData, setMoveData] = useState({ newDate: '', newGame: '', newParty: '' });
  const [movePartyRates, setMovePartyRates] = useState({ d_comm: '10', d_amt: '90', a_comm: '10', a_amt: '9', patti_perc: '0' });

  const hasProcessedImport = useRef(false);

  // Helper to jump cursor directly to grid bottom
  const focusGridBottom = function() {
    setTimeout(function() {
      const lastIndex = manualRows.length > 0 ? manualRows.length - 1 : 0;
      const targetElem = document.getElementById('no-input-' + lastIndex);
      if (targetElem) {
        targetElem.focus();
      }
    }, 30);
  };

  // Helper to restore focus back to party dropdown
  const restoreFocus = function() {
    setTimeout(function() {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      const el = document.getElementById('party-select-dropdown');
      if (el) {
        el.focus();
      }
    }, 50);
  };

  // Helper Down Arrow handler for top controls
  const handleTopControlKeyDown = function(e, nextFieldId) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusGridBottom();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldId) {
        const nextElem = document.getElementById(nextFieldId);
        if (nextElem) nextElem.focus();
      }
    }
  };

  // Auto-Save Unsaved Rows to LocalStorage
  useEffect(function() {
    if (manualRows && manualRows.length > 0) {
      const hasData = manualRows.some(function(r) { return r.no || r.amount; });
      if (hasData) {
        localStorage.setItem('f2_unsaved_rows', JSON.stringify(manualRows));
      }
    }
  }, [manualRows]);

  // Load Unsaved Data on Component Mount
  useEffect(function() {
    const savedData = localStorage.getItem('f2_unsaved_rows');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setManualRows(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  useEffect(function() {
    const handleKeyDown = function(e) {
      if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        setIsWhatsAppModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return function() { window.removeEventListener('keydown', handleKeyDown); };
  }, []);

  const handleConfirmWhatsAppEntries = async function(parsedData) {
    try {
      const detectedName = parsedData && parsedData.detectedPartyName ? parsedData.detectedPartyName : '';
      const currentParty = detectedName || selectedParty || 'kumar';
      const currentGame = selectedGame || 'DB';

      const currentUid = (typeof uid !== 'undefined' && uid) ? uid :
        (typeof userId !== 'undefined' && userId) ? userId :
          (typeof uidText !== 'undefined' && uidText) ? uidText : '1';

      if (detectedName && typeof setSelectedParty === 'function') {
        setSelectedParty(detectedName);
      }

      const payload = {
        userId: String(currentUid),
        marketName: currentGame,
        partyName: currentParty,
        entries: parsedData.parsedEntries,
        grandTotal: parsedData.grandTotal
      };

      const response = await fetch('https://yantri-desktop.onrender.com/api/whatsapp/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        const newFlatBets = [];
        if (parsedData && parsedData.parsedEntries) {
          parsedData.parsedEntries.forEach(function(item) {
            if (item.bets && Array.isArray(item.bets)) {
              item.bets.forEach(function(b) {
                newFlatBets.push({ no: String(b.number), amount: String(b.amount) });
              });
            } else if (item.number && item.amount) {
              newFlatBets.push({ no: String(item.number), amount: String(item.amount) });
            }
          });
        }

        setManualRows(function(prevRows) {
          const cleanPrevRows = prevRows.filter(function(r) { return r.no || r.amount; });
          return [...cleanPrevRows, ...newFlatBets, { no: '', amount: '' }];
        });

        setIsWhatsAppModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: Support Number & Haruf Codes (00-100, 1A, 2B, etc.)
  const isValidBetNumber = function(val) {
    if (!val) return true;
    const strVal = String(val).trim().toUpperCase();

    if (/^\d+$/.test(strVal)) {
      const num = parseInt(strVal, 10);
      if (num >= 0 && num <= 100) return true;

      if (strVal.length === 3 && strVal[0] === strVal[1] && strVal[1] === strVal[2]) return true;
      if (strVal.length === 4 && strVal[0] === strVal[1] && strVal[1] === strVal[2] && strVal[2] === strVal[3]) return true;

      return false;
    }

    if (/^\d+[AB\-]$/.test(strVal)) return true;

    return false;
  };

  const focusNextInput = function(e, nextId) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const elem = document.getElementById(nextId);
      if (elem) elem.focus();
    }
  };

  const handleDPcommChange = function(val) {
    if (selectedVoucherId) return;
    setDPcomm(val);
    const comm = parseFloat(val) || 0;
    setDAmt(String(100 - comm));
  };

  const handleAPcommChange = function(val) {
    if (selectedVoucherId) return;
    setAPcomm(val);
    const comm = parseFloat(val) || 0;
    setAAmt(String((100 - comm) / 10));
  };

  const handleMoveDPcommChange = function(val) {
    const comm = parseFloat(val) || 0;
    setMovePartyRates(function(prev) {
      return {
        ...prev,
        d_comm: val,
        d_amt: String(100 - comm)
      };
    });
  };

  const handleMoveAPcommChange = function(val) {
    const comm = parseFloat(val) || 0;
    setMovePartyRates(function(prev) {
      return {
        ...prev,
        a_comm: val,
        a_amt: String((100 - comm) / 10)
      };
    });
  };

  const appendEntriesToPageDownTable = function(newEntries) {
    if (!newEntries || newEntries.length === 0) return;

    setManualRows(function(prev) {
      const cleanPrevRows = prev.filter(function(r) { return r.no || r.amount; });
      const formattedNewEntries = newEntries.map(function(it) {
        return {
          no: String(it.no).trim(),
          amount: String(it.amount).trim()
        };
      });
      return [...cleanPrevRows, ...formattedNewEntries, { no: '', amount: '' }];
    });
    setFormErrorMsg('');
  };

  useEffect(function() {
    if (location.state && location.state.importedItems && location.state.importedItems.length > 0) {
      if (!hasProcessedImport.current) {
        hasProcessedImport.current = true;
        appendEntriesToPageDownTable(location.state.importedItems);
        window.history.replaceState({}, document.title);
      }
    } else {
      hasProcessedImport.current = false;
    }
  }, [location.state]);

  const handleEditInYantri = function() {
    navigate('/voucher-yantri', {
      state: {
        date: date,
        game: selectedGame,
        party: selectedParty
      }
    });
  };

  const fetchGlobalGames = function() {
    fetch('https://yantri-desktop.onrender.com/api/games')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && Array.isArray(data.games) && data.games.length > 0) {
          const gameNames = data.games.map(function(g) { return g.game_name; });
          setAvailableGames(gameNames);
          if (!gameNames.includes(selectedGame)) {
            setSelectedGame(gameNames[0]);
          }
        }
      })
      .catch(function(err) { console.error(err); });
  };

  const fetchMasterParties = function() {
    fetch('https://yantri-desktop.onrender.com/api/parties')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (Array.isArray(data) && data.length > 0) {
          setMasterParties(data);
          if (!selectedParty) {
            updatePartyRates(data[0]);
            setSelectedParty(data[0].party_name);
          }
        }
      })
      .catch(function(err) { console.error(err); });
  };

  const fetchSavedVouchers = function() {
    const summaryUrl = 'https://yantri-desktop.onrender.com/api/sales/summary?date=' + encodeURIComponent(date) + '&game=' + encodeURIComponent(selectedGame) + '&userId=' + encodeURIComponent(user?.id || '') + '&role=' + encodeURIComponent(user?.role || '');
    fetch(summaryUrl)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (Array.isArray(data)) {
          setSavedVouchersList(data);
        }
      })
      .catch(function(err) { console.error(err); });
  };

  useEffect(function() {
    fetchGlobalGames();
    fetchMasterParties();
  }, []);

  useEffect(function() { fetchSavedVouchers(); }, [date, selectedGame]);

  const updatePartyRates = function(partyObj) {
    if (partyObj) {
      setDPcomm(partyObj.d_comm !== undefined ? String(partyObj.d_comm) : '10');
      setDAmt(partyObj.d_amt !== undefined ? String(partyObj.d_amt) : '90');
      setAPcomm(partyObj.a_comm !== undefined ? String(partyObj.a_comm) : '10');
      setAAmt(partyObj.a_amt !== undefined ? String(partyObj.a_amt) : '9');
      setPattiPerc(partyObj.patti_perc !== undefined ? String(partyObj.patti_perc) : '0');
    }
  };

  const handlePartySelectChange = function(partyName) {
    if (selectedVoucherId) return;
    setSelectedParty(partyName);
    const found = masterParties.find(function(p) { return p.party_name === partyName; });
    if (found) updatePartyRates(found);
  };

  const handleMovePartyChange = function(partyName) {
    setMoveData(function(prev) { return { ...prev, newParty: partyName }; });
    const found = masterParties.find(function(p) { return p.party_name === partyName; });
    if (found) {
      setMovePartyRates({
        d_comm: found.d_comm !== undefined ? String(found.d_comm) : '10',
        d_amt: found.d_amt !== undefined ? String(found.d_amt) : '90',
        a_comm: found.a_comm !== undefined ? String(found.a_comm) : '10',
        a_amt: found.a_amt !== undefined ? String(found.a_amt) : '9',
        patti_perc: found.patti_perc !== undefined ? String(found.patti_perc) : '0'
      });
    }
  };

  const handleRowChange = function(index, field, value) {
    const updated = [...manualRows];
    updated[index][field] = value;
    setManualRows(updated);
    setFormErrorMsg('');
  };

  const handleKeyDown = function(e, index, field) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      focusGridBottom();
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      setManualRows(function(prev) {
        if (prev.length <= 1) {
          return [{ no: '', amount: '' }];
        }

        const updated = prev.filter(function(_, i) { return i !== index; });
        const nextIndex = index >= updated.length ? updated.length - 1 : index;

        setTimeout(function() {
          const nextInput = document.getElementById((field || 'no') + '-input-' + nextIndex);
          if (nextInput) {
            nextInput.focus();
            if (typeof nextInput.select === 'function') {
              nextInput.select();
            }
          }
        }, 30);

        return updated;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        const prevInput = document.getElementById(field + '-input-' + (index - 1));
        if (prevInput) {
          prevInput.focus();
          prevInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < manualRows.length - 1) {
        const nextInput = document.getElementById(field + '-input-' + (index + 1));
        if (nextInput) {
          nextInput.focus();
          nextInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'no') {
        const nextInput = document.getElementById('amt-input-' + index);
        if (nextInput) {
          nextInput.focus();
          nextInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else if (field === 'amount') {
        if (index === manualRows.length - 1) {
          setManualRows(function(prev) { return [...prev, { no: '', amount: '' }]; });
          setTimeout(function() {
            const addedInput = document.getElementById('no-input-' + (index + 1));
            if (addedInput) {
              addedInput.focus();
              addedInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 50);
        } else {
          const nextInput = document.getElementById('no-input-' + (index + 1));
          if (nextInput) {
            nextInput.focus();
            nextInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    }
  };

  const handleLaddiSubmit = function() {
    const entries = calculateLaddi(laddi.from, laddi.to, laddi.amount);
    appendEntriesToPageDownTable(entries);
    setLaddi({ from: '', to: '', amount: '' });
  };

  const handlePehadaSubmit = function() {
    const entries = calculatePehada(pehada.text, pehada.amt, pehada.add3);
    appendEntriesToPageDownTable(entries);
    setPehada({ text: '', amt: '', add3: false });
  };

  const handleHarufSubmit = function() {
    const entries = calculateHaruf(haruf.no, haruf.amount, haruf.type);
    appendEntriesToPageDownTable(entries);
    setHaruf({ type: 'Bahar', no: '', amount: '' });
  };

  const handleEqualAmtSubmit = function() {
    if (!equalAmt.no || !equalAmt.amt) return;
    let formatted = equalAmt.no.trim();
    if (Number(formatted) < 10 && formatted.length === 1) formatted = '0' + formatted;
    appendEntriesToPageDownTable([{ no: formatted, amount: equalAmt.amt }]);
    setEqualAmt({ ...equalAmt, no: '' });
    const noElem = document.getElementById('equal-no-input');
    if (noElem) noElem.focus();
  };

  const handleJodeSubmit = function() {
    if (!jode.amt) return;
    const list = ['11', '22', '33', '44', '55', '66', '77', '88', '99'];
    if (jode.include00) list.push('00');
    const entries = list.map(function(num) { return { no: num, amount: String(jode.amt) }; });
    appendEntriesToPageDownTable(entries);
    setJode({ amt: '', include00: false });
  };

  const handleBulkSubmit = function() {
    const entries = parseBulkData(bulk.type, bulk.nos, bulk.amt, bulk.palatAmt);
    appendEntriesToPageDownTable(entries);
    setBulk({ type: bulk.type, nos: '', amt: '', palatAmt: '' });
    setTimeout(function() {
      const nosElem = document.getElementById('bulk-nos-input');
      if (nosElem) nosElem.focus();
    }, 50);
  };

  const handleBulkNosChange = function(val) {
    if (bulk.type === 'Bulk (F6)') {
      let cleaned = val.replace(/[^0-9]/g, '');
      let formatted = '';
      for (let i = 0; i < cleaned.length; i++) {
        if (i > 0 && i % 2 === 0) formatted += '-';
        formatted += cleaned[i];
      }
      if (cleaned.length > 0 && cleaned.length % 2 === 0 && !val.endsWith('-')) {
        formatted += '-';
      }
      setBulk({ ...bulk, nos: formatted });
    } else {
      setBulk({ ...bulk, nos: val });
    }
  };

  const handleClearRows = function() {
    setManualRows([{ no: '', amount: '' }]);
    setSelectedVoucherId(null);
    setFormErrorMsg('');
    setHaruf({ type: 'Bahar', no: '', amount: '' });
    setLaddi({ from: '', to: '', amount: '' });
    setPehada({ text: '', amt: '', add3: false });
    setEqualAmt({ amt: '', no: '' });
    setJode({ amt: '', include00: false });
    setBulk({ type: 'Bulk (F6)', nos: '', amt: '' });
    localStorage.removeItem('f2_unsaved_rows');
  };

  const handleReplaceEqual = function() {
    const targetAmt = String(equalAmt.amt || '').trim();
    if (!targetAmt || isNaN(Number(targetAmt)) || Number(targetAmt) <= 0) {
      setFormErrorMsg('❌ Equal Amount Box me sahi amount dalein!');
      return;
    }

    setManualRows(function(prev) {
      return prev.map(function(row) {
        if (String(row.no || '').trim() !== '') {
          return { ...row, amount: targetAmt };
        }
        return row;
      });
    });
    setFormErrorMsg('');
  };

  const handleRemoveInvalids = function() {
    setManualRows(function(prev) {
      const cleaned = prev.filter(function(row) {
        const no = String(row.no || '').trim();
        const amt = Number(row.amount);
        return no !== '' && isValidBetNumber(no) && !isNaN(amt) && amt > 0;
      });
      return cleaned.length > 0 ? [...cleaned, { no: '', amount: '' }] : [{ no: '', amount: '' }];
    });
    setFormErrorMsg('');
  };

  const validateManualRowsSilently = function() {
    let hasIncompleteRow = false;
    let hasInvalidNumber = false;
    let hasAtLeastOneValid = false;

    manualRows.forEach(function(row) {
      const no = String(row.no || '').trim();
      const amt = String(row.amount || '').trim();

      if ((no !== '' && amt === '') || (no === '' && amt !== '')) {
        hasIncompleteRow = true;
      }
      if (no !== '' && amt !== '') {
        if (!isValidBetNumber(no)) {
          hasInvalidNumber = true;
        } else if (!isNaN(Number(amt)) && Number(amt) > 0) {
          hasAtLeastOneValid = true;
        }
      }
    });

    if (hasInvalidNumber) {
      setFormErrorMsg('❌ Check Red Boxes: Invalid Number Entered');
      return false;
    }
    if (hasIncompleteRow) {
      setFormErrorMsg('❌ Check Red Boxes: Empty Box Left');
      return false;
    }
    if (!hasAtLeastOneValid) {
      setFormErrorMsg('❌ No Entry Found to Save');
      return false;
    }

    setFormErrorMsg('');
    return true;
  };

  const handleSelectVoucherRow = function(voucher) {
    setSelectedVoucherId(voucher.sale_id);
    setSelectedParty(voucher.party_name);
    setFormErrorMsg('');
    updatePartyRates(voucher);

    fetch('https://yantri-desktop.onrender.com/api/sales/details/' + voucher.sale_id)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.items) {
          const formatted = data.items.map(function(it) {
            return {
              no: String(it.no),
              amount: String(it.amount)
            };
          });
          setManualRows([...formatted, { no: '', amount: '' }]);
        }
      })
      .catch(function(err) { console.error(err); });
  };

  const handleSave = function() {
    if (!selectedParty) {
      setFormErrorMsg('❌ Please Select Party');
      return;
    }
    if (!validateManualRowsSilently()) return;

    const validItems = [];
    manualRows.forEach(function(row) {
      if (row.no !== '' && row.amount !== '') {
        validItems.push({ number_val: String(row.no).trim(), amount: Number(row.amount) });
      }
    });

    const salePayload = {
      date: date,
      game: selectedGame,
      party: selectedParty,
      uid: user?.id || uidText || '1',
      d_comm: dPcomm,
      d_amt: dAmt,
      a_comm: aPcomm,
      a_amt: aAmt,
      patti_perc: pattiPerc,
      hissaParty: hissaParty,
      hissaPerc: hissaPerc,
      items: validItems
    };

    setFormErrorMsg('⏳ Saving...');

    fetch('https://yantri-desktop.onrender.com/api/sales/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Server response error');
        return res.json();
      })
      .then(function(data) {
        if (data && data.success) {
          handleClearRows();
          fetchSavedVouchers();
          setFormErrorMsg('');
          restoreFocus();
        } else {
          setFormErrorMsg('❌ Save Error: ' + (data.error || 'Server rejected save'));
        }
      })
      .catch(function(err) {
        console.error(err);
        setFormErrorMsg('❌ Connection Error with Server');
      });
  };

  const handleUpdate = function() {
    if (!selectedVoucherId) return;
    if (!validateManualRowsSilently()) return;

    const validItems = [];
    manualRows.forEach(function(row) {
      if (row.no !== '' && row.amount !== '') {
        validItems.push({ number_val: String(row.no).trim(), amount: Number(row.amount) });
      }
    });

    setFormErrorMsg('⏳ Updating...');

    fetch('https://yantri-desktop.onrender.com/api/sales/update/' + selectedVoucherId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        party: selectedParty,
        date: date,
        d_comm: dPcomm,
        d_amt: dAmt,
        a_comm: aPcomm,
        a_amt: aAmt,
        patti_perc: pattiPerc,
        hissaParty: hissaParty,
        hissaPerc: hissaPerc,
        items: validItems
      })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.success) {
          handleClearRows();
          fetchSavedVouchers();
          setFormErrorMsg('');
          restoreFocus();
        } else {
          setFormErrorMsg('❌ Update Error: ' + (data.error || 'Failed'));
        }
      })
      .catch(function(err) {
        console.error(err);
        setFormErrorMsg('❌ Connection Error with Server during update');
      });
  };

  const handleCopy = function() {
    if (!selectedVoucherId && manualRows.length <= 1) return;
    setSelectedVoucherId(null);
    const partyElem = document.getElementById('party-select-dropdown');
    if (partyElem) partyElem.focus();
  };

  const handleDelete = function() {
    if (!selectedVoucherId) return;
    fetch('https://yantri-desktop.onrender.com/api/sales/delete/' + selectedVoucherId, {
      method: 'DELETE'
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.success) {
          handleClearRows();
          fetchSavedVouchers();
          restoreFocus();
        }
      })
      .catch(function(err) { console.error(err); });
  };

  const handleOpenMoveModal = function() {
    if (!selectedVoucherId) return;
    setMoveData({ newDate: date, newGame: selectedGame, newParty: selectedParty });
    
    const currentVoucher = savedVouchersList.find(function(v) { return v.sale_id === selectedVoucherId; });
    if (currentVoucher) {
      setMovePartyRates({
        d_comm: currentVoucher.d_comm !== undefined ? String(currentVoucher.d_comm) : dPcomm,
        d_amt: currentVoucher.d_amt !== undefined ? String(currentVoucher.d_amt) : dAmt,
        a_comm: currentVoucher.a_comm !== undefined ? String(currentVoucher.a_comm) : aPcomm,
        a_amt: currentVoucher.a_amt !== undefined ? String(currentVoucher.a_amt) : aAmt,
        patti_perc: currentVoucher.patti_perc !== undefined ? String(currentVoucher.patti_perc) : pattiPerc
      });
    } else {
      const found = masterParties.find(function(p) { return p.party_name === selectedParty; });
      if (found) {
        setMovePartyRates({
          d_comm: found.d_comm !== undefined ? String(found.d_comm) : '10',
          d_amt: found.d_amt !== undefined ? String(found.d_amt) : '90',
          a_comm: found.a_comm !== undefined ? String(found.a_comm) : '10',
          a_amt: found.a_amt !== undefined ? String(found.a_amt) : '9',
          patti_perc: found.patti_perc !== undefined ? String(found.patti_perc) : '0'
        });
      }
    }
    setIsMoveModalOpen(true);

    setTimeout(function() {
      const elem = document.getElementById('move-date');
      if (elem) elem.focus();
    }, 50);
  };

  const handleConfirmMove = function() {
    if (!moveData.newDate || !moveData.newGame || !moveData.newParty) return;

    const payload = {
      newDate: moveData.newDate,
      newGame: moveData.newGame,
      newParty: moveData.newParty,
      d_comm: movePartyRates.d_comm,
      d_amt: movePartyRates.d_amt,
      a_comm: movePartyRates.a_comm,
      a_amt: movePartyRates.a_amt,
      patti_perc: movePartyRates.patti_perc
    };

    fetch('https://yantri-desktop.onrender.com/api/sales/move/' + selectedVoucherId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.success) {
          setIsMoveModalOpen(false);
          handleClearRows();
          fetchSavedVouchers();
          restoreFocus();
        }
      })
      .catch(function(err) { console.error(err); });
  };

  useEffect(function() {
    const handleBeforeUnload = function(e) {
      const hasData = manualRows.some(function(r) { return r.no || r.amount; });
      if (hasData) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return function() { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [manualRows]);

  // SMART KEYBOARD SHORTCUT LISTENER
  useEffect(function() {
    const handleGlobalShortcut = function(e) {
      const activeElem = document.activeElement;

      // 1. Allow Dropdown Navigation without Jumping
      if (activeElem && (activeElem.id === 'party-select-dropdown' || activeElem.tagName === 'SELECT')) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
          return;
        }
      }

      // 2. Ctrl + P Handler
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        const partyElem = document.getElementById('party-select-dropdown');
        if (partyElem) partyElem.focus();
        return;
      }

      // 3. PageDown Grid Esc Key
      if (activeElem && activeElem.id && activeElem.id.startsWith('no-input-')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          focusGridBottom();
          return;
        }
      }

      if (['F1', 'F3', 'F4', 'F5', 'F12'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedVoucherId) {
          handleUpdate();
        } else {
          handleSave();
        }
        return;
      }

      const isInsideBulk = activeElem && (
        activeElem.id === 'bulk-nos-input' ||
        activeElem.id === 'bulk-amt-input' ||
        activeElem.id === 'bulk-type-select' ||
        activeElem.tagName === 'TEXTAREA'
      );

      if (isInsideBulk) {
        if (['F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();

          if (e.key === 'F6') setBulk(function(b) { return { ...b, type: 'Bulk (F6)' }; });
          else if (e.key === 'F7') setBulk(function(b) { return { ...b, type: 'Ander Akhar (eq. 1579)-F7' }; });
          else if (e.key === 'F8') setBulk(function(b) { return { ...b, type: 'Bahar Akhar (eq. 1579)-F8' }; });
          else if (e.key === 'F9') setBulk(function(b) { return { ...b, type: 'Crossing with Jode-F9' }; });
          else if (e.key === 'F10') setBulk(function(b) { return { ...b, type: 'Crossing without Jode-F10' }; });
          else if (e.key === 'F11') setBulk(function(b) { return { ...b, type: 'Palat-F11' }; });
          else if (e.key === 'F12') setBulk(function(b) { return { ...b, type: 'Ander/Bahar Akhar (eq. 1579)-F12' }; });
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'l') { e.preventDefault(); const elem = document.getElementById('laddi-from-input'); if (elem) elem.focus(); }
        else if (key === 'h') { e.preventDefault(); const elem = document.getElementById('haruf-no-input'); if (elem) elem.focus(); }
        else if (key === 'e') { e.preventDefault(); const elem = document.getElementById('equal-amt-input'); if (elem) elem.focus(); }
        else if (key === 'b') { e.preventDefault(); const elem = document.getElementById('bulk-nos-input'); if (elem) elem.focus(); }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut, true);
    return function() { window.removeEventListener('keydown', handleGlobalShortcut, true); };
  }, [selectedParty, selectedGame, date, manualRows, selectedVoucherId]);

  const msgSubTotal = manualRows.reduce(function(sum, row) { return sum + (Number(row.amount) || 0); }, 0);
  const rightTableOverallTotal = savedVouchersList.reduce(function(sum, item) { return sum + (Number(item.party_total) || 0); }, 0);

  const filteredVouchers = savedVouchersList.filter(function(p) {
    const matchesFilter = p.party_name ? p.party_name.toLowerCase().includes(filterText.toLowerCase()) : true;
    const matchesUid = uidText ? String(p.uid || '').includes(uidText) : true;
    return matchesFilter && matchesUid;
  });
return (
    <div style={{ padding: '4px', background: '#d4d0c8', height: 'calc(100vh - 45px)', fontSize: '11px', fontFamily: 'Tahoma, "MS Sans Serif", Arial, sans-serif', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', color: '#000', userSelect: 'none', overflow: 'hidden' }}>

      {/* 1. Header Control Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#d4d0c8', padding: '4px 6px', border: '2px groove #fff', marginBottom: '4px', flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Date (F2): </span>
          <input
            id="f2-date"
            type="text"
            value={date}
            onChange={function(e) { setDate(e.target.value); }}
            onKeyDown={function(e) { handleTopControlKeyDown(e, 'f2-game'); }}
            style={{ width: '80px', fontSize: '11px', fontWeight: 'bold', border: '2px inset #fff', padding: '2px', outline: 'none' }}
          />
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Game: </span>
          <select
            id="f2-game"
            value={selectedGame}
            onChange={function(e) { setSelectedGame(e.target.value); }}
            onKeyDown={function(e) { handleTopControlKeyDown(e, 'party-select-dropdown'); }}
            style={{ fontSize: '11px', fontWeight: 'bold', border: '2px inset #fff', padding: '1px', width: '60px', outline: 'none' }}
          >
            {availableGames.map(function(gName, idx) {
              return <option key={idx} value={gName}>{gName}</option>;
            })}
          </select>
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Party : (Ctrl + P) </span>
          <select
            id="party-select-dropdown"
            value={selectedParty}
            disabled={!!selectedVoucherId}
            onChange={function(e) { handlePartySelectChange(e.target.value); }}
            onKeyDown={function(e) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.stopPropagation();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const firstInput = document.getElementById('no-input-0');
                if (firstInput) {
                  firstInput.focus();
                }
              }
            }}
            style={{ width: '180px', fontSize: '11px', fontWeight: 'bold', border: '2px inset #fff', padding: '1px', background: selectedVoucherId ? '#f0f0f0' : '#fff', outline: 'none' }}
          >
            {masterParties.map(function(p) {
              return <option key={p.pno || p.id} value={p.party_name}>{p.party_name}</option>;
            })}
          </select>
        </div>

        {/* EDITABLE BLUE RATES HEADER BOX */}
        <div style={{ border: '2px inset #fff', background: selectedVoucherId ? '#f0f0f0' : '#fff', display: 'flex', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
            <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '2px 4px', fontWeight: 'bold' }}>D_PComm</div>
            <input id="f2-dpcomm" type="text" readOnly={!!selectedVoucherId} value={dPcomm} onChange={function(e) { handleDPcommChange(e.target.value); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'f2-damt'); }} style={{ width: '40px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', background: selectedVoucherId ? '#f0f0f0' : '#fff', outline: 'none' }} />
          </div>

          <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
            <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '2px 4px', fontWeight: 'bold' }}>D_Amt</div>
            <input id="f2-damt" type="text" readOnly={!!selectedVoucherId} value={dAmt} onChange={function(e) { setDAmt(e.target.value); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'f2-apcomm'); }} style={{ width: '45px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', background: '#f0f0f0', outline: 'none' }} />
          </div>

          <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
            <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '2px 4px', fontWeight: 'bold' }}>A_PComm</div>
            <input id="f2-apcomm" type="text" readOnly={!!selectedVoucherId} value={aPcomm} onChange={function(e) { handleAPcommChange(e.target.value); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'f2-aamt'); }} style={{ width: '40px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', background: selectedVoucherId ? '#f0f0f0' : '#fff', outline: 'none' }} />
          </div>

          <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
            <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '2px 4px', fontWeight: 'bold' }}>A_Amt</div>
            <input id="f2-aamt" type="text" readOnly={!!selectedVoucherId} value={aAmt} onChange={function(e) { setAAmt(e.target.value); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'f2-patti'); }} style={{ width: '45px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', background: '#f0f0f0', outline: 'none' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '2px 4px', fontWeight: 'bold' }}>Patti_Perc</div>
            <input id="f2-patti" type="text" readOnly={!!selectedVoucherId} value={pattiPerc} onChange={function(e) { setPattiPerc(e.target.value); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'no-input-0'); }} style={{ width: '35px', textAlign: 'center', border: 'none', fontSize: '12px', fontWeight: 'bold', background: selectedVoucherId ? '#f0f0f0' : '#fff', outline: 'none' }} />
          </div>
        </div>

        {/* HISSA BOX */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11px', padding: '2px', border: '2px groove #fff', background: '#d4d0c8' }}>
          <span style={{ fontWeight: 'bold' }}>Hissa Party:</span>
          <select value={hissaParty} onChange={function(e) { setHissaParty(e.target.value); }} style={{ width: '90px', fontSize: '11px', border: '2px inset #fff', outline: 'none' }}>
            <option value="">-- Choose --</option>
            {masterParties.map(function(p) {
              return <option key={p.pno || p.id} value={p.party_name}>{p.party_name}</option>;
            })}
          </select>
          <span style={{ fontWeight: 'bold' }}>%</span>
          <input type="text" value={hissaPerc} onChange={function(e) { setHissaPerc(e.target.value); }} style={{ width: '30px', fontSize: '11px', border: '2px inset #fff', outline: 'none' }} />
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div style={{ display: 'flex', gap: '4px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left PageDown Table (Fixed Layout) */}
        <div style={{ width: '180px', background: '#8098b8', border: '2px inset #fff', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px', marginBottom: '2px', flexShrink: 0 }}>
            <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#fff' }}>(PageDown)</span>
            <button onClick={handleClearRows} style={{ fontSize: '10px', padding: '2px 8px', cursor: 'pointer', background: '#d4d0c8', border: '2px outset #fff', fontWeight: 'bold' }}>Clear</button>
          </div>

          <div style={{ flex: 1, background: '#fff', border: '2px inset #fff', overflowY: 'scroll', minHeight: 0 }}>
            <table border="1" cellPadding="0" cellSpacing="0" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center', borderColor: '#ccc' }}>
              <thead>
                <tr style={{ background: '#d4d0c8', height: '20px', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ width: '45%', borderRight: '1px solid #aaa' }}>No</th>
                  <th style={{ width: '55%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {manualRows.map(function(row, idx) {
                  const noVal = String(row.no || '').trim();
                  const amtVal = String(row.amount || '').trim();
                  const isNoInvalid = noVal !== '' && !isValidBetNumber(noVal);
                  const isIncomplete = (noVal !== '' && amtVal === '') || (noVal === '' && amtVal !== '');

                  return (
                    <tr key={idx} style={{ height: '18px' }}>
                      <td style={{ border: '1px solid #ccc', padding: '0', width: '45%' }}>
                        <input
                          id={'no-input-' + idx}
                          type="text"
                          value={row.no}
                          onFocus={function() { setFocusedCell({ index: idx, field: 'no' }); }}
                          onBlur={function() { setFocusedCell({ index: null, field: null }); }}
                          onChange={function(e) { handleRowChange(idx, 'no', e.target.value); }}
                          onKeyDown={function(e) { handleKeyDown(e, idx, 'no'); }}
                          style={{ width: '100%', height: '16px', textAlign: 'center', fontSize: '12px', outline: 'none', border: isNoInvalid || (isIncomplete && noVal === '') ? '2px solid red' : 'none', background: isNoInvalid ? '#ffcccc' : focusedCell.index === idx && focusedCell.field === 'no' ? '#000080' : 'transparent', color: isNoInvalid ? '#cc0000' : (focusedCell.index === idx && focusedCell.field === 'no' ? '#ffffff' : '#000'), fontWeight: 'bold', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '0', width: '55%' }}>
                        <input
                          id={'amt-input-' + idx}
                          type="text"
                          value={row.amount}
                          onFocus={function() { setFocusedCell({ index: idx, field: 'amount' }); }}
                          onBlur={function() { setFocusedCell({ index: null, field: null }); }}
                          onChange={function(e) { handleRowChange(idx, 'amount', e.target.value); }}
                          onKeyDown={function(e) { handleKeyDown(e, idx, 'amount'); }}
                          style={{ width: '100%', height: '16px', textAlign: 'center', fontSize: '12px', outline: 'none', border: isIncomplete && amtVal === '' ? '2px solid red' : 'none', background: isIncomplete && amtVal === '' ? '#ffcccc' : focusedCell.index === idx && focusedCell.field === 'amount' ? '#000080' : 'transparent', color: focusedCell.index === idx && focusedCell.field === 'amount' ? '#ffffff' : '#0000aa', fontWeight: 'bold', boxSizing: 'border-box' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#d4d0c8', border: '2px groove #fff', padding: '3px 4px', marginTop: '2px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>
            SubTotal: {msgSubTotal}
          </div>
        </div>

        {/* Center Entry Panels */}
        <div style={{ flex: 1, border: '2px inset #fff', padding: '6px', background: '#fce8e8', display: 'flex', flexDirection: 'column', gap: '6px', boxSizing: 'border-box', overflowY: 'auto', minHeight: 0 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', flexShrink: 0 }}>
            <div style={{ border: '2px groove #e0c0c0', background: '#fdf3f3', padding: '6px' }}>
              <strong style={{ fontSize: '11px', color: '#000' }}>Laddi (Ctrl+L)</strong>
              <div style={{ marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>No From: </span>
                <input id="laddi-from-input" type="text" style={{ width: '55px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={laddi.from} onChange={function(e) { setLaddi({ ...laddi, from: e.target.value }); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'laddi-to-input'); }} />
                <span>No To: </span>
                <input id="laddi-to-input" type="text" style={{ width: '55px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={laddi.to} onChange={function(e) { setLaddi({ ...laddi, to: e.target.value }); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'laddi-amt-input'); }} />
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>Amount: </span>
                <input id="laddi-amt-input" type="text" style={{ width: '70px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={laddi.amount} onChange={function(e) { setLaddi({ ...laddi, amount: e.target.value }); }} onKeyDown={function(e) { if (e.key === 'ArrowDown') { e.preventDefault(); focusGridBottom(); return; } if (e.key === 'Enter') { e.preventDefault(); handleLaddiSubmit(); } }} />
              </div>
            </div>

            <div style={{ border: '2px groove #e0c0c0', background: '#fdf3f3', padding: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '11px', color: '#000' }}>Pehada</strong>
                <label style={{ fontSize: '11px' }}><input type="checkbox" checked={pehada.add3} onChange={function(e) { setPehada({ ...pehada, add3: e.target.checked }); }} /> Add 3</label>
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>Pehada: </span>
                <input type="text" style={{ width: '60px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={pehada.text} onChange={function(e) { setPehada({ ...pehada, text: e.target.value }); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'pehada-amt-input'); }} />
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>Amt: </span>
                <input id="pehada-amt-input" type="text" style={{ width: '60px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={pehada.amt} onChange={function(e) { setPehada({ ...pehada, amt: e.target.value }); }} onKeyDown={function(e) { if (e.key === 'ArrowDown') { e.preventDefault(); focusGridBottom(); return; } if (e.key === 'Enter') { e.preventDefault(); handlePehadaSubmit(); } }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', flexShrink: 0 }}>
            <div style={{ border: '2px groove #e0c0c0', background: '#fdf3f3', padding: '6px' }}>
              <strong style={{ fontSize: '11px', color: '#000' }}>Haruf (Ctrl+H)</strong>
              <div style={{ marginTop: '2px', display: 'flex', gap: '8px' }}>
                <label><input type="radio" name="hrf" checked={haruf.type === 'Bahar'} onChange={function() { setHaruf({ ...haruf, type: 'Bahar' }); }} /> Bahar</label>
                <label><input type="radio" name="hrf" checked={haruf.type === 'Ander'} onChange={function() { setHaruf({ ...haruf, type: 'Ander' }); }} /> Ander</label>
              </div>
              <div style={{ marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>No: </span>
                <input id="haruf-no-input" type="text" style={{ width: '50px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={haruf.no} onChange={function(e) { setHaruf({ ...haruf, no: e.target.value }); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'haruf-amt-input'); }} />
              </div>
              <div style={{ marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>Amount: </span>
                <input id="haruf-amt-input" type="text" style={{ width: '50px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={haruf.amount} onChange={function(e) { setHaruf({ ...haruf, amount: e.target.value }); }} onKeyDown={function(e) { if (e.key === 'ArrowDown') { e.preventDefault(); focusGridBottom(); return; } if (e.key === 'Enter') { e.preventDefault(); handleHarufSubmit(); } }} />
              </div>
            </div>

            <div style={{ border: '2px groove #e0c0c0', background: '#fdf3f3', padding: '6px' }}>
              <strong style={{ fontSize: '11px', color: '#000' }}>Equal Amount (Ctrl+E)</strong>
              <div style={{ marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>Amt: </span>
                <input id="equal-amt-input" type="text" style={{ width: '55px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={equalAmt.amt} onChange={function(e) { setEqualAmt({ ...equalAmt, amt: e.target.value }); }} onKeyDown={function(e) { handleTopControlKeyDown(e, 'equal-no-input'); }} />
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>No: </span>
                <input id="equal-no-input" type="text" style={{ width: '55px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={equalAmt.no} onChange={function(e) { setEqualAmt({ ...equalAmt, no: e.target.value }); }} onKeyDown={function(e) { if (e.key === 'ArrowDown') { e.preventDefault(); focusGridBottom(); return; } if (e.key === 'Enter') { e.preventDefault(); handleEqualAmtSubmit(); } }} />
              </div>
            </div>

            <div style={{ border: '2px groove #e0c0c0', background: '#fdf3f3', padding: '6px' }}>
              <strong style={{ fontSize: '11px', color: '#000' }}>Jode</strong>
              <div style={{ marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>Amt: </span>
                <input type="text" style={{ width: '55px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }} value={jode.amt} onChange={function(e) { setJode({ ...jode, amt: e.target.value }); }} onKeyDown={function(e) { if (e.key === 'ArrowDown') { e.preventDefault(); focusGridBottom(); return; } if (e.key === 'Enter') { e.preventDefault(); handleJodeSubmit(); } }} />
              </div>
              <div style={{ marginTop: '6px' }}>
                <label style={{ fontSize: '11px' }}><input type="checkbox" checked={jode.include00} onChange={function(e) { setJode({ ...jode, include00: e.target.checked }); }} /> Include 00</label>
              </div>
            </div>
          </div>

          <div style={{ border: '2px groove #e0c0c0', padding: '6px', background: '#fdf3f3', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', height: '110px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <strong style={{ fontSize: '11px' }}>BULK (Ctrl+B)</strong>
              <span style={{ color: '#800000', fontWeight: 'bold' }}>Type</span>
              <select value={bulk.type} onChange={function(e) { setBulk({ ...bulk, type: e.target.value }); }} style={{ fontSize: '11px', border: '2px inset #fff', outline: 'none', flex: 1 }}>
                <option value="Bulk (F6)">Bulk (F6)</option>
                <option value="Ander Akhar (eq. 1579)-F7">Ander Akhar (eq. 1579)-F7</option>
                <option value="Bahar Akhar (eq. 1579)-F8">Bahar Akhar (eq. 1579)-F8</option>
                <option value="Crossing with Jode-F9">Crossing with Jode-F9</option>
                <option value="Crossing without Jode-F10">Crossing without Jode-F10</option>
                <option value="Palat-F11">Palat-F11</option>
                <option value="Ander/Bahar Akhar (eq. 1579)-F12">Ander/Bahar Akhar (eq. 1579)-F12</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flex: 1 }}>
              <span style={{ color: '#800000', fontWeight: 'bold', paddingTop: '2px' }}>No's</span>
              <textarea
                id="bulk-nos-input"
                style={{ flex: 1, resize: 'none', fontSize: '12px', fontFamily: 'monospace', border: '2px inset #fff', padding: '2px', boxSizing: 'border-box', outline: 'none', height: '100%' }}
                value={bulk.nos}
                onChange={function(e) { handleBulkNosChange(e.target.value); }}
                onKeyDown={function(e) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); focusGridBottom(); return; }
                  if (e.key === 'Backspace' && bulk.type === 'Bulk (F6)') {
                    if (bulk.nos.endsWith('-')) { e.preventDefault(); setBulk({ ...bulk, nos: bulk.nos.slice(0, -2) }); return; }
                  }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const amtElem = document.getElementById('bulk-amt-input'); if (amtElem) amtElem.focus(); }
                }}
              ></textarea>
            </div>

            <div style={{ textAlign: 'right', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#800000', fontWeight: 'bold' }}>Amt : </span>
              <input
                id="bulk-amt-input"
                type="text"
                value={bulk.amt || ''}
                onChange={function(e) { setBulk({ ...bulk, amt: e.target.value }); }}
                onKeyDown={function(e) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    focusGridBottom();
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (bulk.type === 'Palat-F11') {
                      const palatElem = document.getElementById('bulk-palat-amt-input');
                      if (palatElem) palatElem.focus();
                    } else {
                      handleBulkSubmit();
                    }
                  }
                }}
                style={{ width: '60px', height: '18px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }}
              />

              {bulk.type === 'Palat-F11' && (
                <React.Fragment>
                  <span style={{ marginLeft: '4px', color: '#800000', fontWeight: 'bold' }}>Palat Amt : </span>
                  <input
                    id="bulk-palat-amt-input"
                    type="text"
                    value={bulk.palatAmt || ''}
                    onChange={function(e) { setBulk({ ...bulk, palatAmt: e.target.value }); }}
                    onKeyDown={function(e) {
                      if (e.key === 'ArrowDown') { e.preventDefault(); focusGridBottom(); return; }
                      if (e.key === 'Enter') { e.preventDefault(); handleBulkSubmit(); }
                    }}
                    style={{ width: '60px', height: '18px', fontSize: '12px', border: '2px inset #fff', outline: 'none' }}
                  />
                </React.Fragment>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: 'transparent', marginTop: 'auto', paddingTop: '4px', flexShrink: 0 }}>
            <div style={{ color: '#800000', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={handleEditInYantri} style={{ background: '#d4d0c8', color: '#000', border: '2px outset #fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', padding: '2px 8px' }}>
                  Edit in Yantri
                </button>
                <span style={{ color: '#800000', fontSize: '12px', fontWeight: 'bold' }}>{msgSubTotal}</span>
              </div>
              <div style={{ marginTop: '2px', color: '#b08080' }}>111 OR 1B 1- Bahar</div>
              <div style={{ color: '#b08080' }}>1111 OR 1A 1- Ander</div>
            </div>

            {formErrorMsg && (
              <div style={{ color: '#cc0000', fontWeight: 'bold', fontSize: '11px', padding: '2px 6px', background: '#ffe6e6', border: '1px solid #ff9999' }}>
                {formErrorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedVoucherId ? (
                <React.Fragment>
                  <button onClick={handleUpdate} style={{ background: '#d4d0c8', border: '2px outset #fff', padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', color: '#000' }}>Update 💾</button>
                  <button onClick={handleCopy} style={{ background: '#d4d0c8', border: '2px outset #fff', padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', color: '#000' }}>Copy 📄</button>
                  <button onClick={handleOpenMoveModal} style={{ background: '#d4d0c8', border: '2px outset #fff', padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer', color: '#000', fontSize: '12px' }}>Move 🔄</button>
                  <button onClick={handleDelete} style={{ background: '#d4d0c8', border: '2px outset #fff', padding: '4px 12px', cursor: 'pointer', color: '#cc0000', fontSize: '12px', fontWeight: 'bold' }}>🗑️ Delete</button>
                </React.Fragment>
              ) : (
                <button onClick={handleSave} style={{ background: '#d4d0c8', border: '2px outset #fff', padding: '4px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', color: '#000' }}>Save 💾</button>
              )}

              <button onClick={handleReplaceEqual} style={{ background: '#d4d0c8', border: '2px outset #fff', cursor: 'pointer', fontSize: '11px', color: '#000', padding: '4px 8px', fontWeight: 'bold' }}>Replace Equal (=)</button>
              <button onClick={handleRemoveInvalids} style={{ background: '#d4d0c8', border: '2px outset #fff', cursor: 'pointer', fontSize: '11px', color: '#000', padding: '4px 8px', fontWeight: 'bold' }}>Remove</button>
            </div>
          </div>

        </div>

        {/* Right Saved Vouchers Table (Fixed Layout) */}
        <div style={{ width: '480px', background: '#8098b8', border: '2px inset #fff', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', padding: '4px', fontSize: '11px', background: '#d4d0c8', borderBottom: '2px groove #fff', flexShrink: 0 }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Filter (Alt + F) </span>
              <input type="text" value={filterText} onChange={function(e) { setFilterText(e.target.value); }} style={{ width: '120px', fontSize: '11px', border: '2px inset #fff', background: '#fff', outline: 'none' }} />
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>UID </span>
              <input type="text" value={uidText} onChange={function(e) { setUidText(e.target.value); }} style={{ width: '50px', fontSize: '11px', border: '2px inset #fff', background: '#fff', outline: 'none' }} />
            </div>
          </div>

          <div style={{ flex: 1, background: '#fff', border: '2px inset #fff', overflowX: 'auto', overflowY: 'scroll', minHeight: 0 }}>
            <table border="1" cellPadding="2" cellSpacing="0" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px', minWidth: '450px', borderColor: '#ccc' }}>
              <thead>
                <tr style={{ background: '#d4d0c8', position: 'sticky', top: 0, zIndex: 1, textAlign: 'center' }}>
                  <th style={{ width: '35px', fontWeight: 'bold', border: '1px outset #fff' }}>SrNo</th>
                  <th style={{ fontWeight: 'bold', textAlign: 'left', paddingLeft: '4px', border: '1px outset #fff' }}>Name</th>
                  <th style={{ width: '85px', fontWeight: 'bold', border: '1px outset #fff' }}>Rate</th>
                  <th style={{ width: '35px', fontWeight: 'bold', border: '1px outset #fff' }}>UID</th>
                  <th style={{ fontWeight: 'bold', border: '1px outset #fff' }}>EntryDateTime</th>
                  <th style={{ width: '50px', fontWeight: 'bold', border: '1px outset #fff' }}>Hissa %</th>
                  <th style={{ width: '60px', fontWeight: 'bold', textAlign: 'right', paddingRight: '4px', border: '1px outset #fff' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map(function(item, idx) {
                  const isSelected = selectedVoucherId === item.sale_id;
                  const rateStr = (item.d_comm || 10) + '/' + (item.d_amt || 90) + '-' + (item.a_comm || 10) + '/' + (item.a_amt || 9);
                  const displayPatti = (item.patti_perc !== undefined && item.patti_perc !== null) ? item.patti_perc : (item.third_party_hissa || '0');
                  
                  return (
                    <tr
                      key={item.sale_id || idx}
                      onClick={function() { handleSelectVoucherRow(item); }}
                      style={{
                        background: isSelected ? '#000080' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#000000',
                        cursor: 'pointer',
                        height: '18px'
                      }}
                    >
                      <td style={{ textAlign: 'center', border: '1px solid #eee' }}>{idx + 1}</td>
                      <td style={{ paddingLeft: '4px', border: '1px solid #eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.party_name || selectedParty}</td>
                      <td style={{ textAlign: 'center', fontSize: '10px', border: '1px solid #eee' }}>{rateStr}</td>
                      <td style={{ textAlign: 'center', border: '1px solid #eee' }}>{item.uid || '1'}</td>
                      <td style={{ textAlign: 'center', fontSize: '10px', border: '1px solid #eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.entry_date_time || '-'}</td>
                      <td style={{ textAlign: 'center', border: '1px solid #eee' }}>{displayPatti + '%'}</td>
                      <td style={{ textAlign: 'right', paddingRight: '4px', border: '1px solid #eee' }}>{item.party_total || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '2px', padding: '4px', textAlign: 'right', fontSize: '12px', background: '#d4d0c8', border: '2px groove #fff', flexShrink: 0 }}>
            <span style={{ color: '#800000', fontWeight: 'bold' }}>Total Amount : </span>
            <span style={{ color: '#800000', fontSize: '14px', fontWeight: 'bold' }}>{rightTableOverallTotal}</span>
          </div>
        </div>

      </div>

      {/* MOVE VOUCHER POPUP MODAL */}
      {isMoveModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#d4d0c8', border: '3px outset #fff', boxShadow: '4px 4px 12px rgba(0,0,0,0.6)', padding: '2px', width: '600px', fontFamily: 'Tahoma, sans-serif' }}>
            
            <div style={{ background: '#000080', color: '#fff', padding: '4px 6px', fontSize: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔄</span>
                <span>Move Voucher</span>
              </div>
              <button onClick={function() { setIsMoveModalOpen(false); }} style={{ background: '#d4d0c8', color: '#000', border: '2px outset #fff', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: '12px', padding: 0, fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ padding: '12px 8px', background: '#d4d0c8' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', fontSize: '11px' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Date: </span>
                  <input id="move-date" type="text" value={moveData.newDate} onChange={function(e) { setMoveData({ ...moveData, newDate: e.target.value }); }} onKeyDown={function(e) { focusNextInput(e, 'move-game'); }} style={{ width: '80px', fontSize: '12px', fontWeight: 'bold', border: '2px inset #fff', padding: '2px 4px', outline: 'none', background: '#fff', color: '#000' }} />
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Game: </span>
                  <select id="move-game" value={moveData.newGame} onChange={function(e) { setMoveData({ ...moveData, newGame: e.target.value }); }} onKeyDown={function(e) { focusNextInput(e, 'move-party'); }} style={{ fontSize: '12px', fontWeight: 'bold', border: '2px inset #fff', padding: '2px', background: '#fff', outline: 'none', width: '70px' }}>
                    {availableGames.map(function(gName, idx) { return <option key={idx} value={gName}>{gName}</option>; })}
                  </select>
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Party: </span>
                  <select id="move-party" value={moveData.newParty} onChange={function(e) { handleMovePartyChange(e.target.value); }} onKeyDown={function(e) { focusNextInput(e, 'move-dpcomm'); }} style={{ width: '180px', fontSize: '12px', fontWeight: 'bold', border: '2px inset #fff', padding: '2px', background: '#fff', outline: 'none' }}>
                    {masterParties.map(function(p) { return <option key={p.pno || p.id} value={p.party_name}>{p.party_name}</option>; })}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ border: '2px inset #fff', background: '#fff', display: 'flex', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
                    <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '1px 4px', fontWeight: 'bold' }}>D_PComm</div>
                    <input id="move-dpcomm" type="text" value={movePartyRates.d_comm} onChange={function(e) { handleMoveDPcommChange(e.target.value); }} onKeyDown={function(e) { focusNextInput(e, 'move-damt'); }} style={{ width: '40px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', background: '#fff', color: '#000', outline: 'none' }} />
                  </div>
                  <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
                    <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '1px 4px', fontWeight: 'bold' }}>D_Amt</div>
                    <input id="move-damt" type="text" value={movePartyRates.d_amt} onChange={function(e) { setMovePartyRates({ ...movePartyRates, d_amt: e.target.value }); }} onKeyDown={function(e) { focusNextInput(e, 'move-apcomm'); }} style={{ width: '45px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', background: '#f0f0f0', color: '#000', outline: 'none' }} />
                  </div>
                  <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
                    <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '1px 4px', fontWeight: 'bold' }}>A_PComm</div>
                    <input id="move-apcomm" type="text" value={movePartyRates.a_comm} onChange={function(e) { handleMoveAPcommChange(e.target.value); }} onKeyDown={function(e) { focusNextInput(e, 'move-aamt'); }} style={{ width: '40px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', outline: 'none' }} />
                  </div>
                  <div style={{ textAlign: 'center', borderRight: '1px solid #777' }}>
                    <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '1px 4px', fontWeight: 'bold' }}>A_Amt</div>
                    <input id="move-aamt" type="text" value={movePartyRates.a_amt} onChange={function(e) { setMovePartyRates({ ...movePartyRates, a_amt: e.target.value }); }} onKeyDown={function(e) { focusNextInput(e, 'move-patti'); }} style={{ width: '45px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '12px', background: '#f0f0f0', outline: 'none' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ background: '#000080', color: '#fff', fontSize: '10px', padding: '1px 4px', fontWeight: 'bold' }}>Patti_Perc</div>
                    <input id="move-patti" type="text" value={movePartyRates.patti_perc} onChange={function(e) { setMovePartyRates({ ...movePartyRates, patti_perc: e.target.value }); }} onKeyDown={function(e) { focusNextInput(e, 'move-confirm-btn'); }} style={{ width: '35px', textAlign: 'center', border: 'none', fontSize: '12px', outline: 'none' }} />
                  </div>
                </div>

                <button id="move-confirm-btn" onClick={handleConfirmMove} style={{ padding: '4px 16px', background: '#d4d0c8', color: '#000', border: '2px outset #fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <WhatsAppPasteModal
        isOpen={isWhatsAppModalOpen}
        onClose={function() { setIsWhatsAppModalOpen(false); }}
        onConfirmEntries={handleConfirmWhatsAppEntries}
      />

    </div>
  );
}