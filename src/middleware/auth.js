const jwt = require('jsonwebtoken');
const { UserModel } = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by _id instead of id
    const user = await UserModel.findOne({ _id: decoded.id });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

module.exports = auth;
