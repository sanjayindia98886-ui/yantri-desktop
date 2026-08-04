import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // नोटिफिकेशन बैनर स्टेट
  const [notification, setNotification] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-focus ke liye ref
  const oldPasswordInputRef = useRef(null);

  // Helper to restore focus back to Old Password input
  const restoreFocusToOldPassword = function() {
    setTimeout(function() {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      if (oldPasswordInputRef.current) {
        oldPasswordInputRef.current.focus();
        if (typeof oldPasswordInputRef.current.select === 'function') {
          oldPasswordInputRef.current.select();
        }
      }
    }, 50);
  };

  const handleSubmit = function(e) {
    if (e) e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      setIsSuccess(false);
      setNotification('कृपया सभी फ़ील्ड भरें!');
      restoreFocusToOldPassword();
      return;
    }

    if (newPassword !== confirmPassword) {
      setIsSuccess(false);
      setNotification('नया पासवर्ड और कन्फर्म पासवर्ड मैच नहीं कर रहे हैं!');
      restoreFocusToOldPassword();
      return;
    }

    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem('user')) || {};
    } catch (err) {
      storedUser = {};
    }

    const payload = {
      userId: storedUser.id || storedUser.userId || 1,
      username: storedUser.username || 'admin',
      oldPassword: oldPassword.trim(),
      newPassword: newPassword.trim()
    };

    axios.post('https://yantri-desktop.onrender.com/api/access/change-password', payload)
      .then(function(res) {
        if (res.data && res.data.success) {
          setIsSuccess(true);
          setNotification(res.data.message || 'पासवर्ड सफलतापूर्वक बदल गया है!');

          // Inputs clear
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');

          restoreFocusToOldPassword();

          setTimeout(function() {
            setNotification('');
          }, 3000);
        } else {
          setIsSuccess(false);
          setNotification(res.data.message || 'पासवर्ड नहीं बदला जा सका!');
          restoreFocusToOldPassword();
        }
      })
      .catch(function(error) {
        const errorMsg = error.response && error.response.data && error.response.data.message 
          ? error.response.data.message 
          : 'पासवर्ड बदलने में त्रुटि आई!';
        
        setIsSuccess(false);
        setNotification(errorMsg);
        restoreFocusToOldPassword();
      });
  };

  return (
    <div style={{ padding: '20px', background: '#dcdcdc', minHeight: '92vh', fontSize: '12px', fontFamily: 'Tahoma, Arial, sans-serif' }}>
      <div style={{ width: '320px', border: '1px solid #aaa', background: '#e8e8e8', padding: '15px', margin: '20px auto', boxShadow: '1px 1px 4px rgba(0,0,0,0.2)' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>Change Password</h3>

        {/* Notification Banner */}
        {notification && (
          <div style={{ 
            background: isSuccess ? '#d4edda' : '#f8d7da', 
            color: isSuccess ? '#155724' : '#721c24', 
            padding: '6px', 
            marginBottom: '10px', 
            border: '1px solid ' + (isSuccess ? '#c3e6cb' : '#f5c6cb'), 
            fontSize: '11px', 
            fontWeight: 'bold', 
            textAlign: 'center' 
          }}>
            {notification}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>Old Password:</label>
            <input 
              id="oldPasswordInput"
              ref={oldPasswordInputRef}
              type="password" 
              value={oldPassword} 
              onChange={function(e) { setOldPassword(e.target.value); }} 
              style={{ width: '95%', padding: '4px', border: '1px solid #7f9db9', fontWeight: 'bold' }} 
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>New Password:</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={function(e) { setNewPassword(e.target.value); }} 
              style={{ width: '95%', padding: '4px', border: '1px solid #7f9db9', fontWeight: 'bold' }} 
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>Confirm Password:</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={function(e) { setConfirmPassword(e.target.value); }} 
              style={{ width: '95%', padding: '4px', border: '1px solid #7f9db9', fontWeight: 'bold' }} 
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <button type="submit" style={{ padding: '5px 20px', cursor: 'pointer', background: '#ece9d8', border: '2px solid #7a96df', fontWeight: 'bold' }}>
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}