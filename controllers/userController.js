const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const where = {};
    
    if (role) {
      where.role = role;
    }

    const users = await User.findAll({
      where,
      attributes: [
        'id',
        'username',
        'name',
        'role',
        'is_active',
        'created_by_id',
        'created_by_name',
        'created_at',
        'updated_at'
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: [
        'id',
        'username',
        'name',
        'role',
        'is_active',
        'created_by_id',
        'created_by_name',
        'created_at',
        'updated_at'
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create user
const createUser = async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const validRoles = ['super-admin', 'admin', 'agent', 'account'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (req.user.role !== 'super-admin') {
      if (req.user.role === 'admin' && role !== 'agent') {
        return res.status(403).json({ error: 'Admins can only create agent accounts' });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to create users' });
      }
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const isActive = req.user.role === 'super-admin';

    const newUser = await User.create({
      id,
      username,
      password: hashedPassword,
      name,
      role,
      is_active: isActive,
      created_by_id: req.user.id,
      created_by_name: req.user.name
    });

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      is_active: newUser.is_active,
      created_by_id: newUser.created_by_id,
      created_by_name: newUser.created_by_name,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name, role, is_active } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};

    if (username) {
      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        where: { username, id: { [Op.ne]: id } }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updates.username = username;
    }

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (name) {
      updates.name = name;
    }

    if (role) {
      const validRoles = ['super-admin', 'admin', 'agent', 'account'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    await user.update(updates);

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      created_by_id: user.created_by_id,
      created_by_name: user.created_by_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
