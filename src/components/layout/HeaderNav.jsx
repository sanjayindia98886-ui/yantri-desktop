import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from '../../context/PermissionContext';

const NAV_ITEMS = [
  { label: 'Party (F1)', key: 'f1_party', path: '/party', shortcut: 'F1' },
  { label: 'Voucher-Sale (F2)', key: 'f2_voucher_sale', path: '/voucher-sale', shortcut: 'F2' },
  { label: 'Voucher-Yantri (F3)', key: 'f3_voucher_yantri', path: '/voucher-yantri', shortcut: 'F3' },
  { label: 'Yantri (F4)', key: 'f4_yantri', path: '/yantri', shortcut: 'F4' },
  { label: 'Master (F5)', key: 'f5_master', path: '/master', shortcut: 'F5' },
  { label: 'Result (F6)', key: 'f6_result', path: '/result', shortcut: 'F6' },
  { label: 'Summary (F7)', key: 'f7_summary', path: '/summary', shortcut: 'F7' },
  { label: 'Balance History (F8)', key: 'f8_balance_history', path: '/balance-history', shortcut: 'F8' },
  { label: 'Sale LC/Bonus (F9)', key: 'f9_sale_lc', path: '/sale-lc', shortcut: 'F9' },
  { label: 'Account (F10)', key: 'f10_account', path: '/account', shortcut: 'F10' },
  { label: 'Balance Sheet (F11)', key: 'f11_balance_sheet', path: '/balance-sheet', shortcut: 'F11' },
  { label: 'Profit & Loss (F12)', key: 'f12_profit_loss', path: '/profit-loss', shortcut: 'F12' },
  { label: 'Game', key: 'game_access', path: '/game', shortcut: '' },
  { label: 'Change Password', key: 'change_password', path: '/change-password', shortcut: '' }
];

export default function HeaderNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions } = usePermission();

  useEffect(() => {
    // अगर यूजर /login पर है या लॉगिन नहीं है तो F1-F12 शॉर्टकट न चलें
    if (location.pathname === '/login' || !user || !user.id) return;

    const handleKeyDown = (e) => {
      const match = NAV_ITEMS.find((item) => item.shortcut && item.shortcut === e.key);
      if (match) {
        e.preventDefault();
        if (user?.role === 'super_admin' || permissions[match.key]) {
          navigate(match.path);
        } else {
          alert("Access Denied: You don't have permission for " + match.label);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, permissions, navigate, location.pathname]);

  // 1. अगर वर्तमान पेज /login है तो पट्टी मत दिखाओ
  if (location.pathname === '/login') {
    return null;
  }

  // 2. अगर यूजर लॉगिन नहीं है (id नहीं है) तो पट्टी मत दिखाओ
  if (!user || !user.id) {
    return null;
  }

  return (
    <div style={{ display: 'flex', background: '#dcdcdc', padding: '2px', borderBottom: '1px solid #aaa', fontSize: '11px', whiteSpace: 'nowrap', overflowX: 'auto', alignItems: 'center' }}>
      {NAV_ITEMS.map((item) => {
        const hasAccess = user?.role === 'super_admin' || permissions[item.key] || item.key === 'change_password';
        if (!hasAccess) return null;

        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              padding: '1px 5px',
              marginRight: '1px',
              border: '1px solid #777',
              background: isActive ? '#bbb' : '#efefef',
              cursor: 'pointer',
              fontWeight: isActive ? 'bold' : 'normal',
              fontSize: '11px'
            }}
          >
            {item.label}
          </button>
        );
      })}

      {user?.role === 'super_admin' && (
        <button
          onClick={() => navigate('/access-control')}
          style={{ padding: '1px 6px', background: '#ffcccc', border: '1px solid #aa0000', cursor: 'pointer', marginLeft: 'auto', fontWeight: 'bold', fontSize: '11px' }}
        >
          🔒 Access Control
        </button>
      )}
    </div>
  );
}