const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.registerUser = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    const { name, email, password, leetcodeUsername } = req.body;

    // Validate required fields
    if (!name || !email || !password || !leetcodeUsername) {
      console.log('Missing required fields:', { name: !!name, email: !!email, password: !!password, leetcodeUsername: !!leetcodeUsername });
      return res.status(400).json({ 
        message: 'Please provide all required fields: name, email, password, and LeetCode username' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { leetcodeUsername }] 
    });
    
    if (existingUser) {
      console.log('User already exists:', { email, leetcodeUsername });
      return res.status(400).json({ 
        message: existingUser.email === email ? 
          'Email already registered' : 
          'LeetCode username already registered' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      leetcodeUsername
    });

    await user.save();
    console.log('User registered successfully:', { email, leetcodeUsername });

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        leetcodeUsername: user.leetcodeUsername
      }
    });
  } catch (error) {
    console.error('Registration error (controller):', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.loginUser = async (req, res) => {
  console.log('=== Login Request ===');
  console.log('Body:', req.body);
  
  // Input validation
  const { email, password } = req.body;
  
  // Check if email and password are provided
  if (!email || !password) {
    console.log('Missing credentials:', { email: !!email, password: !!password });
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password'
    });
  }

  try {
    console.log('Finding user with email:', email);
    // Find user by email and explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      console.log('No user found with email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('User found, checking password');
    // Verify password using the model's method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      throw new Error('JWT_SECRET is not configured');
    }

    console.log('Generating token for user:', email);
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login successful for user:', email);
    // Return user data and token
    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          leetcodeUsername: user.leetcodeUsername
        }
      }
    });

  } catch (error) {
    console.error('Login error details (controller):', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user (controller):', error); // More specific logging
    res.status(500).json({ message: 'Server error' });
  }
}; 