import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function PartyF1({ userRole = 'Admin' }) {
  const initialFormState = {
    pno: null,
    party_name: '',
    city: '',
    phone: '',
    d_comm: '0',
    d_amt: '0',
    a_comm: '0',
    a_amt: '0',
    patti_perc: '0',
    lc_perc: '0',
    hissa_party: '',
    hissa_patti_perc: '0',
    override_comm_perc: '0',
    override_comm_party: '',
    override_lc_perc: '0',
    override_lc_party: '',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [parties, setParties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selectedPno, setSelectedPno] = useState(null);

  const inputRef = useRef(null);

  const currentUserId = 'User 0';
  
  const normalizedRole = String(userRole || '').toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'super_admin' || userRole === 'Admin';

  // Helper to restore focus back to Party Name input (Updated Fix for Alert/Focus Loss)
  const restoreFocus = function() {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (inputRef.current) {
          inputRef.current.focus();
        } else {
          const el = document.getElementById('f1PartyNameInput');
          if (el) el.focus();
        }
      });
    });
  };

  const fetchParties = function() {
    axios.get('https://yantri-desktop.onrender.com/api/parties')
      .then(function(res) {
        if (Array.isArray(res.data)) {
          setParties(res.data);
        }
      })
      .catch(function(err) {
        console.error('Error fetching parties:', err);
      });
  };

  useEffect(function() {
    fetchParties();
  }, []);

  const handleChange = function(e) {
    if (!isAdmin) return;
    const name = e.target.name;
    const value = e.target.value;

    setFormData(function(prev) {
      const updated = { ...prev };
      updated[name] = value;

      if (name === 'd_comm') {
        const commVal = parseFloat(value) || 0;
        updated.d_amt = String(100 - commVal);
      }

      if (name === 'a_comm') {
        const commVal = parseFloat(value) || 0;
        updated.a_amt = String((100 - commVal) / 10);
      }

      return updated;
    });
  };

  const handleReset = function() {
    setFormData(initialFormState);
    setSelectedPno(null);
    restoreFocus();
  };

  const handleSave = function(e) {
    e.preventDefault();

    if (!isAdmin) {
      alert('Only Admin can add or edit parties!');
      restoreFocus();
      return;
    }

    if (!formData.party_name) {
      alert('Please enter Party Name!');
      restoreFocus();
      return;
    }

    const isEdit = formData.pno !== null && formData.pno !== undefined;
    const apiCall = isEdit 
      ? axios.put('https://yantri-desktop.onrender.com/api/parties', formData)
      : axios.post('https://yantri-desktop.onrender.com/api/parties', formData);

    apiCall
      .then(function(res) {
        if (res.data && (res.data.success || res.data.pno)) {
          alert(isEdit ? 'Party Updated Successfully!' : 'Party Saved Successfully!');
          handleReset();
          fetchParties();
        } else {
          alert('Failed to save party: ' + (res.data.error || 'Unknown error'));
          restoreFocus();
        }
      })
      .catch(function(err) {
        console.error('Save error:', err);
        alert('Server Connection Error! Make sure node server is running.');
        restoreFocus();
      });
  };

  const handleDelete = function(pno) {
    if (!isAdmin) {
      alert('Only Admin can delete parties!');
      restoreFocus();
      return;
    }

    if (window.confirm('Are you sure you want to delete this party?')) {
      axios.delete('https://yantri-desktop.onrender.com/api/parties/' + pno)
        .then(function(res) {
          if (res.data && res.data.success) {
            alert('Party Deleted Successfully!');
            handleReset();
            fetchParties();
          } else {
            alert('Failed to delete party');
            restoreFocus();
          }
        })
        .catch(function(err) {
          console.error('Delete error:', err);
          alert('Server Error during deletion!');
          restoreFocus();
        });
    } else {
      restoreFocus();
    }
  };

  const handleSelectRow = function(p) {
    if (!isAdmin) return;
    setSelectedPno(p.pno);
    setFormData({
      pno: p.pno,
      party_name: p.party_name || '',
      city: p.city || '',
      phone: p.phone || '',
      d_comm: p.d_comm !== undefined ? String(p.d_comm) : '0',
      d_amt: p.d_amt !== undefined ? String(p.d_amt) : '0',
      a_comm: p.a_comm !== undefined ? String(p.a_comm) : '0',
      a_amt: p.a_amt !== undefined ? String(p.a_amt) : '0',
      patti_perc: p.patti_perc !== undefined ? String(p.patti_perc) : '0',
      lc_perc: p.lc_perc !== undefined ? String(p.lc_perc) : '0',
      hissa_party: p.hissa_party || '',
      hissa_patti_perc: p.hissa_patti_perc !== undefined ? String(p.hissa_patti_perc) : '0',
      override_comm_perc: p.override_comm_perc !== undefined ? String(p.override_comm_perc) : '0',
      override_comm_party: p.override_comm_party || '',
      override_lc_perc: p.override_lc_perc !== undefined ? String(p.override_lc_perc) : '0',
      override_lc_party: p.override_lc_party || '',
      status: p.status || 'Active'
    });
  };

  const filteredParties = parties.filter(function(p) {
    const pStatus = p.status || 'Active';
    const matchesStatus = pStatus === statusFilter;
    const matchesSearch = p.party_name ? p.party_name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ padding: '4px', background: '#d4d0c8', height: '88vh', maxHeight: '88vh', fontSize: '11px', fontFamily: 'Tahoma, Arial, sans-serif', display: 'flex', gap: '6px', overflow: 'hidden' }}>
      
      {/* Left Box: Form Area */}
      {isAdmin && (
        <div style={{ width: '310px', border: '1px solid #808080', background: '#d4d0c8', padding: '6px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <button type="button" onClick={handleReset} style={{ color: '#0000ff', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: 0 }}>View All</button>
            <strong style={{ fontSize: '13px', color: '#000' }}>
              {selectedPno ? 'Edit Party' : 'New Party'}
            </strong>
            <span style={{ width: '30px' }}></span>
          </div>

          <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Party Name */}
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '80px', fontWeight: 'bold' }}>Party Name</label>
                <input 
                  id="f1PartyNameInput"
                  ref={inputRef}
                  type="text" 
                  name="party_name" 
                  value={formData.party_name} 
                  onChange={handleChange} 
                  autoFocus
                  style={{ flex: 1, padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} 
                />
              </div>

              {/* City & Phone */}
              <div style={{ marginBottom: '3px', display: 'flex', gap: '4px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '30px', fontWeight: 'bold' }}>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '40px', fontWeight: 'bold' }}>Phone</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
              </div>

              {/* D_Comm & D_Amt */}
              <div style={{ marginBottom: '3px', display: 'flex', gap: '4px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '75px', fontWeight: 'bold' }}>D_Comm %:</label>
                  <input type="text" name="d_comm" value={formData.d_comm} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '45px', fontWeight: 'bold' }}>D_Amt:</label>
                  <input type="text" name="d_amt" value={formData.d_amt} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
              </div>

              {/* A_Comm & A_Amt */}
              <div style={{ marginBottom: '3px', display: 'flex', gap: '4px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '75px', fontWeight: 'bold' }}>A_Comm %:</label>
                  <input type="text" name="a_comm" value={formData.a_comm} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '45px', fontWeight: 'bold' }}>A_Amt:</label>
                  <input type="text" name="a_amt" value={formData.a_amt} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
              </div>

              {/* Patti % & LC % */}
              <div style={{ marginBottom: '3px', display: 'flex', gap: '4px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '75px', fontWeight: 'bold' }}>Patti %:</label>
                  <input type="text" name="patti_perc" value={formData.patti_perc} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '45px', fontWeight: 'bold' }}>LC %:</label>
                  <input type="text" name="lc_perc" value={formData.lc_perc} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
              </div>

              {/* Hissa Party & Hissa Patti % */}
              <div style={{ marginBottom: '3px', display: 'flex', gap: '4px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '75px', fontWeight: 'bold' }}>Hissa Party:</label>
                  <select name="hissa_party" value={formData.hissa_party} onChange={handleChange} style={{ width: '100%', padding: '1px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }}>
                    <option value="">-- Choose --</option>
                    {parties.map(function(p, i) {
                      return <option key={i} value={p.party_name}>{p.party_name}</option>;
                    })}
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '75px', fontWeight: 'bold' }}>Hissa Patti %:</label>
                  <input type="text" name="hissa_patti_perc" value={formData.hissa_patti_perc} onChange={handleChange} style={{ width: '100%', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
              </div>

              {/* Ov Comm % & Ov Comm Party */}
              <div style={{ marginBottom: '3px', display: 'flex', gap: '4px' }}>
                <div style={{ width: '105px', display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '65px', fontWeight: 'bold' }}>Ov Comm %:</label>
                  <input type="text" name="override_comm_perc" value={formData.override_comm_perc} onChange={handleChange} style={{ width: '35px', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '35px', fontWeight: 'bold' }}>Party:</label>
                  <select name="override_comm_party" value={formData.override_comm_party} onChange={handleChange} style={{ width: '100%', padding: '1px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }}>
                    <option value="">-- Choose --</option>
                    {parties.map(function(p, i) {
                      return <option key={i} value={p.party_name}>{p.party_name}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Ov LC % & Ov LC Party */}
              <div style={{ marginBottom: '3px', display: 'flex', gap: '4px' }}>
                <div style={{ width: '105px', display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '65px', fontWeight: 'bold' }}>Ov LC %:</label>
                  <input type="text" name="override_lc_perc" value={formData.override_lc_perc} onChange={handleChange} style={{ width: '35px', padding: '1px 3px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '35px', fontWeight: 'bold' }}>Party:</label>
                  <select name="override_lc_party" value={formData.override_lc_party} onChange={handleChange} style={{ width: '100%', padding: '1px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }}>
                    <option value="">-- Choose --</option>
                    {parties.map(function(p, i) {
                      return <option key={i} value={p.party_name}>{p.party_name}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Account Status */}
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '80px', fontWeight: 'bold' }}>Status:</label>
                <select name="status" value={formData.status} onChange={handleChange} style={{ flex: 1, padding: '1px', border: '1px solid #7f9db9', background: '#fffde7', fontWeight: 'bold' }}>
                  <option value="Active">Active</option>
                  <option value="Deactivate">Deactivate</option>
                </select>
              </div>
            </div>

            {/* Save / Delete Button Container */}
            <div style={{ textAlign: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #a0a0a0', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {selectedPno && (
                <button type="button" onClick={function() { handleDelete(selectedPno); }} style={{ padding: '2px 14px', background: '#ff4d4d', color: '#fff', border: '1px solid #808080', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                  Delete
                </button>
              )}
              <button type="submit" style={{ padding: '2px 28px', background: '#d4d0c8', border: '2px solid #ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', boxShadow: '1px 1px 1px #808080' }}>
                Save
              </button>
            </div>
          </form>

        </div>
      )}

      {/* Right Box: Grid Area */}
      <div style={{ flex: 1, border: '1px solid #808080', background: '#d4d0c8', padding: '6px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Header User 0 */}
        <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
          {currentUserId}
        </div>

        {/* Search Bar & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <button type="button" onClick={function() { setSearchTerm(''); }} style={{ color: '#0000ff', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
            View All
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Search</span>
            <div>
              <span style={{ fontWeight: 'bold' }}>Find Party: </span>
              <input type="text" value={searchTerm} onChange={function(e) { setSearchTerm(e.target.value); }} style={{ width: '180px', padding: '1px 3px', border: '1px solid #7f9db9', fontWeight: 'bold' }} />
            </div>

            {/* Radio Buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                <input type="radio" name="st_filter" checked={statusFilter === 'Active'} onChange={function() { setStatusFilter('Active'); }} /> Active
              </label>
              <label style={{ cursor: 'pointer', color: '#cc0000', fontWeight: 'bold' }}>
                <input type="radio" name="st_filter" checked={statusFilter === 'Deactivate'} onChange={function() { setStatusFilter('Deactivate'); }} /> Deactivate
              </label>
            </div>
          </div>
        </div>

        {/* Party Table Container */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #808080', overflowY: 'auto' }}>
          <table border="1" cellPadding="2" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px', borderColor: '#d0d0d0' }}>
            <thead>
              <tr style={{ background: '#d4d0c8', textAlign: 'center', fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>
                <th style={{ width: '15px' }}></th>
                <th>Pno</th>
                <th>PName</th>
                <th>LC</th>
                <th>City</th>
                <th>Phone</th>
                <th>D Comm (%)</th>
                <th>D Amt</th>
                <th>A Comm (%)</th>
                <th>A Amt</th>
                <th>Pati (%)</th>
                <th>Hissa</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.length > 0 ? (
                filteredParties.map(function(p, idx) {
                  const isSelected = selectedPno === p.pno;
                  return (
                    <tr 
                      key={p.pno || idx} 
                      onClick={function() { handleSelectRow(p); }}
                      style={{ 
                        background: isSelected ? '#0a246a' : '#ffffff', 
                        color: isSelected ? '#ffffff' : '#000000',
                        cursor: isAdmin ? 'pointer' : 'default',
                        fontWeight: 'bold'
                      }}
                    >
                      <td style={{ textAlign: 'center', color: isSelected ? '#ffffff' : 'transparent', fontSize: '10px' }}>
                        {isSelected ? '►' : ''}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{p.pno || (idx + 1)}</td>
                      <td style={{ fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>{p.party_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.lc_perc || 0}</td>
                      <td style={{ fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>{p.city || ''}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.phone || ''}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.d_comm || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.d_amt || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.a_comm || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.a_amt || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.patti_perc || 0}</td>
                      <td style={{ fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold' }}>{p.hissa_party || ''}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', color: '#777', padding: '15px', fontWeight: 'bold' }}>
                    No {statusFilter.toLowerCase()} parties found
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