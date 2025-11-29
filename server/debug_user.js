const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const debugUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({});
        console.log('--- USERS ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}, Verified: ${u.isEmailVerified}, ID: ${u._id}`);
        });
        console.log('-------------');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugUsers();
