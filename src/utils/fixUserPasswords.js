const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const fixUserPasswords = async () => {
  try {
    // Find all users
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    // Update each user's password
    for (const user of users) {
      if (!user.password) {
        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        console.log(`Fixing password for user ${user.email} with temp password: ${tempPassword}`);

        // Hash the temporary password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Update the user
        user.password = hashedPassword;
        await user.save();

        console.log(`Updated password for user ${user.email}`);
        console.log(`Temporary password: ${tempPassword}`);
        console.log('Please change this password after logging in');
      }
    }

    console.log('Finished fixing user passwords');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing user passwords:', error);
    process.exit(1);
  }
};

// Run the fix
fixUserPasswords(); 