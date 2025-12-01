const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const fixUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find the user with the invalid email (which is actually a USN)
        const user = await User.findOne({ email: '4CS096' });

        if (user) {
            console.log(`Found user: ${user.name} with invalid email: ${user.email}`);
            user.email = 'vinay@test.com'; // Set to a valid dummy email
            await user.save();
            console.log('User email updated to: vinay@test.com');
        } else {
            console.log('User with email "4CS096" not found.');
        }

        mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixUser();
