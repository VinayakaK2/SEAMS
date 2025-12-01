const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkTokens = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const users = await User.find({ resetPasswordToken: { $exists: true } });
        console.log('Users with reset tokens:', users.length);
        users.forEach(u => {
            console.log(`User: ${u.email}, Token: ${u.resetPasswordToken}, Expire: ${u.resetPasswordExpire}`);
        });

        mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkTokens();
