const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Define Event Schema (simplified)
const eventSchema = new mongoose.Schema({
    title: String,
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: String,
    category: String
});

const Event = mongoose.model('Event', eventSchema);

const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, role: String }));

const fs = require('fs');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('debug_output.txt', msg + '\n');
};

const debugEvents = async () => {
    try {
        fs.writeFileSync('debug_output.txt', 'Starting debug...\n');
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected to MongoDB');

        const users = await User.find({ role: 'coordinator' });
        log('\n--- Coordinators ---');
        users.forEach(u => log(`Name: ${u.name}, ID: ${u._id}, Email: ${u.email}`));

        const events = await Event.find({});
        log(`\n--- Events (${events.length}) ---`);
        events.forEach(e => {
            log(`Title: ${e.title}`);
            log(`  ID: ${e._id}`);
            log(`  Organizer: ${e.organizer}`);
            log(`  Status: ${e.status}`);
            log('-------------------');
        });

    } catch (error) {
        log('Error: ' + error.message);
        log(error.stack);
    } finally {
        await mongoose.disconnect();
    }
};

debugEvents();
