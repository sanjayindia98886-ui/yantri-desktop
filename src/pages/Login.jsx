import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePermission } from '../context/PermissionContext';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setPermissions } = usePermission();

  const [companyId, setCompanyId] = useState('101');
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Check if Admin ID / Company ID is already saved in LocalStorage
  useEffect(() => {
    const savedCompanyId = localStorage.getItem('yantri_company_id');
    if (savedCompanyId) {
      setCompanyId(savedCompanyId);
      setIsFirstTime(false); // Do not ask for Admin ID again
    } else {
      setIsFirstTime(true); // Ask for Admin ID for the first time
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('कृपया Username और Password दोनों भरें।');
      return;
    }

    if (isFirstTime && !companyId.trim()) {
      setErrorMsg('कृपया Admin ID (Company ID) दर्ज करें।');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // Prepare full Company ID format (e.g. 101 -> DEMO_COMP_101)
    const formattedCompanyId = companyId.trim().startsWith('DEMO_COMP_')
      ? companyId.trim()
      : 'DEMO_COMP_' + companyId.trim();

    try {
      const res = await axios.post('https://yantri-desktop.onrender.com/api/access/login', {
        username: username.trim(),
        password: password.trim(),
        company_id: formattedCompanyId
      });

      if (res.data && res.data.success) {
        // 2. Save Admin / Company ID permanently so it won't ask again
        localStorage.setItem('yantri_company_id', companyId.trim());

        // 3. Logged-in User Info Context में सेट करें
        setUser({
          id: res.data.user.id,
          username: res.data.user.username,
          role: res.data.user.role, // 'super_admin', 'user', या 'agent'
          company_id: res.data.user.company_id || formattedCompanyId
        });

        // 4. User Permissions Context में सेट करें
        setPermissions(res.data.permissions || {});

        // 5. Login सफल होने पर Party Screen पर भेजें
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

  const handleResetCompanyId = () => {
    localStorage.removeItem('yantri_company_id');
    setIsFirstTime(true);
    setCompanyId('101');
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
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Yantri Desktop - Login</span>
          {!isFirstTime && (
            <span
              onClick={handleResetCompanyId}
              style={{ fontSize: '10px', cursor: 'pointer', textDecoration: 'underline', color: '#fff' }}
              title="Admin ID बदलें"
            >
              Change Admin ID
            </span>
          )}
        </div>

        <form onSubmit={handleLogin} style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {errorMsg && (
            <div style={{ color: '#cc0000', fontSize: '11px', fontWeight: 'bold', background: '#ffe6e6', padding: '5px', border: '1px solid #cc0000' }}>
              {errorMsg}
            </div>
          )}

          {/* Admin ID / Company ID Input: Only shown for the First Time */}
          {isFirstTime ? (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: '#0a246a' }}>
                Admin ID / Company ID (First Time Only):
              </label>
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="उदा. 101"
                style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid #7f9db9', boxSizing: 'border-box', fontWeight: 'bold' }}
              />
            </div>
          ) : (
            <div style={{ fontSize: '11px', background: '#e6f4ea', padding: '4px 8px', border: '1px solid #b7e1cd', color: '#137333', fontWeight: 'bold' }}>
              Connected Admin ID: {companyId}
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