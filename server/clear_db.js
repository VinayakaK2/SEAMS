const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const clearDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        await mongoose.connection.db.dropDatabase();
        console.log('Database dropped successfully.');

        mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

clearDatabase();
