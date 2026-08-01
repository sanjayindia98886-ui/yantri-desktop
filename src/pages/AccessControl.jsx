import React, { useState, useEffect } from 'react';

const TAB_PERMISSIONS = [
  { key: 'f1_party', label: 'Party (F1)' },
  { key: 'f2_voucher_sale', label: 'Voucher-Sale (F2)' },
  { key: 'f3_voucher_yantri', label: 'Voucher-Yantri (F3)' },
  { key: 'f4_yantri', label: 'Yantri (F4)' },
  { key: 'f5_master', label: 'Master (F5)' },
  { key: 'f6_result', label: 'Result (F6)' },
  { key: 'f7_summary', label: 'Summary (F7)' },
  { key: 'f8_balance_history', label: 'Balance History (F8)' },
  { key: 'f9_sale_lc', label: 'Sale LC/Bonus (F9)' },
  { key: 'f10_account', label: 'Account (F10)' },
  { key: 'f11_balance_sheet', label: 'Balance Sheet (F11)' },
  { key: 'f12_profit_loss', label: 'Profit & Loss (F12)' },
  { key: 'game_access', label: 'Game Master' }
];

const defaultPermissions = {
  f1_party: 0,
  f2_voucher_sale: 0,
  f3_voucher_yantri: 0,
  f4_yantri: 0,
  f5_master: 0,
  f6_result: 0,
  f7_summary: 0,
  f8_balance_history: 0,
  f9_sale_lc: 0,
  f10_account: 0,
  f11_balance_sheet: 0,
  f12_profit_loss: 0,
  game_access: 0,
  can_edit_party: 0,
  can_delete_voucher: 0,
  f5_sync_mode: 'user'
};

export default function AccessControl() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPermissions, setUserPermissions] = useState(defaultPermissions);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = () => {
    fetch('http://localhost:5000/api/access/users')
      .then((res) => res.json())
      .then((data) => setUsers(data || []))
      .catch((err) => console.error('Fetch users error:', err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    if (!userId) {
      setUserPermissions(defaultPermissions);
      return;
    }
    fetch('http://localhost:5000/api/access/permissions/' + userId)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          // डेटाबेस से आए डाटा को डिफ़ॉल्ट के साथ मिलाना
          setUserPermissions({
            ...defaultPermissions,
            ...data
          });
        } else {
          setUserPermissions(defaultPermissions);
        }
      })
      .catch((err) => console.error('Fetch permissions error:', err));
  };

  const handleCheckboxChange = (key) => {
    setUserPermissions((prev) => ({
      ...prev,
      [key]: prev[key] === 1 || prev[key] === true ? 0 : 1
    }));
  };

  const handleSelectChange = (key, value) => {
    setUserPermissions((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePermissions = () => {
    if (!selectedUserId) return;
    fetch('http://localhost:5000/api/access/permissions/' + selectedUserId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPermissions)
    })
      .then((res) => res.json())
      .then(() => alert('User permissions updated successfully!'))
      .catch((err) => console.error('Save permissions error:', err));
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      alert('Please enter both Username and Password');
      return;
    }

    fetch('http://localhost:5000/api/access/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: 'user'
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert('User created successfully!');
          setNewUsername('');
          setNewPassword('');
          fetchUsers();
        } else {
          alert('Error: ' + (data.error || 'Failed to create user'));
        }
      })
      .catch((err) => console.error('Create user error:', err));
  };

  return (
    <div style={{ padding: '20px', background: '#ece9d8', minHeight: '90vh', fontFamily: 'Tahoma, Arial, sans-serif' }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#0a246a' }}>Super Admin - User Access Control</h2>
      
      {/* Add New User */}
      <div style={{ background: '#fff', padding: '15px', border: '1px solid #7a96df', marginBottom: '20px', maxWidth: '600px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000' }}>➕ Add New User</h3>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #7f9db9' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #7f9db9' }}
          />
          <button
            type="submit"
            style={{ padding: '4px 12px', background: '#28a745', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Create
          </button>
        </form>
      </div>

      {/* Select User */}
      <div style={{ background: '#fff', padding: '15px', border: '1px solid #7a96df', maxWidth: '600px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000' }}>🔑 Manage User Access</h3>
        <div>
          <label style={{ fontWeight: 'bold' }}>Select User: </label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserSelect(e.target.value)}
            style={{ padding: '4px', border: '1px solid #7f9db9', width: '250px' }}
          >
            <option value="">-- Choose User --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username + ' (' + u.role + ')'}
              </option>
            ))}
          </select>
        </div>

        {selectedUserId && (
          <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
            {/* 1. Tabs Permissions */}
            <h4 style={{ margin: '0 0 10px 0', color: '#0a246a' }}>1. Screen Access (Tabs Permission):</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              {TAB_PERMISSIONS.map((item) => (
                <label key={item.key} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Number(userPermissions[item.key]) === 1}
                    onChange={() => handleCheckboxChange(item.key)}
                  />{' '}
                  {item.label}
                </label>
              ))}
            </div>

            {/* 2. Action Level Permissions */}
            <h4 style={{ margin: '15px 0 10px 0', color: '#0a246a' }}>2. Action Level Permissions:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Number(userPermissions.can_edit_party) === 1}
                  onChange={() => handleCheckboxChange('can_edit_party')}
                />{' '}
                <strong>Allow Party Edit / Create (F1)</strong> (Unchecked = Read Only)
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Number(userPermissions.can_delete_voucher) === 1}
                  onChange={() => handleCheckboxChange('can_delete_voucher')}
                />{' '}
                <strong>Allow Delete Vouchers</strong>
              </label>

              <div style={{ marginTop: '5px' }}>
                <label style={{ fontWeight: 'bold' }}>F5 Master Sync Mode: </label>
                <select
                  value={userPermissions.f5_sync_mode || 'user'}
                  onChange={(e) => handleSelectChange('f5_sync_mode', e.target.value)}
                  style={{ padding: '2px 5px', marginLeft: '5px' }}
                >
                  <option value="user">User Mode (Download Party / Upload Sale)</option>
                  <option value="admin">Admin Mode (Upload Party / Download Sale)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSavePermissions}
              style={{
                marginTop: '20px',
                padding: '6px 20px',
                background: '#0a246a',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Save Access Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}