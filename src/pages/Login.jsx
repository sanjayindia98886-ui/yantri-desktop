import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePermission } from '../context/PermissionContext';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setPermissions } = usePermission();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('कृपया Username और Password दोनों भरें।');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/access/login', {
        username: username.trim(),
        password: password.trim()
      });

      if (res.data && res.data.success) {
        // 1. Logged-in User Info Context में सेट करें
        setUser({
          id: res.data.user.id,
          username: res.data.user.username,
          role: res.data.user.role // 'super_admin' या 'user'
        });

        // 2. User Permissions Context में सेट करें
        setPermissions(res.data.permissions || {});

        // 3. Login सफल होने पर Party Screen पर भेजें
        navigate('/party');
      } else {
        setErrorMsg(res.data.message || 'गलत Username या Password!');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setErrorMsg(err.response?.data?.message || 'सर्वर से कनेक्ट करने में विफलता!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#ece9d8',
      fontFamily: 'Tahoma, Arial, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #0a246a',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
        width: '320px',
        padding: '0 0 15px 0'
      }}>
        {/* Title Bar */}
        <div style={{
          background: 'linear-gradient(to right, #0a246a, #a6caf0)',
          color: '#fff',
          padding: '6px 10px',
          fontWeight: 'bold',
          fontSize: '13px'
        }}>
          Yantri Desktop - Login
        </div>

        <form onSubmit={handleLogin} style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {errorMsg && (
            <div style={{ color: '#cc0000', fontSize: '11px', fontWeight: 'bold', background: '#ffe6e6', padding: '5px', border: '1px solid #cc0000' }}>
              {errorMsg}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username लिखें"
              style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid #7f9db9', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password लिखें"
              style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid #7f9db9', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '5px',
              padding: '6px',
              background: loading ? '#888' : '#0a246a',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}