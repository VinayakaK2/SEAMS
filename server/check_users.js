const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const users = await User.find({});
        console.log('Users found:', users.length);
        users.forEach(u => {
            console.log(`Name: ${u.name}, Email: ${u.email}, USN: ${u.usn}, Role: ${u.role}`);
        });

        mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUsers();
