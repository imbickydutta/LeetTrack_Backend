const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  leetcodeUsername: {
    type: String,
    required: [true, 'Please provide your LeetCode username'],
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('Comparing password for user:', this.email);
  
  if (!this.password) {
    console.error('Password field not selected for user:', this.email);
    throw new Error('Password field not selected');
  }
  
  if (!candidatePassword) {
    console.error('No password provided for comparison');
    throw new Error('No password provided for comparison');
  }

  try {
    console.log('Attempting password comparison');
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password comparison result:', isMatch ? 'Match' : 'No match');
    return isMatch;
  } catch (error) {
    console.error('Password comparison error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw new Error('Error comparing passwords');
  }
};

// Static method to hash password
userSchema.statics.hashPassword = async function(password) {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Error hashing password');
  }
};

module.exports = mongoose.model('User', userSchema); 