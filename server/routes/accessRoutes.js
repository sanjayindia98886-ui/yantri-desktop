const express = require('express');
const router = express.Router();

// Access Controller se saare functions import karein
const {
  getUsers,
  getUserPermissions,
  updateUserPermissions,
  createUser,
  loginUser,
  changePassword
} = require('../controllers/accessController');

// 1. User Login Route
router.post('/login', loginUser);

// 2. Get All Users
router.get('/users', getUsers);

// 3. Create New User
router.post('/users', createUser);

// 4. Get Permissions for User
router.get('/permissions/:userId', getUserPermissions);

// 5. Update Permissions for User
router.post('/permissions/:userId', updateUserPermissions);

// 6. Change Password Route (Admin & User)
router.post('/change-password', changePassword);

module.exports = router;