import React, { createContext, useContext, useState, useEffect } from 'react';

const PermissionContext = createContext();

export function PermissionProvider(props) {
  // Default User State
  const [user, setUser] = useState({
    id: 1,
    username: 'admin',
    role: 'super_admin'
  });

  // Permissions State
  const [permissions, setPermissions] = useState({
    f1_party: true,
    f2_voucher_sale: true,
    f3_voucher_yantri: true,
    f4_yantri: true,
    f5_master: true,
    f6_result: true,
    f7_summary: true,
    f8_balance_history: true,
    f9_sale_lc: true,
    f10_account: true,
    f11_balance_sheet: true,
    f12_profit_loss: true,
    game_access: true,

    can_edit_party: false,
    can_delete_voucher: false,
    f5_sync_mode: 'admin'
  });

  // 🎯 न्यू फ़ंक्शन: डेटाबेस से यूजर की वास्तविक परमिशन लोड करना
  const fetchPermissions = (userId) => {
    const targetUserId = userId || (user ? user.id : 1);
    if (!targetUserId) return;

    fetch('https://yantri-desktop.onrender.com/api/access/permissions/' + targetUserId)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setPermissions((prev) => ({
            ...prev,
            f1_party: Number(data.f1_party) === 1,
            f2_voucher_sale: Number(data.f2_voucher_sale) === 1,
            f3_voucher_yantri: Number(data.f3_voucher_yantri) === 1,
            f4_yantri: Number(data.f4_yantri) === 1,
            f5_master: Number(data.f5_master) === 1,
            f6_result: Number(data.f6_result) === 1,
            f7_summary: Number(data.f7_summary) === 1,
            f8_balance_history: Number(data.f8_balance_history) === 1,
            f9_sale_lc: Number(data.f9_sale_lc) === 1,
            f10_account: Number(data.f10_account) === 1,
            f11_balance_sheet: Number(data.f11_balance_sheet) === 1,
            f12_profit_loss: Number(data.f12_profit_loss) === 1,
            game_access: Number(data.game_access) === 1,
            can_edit_party: Number(data.can_edit_party) === 1,
            can_delete_voucher: Number(data.can_delete_voucher) === 1,
            f5_sync_mode: data.f5_sync_mode || (user.role === 'super_admin' ? 'admin' : 'user')
          }));
        }
      })
      .catch((err) => console.error('Error fetching permissions in context:', err));
  };

  // जब भी यूजर लॉगिन/चेंज हो, ताज़ा परमिशन डेटाबेस से ऑटो-फ़ेच करें
  useEffect(() => {
    if (user && user.id) {
      fetchPermissions(user.id);
    }
  }, [user?.id]);

  // Role बदलने पर परमिशन अपडेट करने का फ़ंक्शन
  const updateUserRoleAndPermissions = (userData, newPermissions) => {
    setUser(userData);
    if (newPermissions) {
      setPermissions((prev) => ({
        ...prev,
        ...newPermissions,
        f5_sync_mode: userData.role === 'super_admin' ? 'admin' : 'user'
      }));
    } else {
      fetchPermissions(userData.id);
    }
  };

  return (
    <PermissionContext.Provider 
      value={{ 
        user, 
        setUser, 
        permissions, 
        setPermissions, 
        updateUserRoleAndPermissions,
        fetchPermissions // 🎯 इसे Export किया ताकि AccessControl में कॉल कर सकें
      }}
    >
      {props.children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  return useContext(PermissionContext);
}