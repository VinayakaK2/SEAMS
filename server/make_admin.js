const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const makeAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const email = 'vinayakakvinayakak2112005@gmail.com';
        const password = '5002112';

        let user = await User.findOne({ email });

        if (user) {
            console.log('User found. Updating role and password...');
            user.role = 'admin';
            user.password = password; // Will be hashed by pre-save hook
            user.isEmailVerified = true;
        } else {
            console.log('User not found. Creating new admin user...');
            user = new User({
                name: 'Vinayaka Admin',
                email: email,
                password: password,
                role: 'admin',
                isEmailVerified: true,
                department: 'ADMIN'
            });
        }

        await user.save();
        console.log(`User ${email} is now an Admin with the specified password.`);
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

makeAdmin();
