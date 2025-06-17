const User = require('../models/User');

exports.updateUserProfile = async (req, res) => {
  try {
    const { name, leetcodeUsername } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (leetcodeUsername) user.leetcodeUsername = leetcodeUsername;

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 