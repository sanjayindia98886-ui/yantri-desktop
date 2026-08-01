 import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Auto-focus ke liye ref
  const oldPasswordInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('कृपया सभी फ़ील्ड भरें!');
      if (oldPasswordInputRef.current) oldPasswordInputRef.current.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('नया पासवर्ड और कन्फर्म पासवर्ड मैच नहीं कर रहे हैं!');
      return;
    }

    try {
      // LocalStorage se logged-in user ki detail nikalein
      let storedUser = {};
      try {
        storedUser = JSON.parse(localStorage.getItem('user')) || {};
      } catch (err) {
        storedUser = {};
      }

      // Safe fallback data taaki UserId kabhi missing na jaye
      const payload = {
        userId: storedUser.id || storedUser.userId || 1,
        username: storedUser.username || 'admin',
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim()
      };

      // Backend API call
      const res = await axios.post('http://localhost:5000/api/access/change-password', payload);

      if (res.data && res.data.success) {
        alert(res.data.message || 'पासवर्ड सफलतापूर्वक बदल गया है!');

        // Inputs clear karein
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // OK dabane ke baad cursor apne aap Old Password box me chala jayega
        setTimeout(function() {
          if (oldPasswordInputRef.current) {
            oldPasswordInputRef.current.focus();
          }
        }, 100);
      } else {
        alert(res.data.message || 'पासवर्ड नहीं बदला जा सका!');
      }
    } catch (error) {
      const errorMsg = error.response && error.response.data && error.response.data.message 
        ? error.response.data.message 
        : 'पासवर्ड बदलने में त्रुटि आई!';
      alert(errorMsg);

      setTimeout(function() {
        if (oldPasswordInputRef.current) {
          oldPasswordInputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#dcdcdc', minHeight: '92vh', fontSize: '12px' }}>
      <div style={{ width: '320px', border: '1px solid #aaa', background: '#e8e8e8', padding: '15px', margin: '20px auto' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>Change Password</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px' }}>Old Password:</label>
            <input 
              ref={oldPasswordInputRef}
              type="password" 
              value={oldPassword} 
              onChange={(e) => setOldPassword(e.target.value)} 
              style={{ width: '95%', padding: '4px' }} 
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px' }}>New Password:</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              style={{ width: '95%', padding: '4px' }} 
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '2px' }}>Confirm Password:</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              style={{ width: '95%', padding: '4px' }} 
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <button type="submit" style={{ padding: '5px 20px', cursor: 'pointer' }}>Update Password</button>
          </div>
        </form>
      </div>
    </div>
  );
}