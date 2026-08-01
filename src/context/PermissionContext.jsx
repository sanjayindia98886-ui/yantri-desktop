import React, { createContext, useContext, useState } from 'react';

const PermissionContext = createContext();

export function PermissionProvider(props) {
  // Default User State (Testing / Login Data)
  const [user, setUser] = useState({
    id: 1,
    username: 'admin',
    role: 'super_admin' // 'super_admin' या 'user'
  });

  // Permissions State
  const [permissions, setPermissions] = useState({
    // Tab Level Access Permissions (आपके पुराने टैब्स)
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

    // Action Level Specific Permissions (नए एक्शन्स के लिए)
    can_edit_party: false,        // F1 में सिर्फ Read-Only मोड (User के लिए false)
    can_delete_voucher: false,     // वाउचर डिलीट ब्लॉक करने के लिए
    f5_sync_mode: 'admin'         // 'admin' (Upload Party / Download Sale) या 'user' (Download Party / Upload Sale)
  });

  // Role बदलने पर परमिशन ऑटो-अपडेट करने का फ़ंक्शन
  const updateUserRoleAndPermissions = (userData, newPermissions) => {
    setUser(userData);
    setPermissions((prev) => ({
      ...prev,
      ...newPermissions,
      // अगर Super Admin है तो f5_sync_mode 'admin' रहेगा, वरना 'user'
      f5_sync_mode: userData.role === 'super_admin' ? 'admin' : 'user'
    }));
  };

  return (
    <PermissionContext.Provider 
      value={{ 
        user, 
        setUser, 
        permissions, 
        setPermissions, 
        updateUserRoleAndPermissions 
      }}
    >
      {props.children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  return useContext(PermissionContext);
}