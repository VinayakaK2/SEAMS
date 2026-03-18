const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        const users = await User.find({}, 'name email role isEmailVerified');
        console.log('\n--- Registered Users ---');
        users.forEach(u => {
            console.log(`Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Verified: ${u.isEmailVerified}`);
        });
        console.log('------------------------\n');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUsers();
