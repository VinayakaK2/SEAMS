const mongoose = require('mongoose');
const User = require('./models/User');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const debugUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({});
        let output = '--- USERS ---\n';
        users.forEach(u => {
            output += `Email: ${u.email}, Verified: ${u.isEmailVerified}, ID: ${u._id}\n`;
        });
        output += '-------------\n';
        fs.writeFileSync('users_dump.txt', output);
        console.log('Dumped to users_dump.txt');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugUsers();
