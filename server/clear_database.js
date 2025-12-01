const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const clearDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get all collections
        const collections = await mongoose.connection.db.collections();

        console.log(`\nFound ${collections.length} collections:`);
        collections.forEach(col => console.log(`  - ${col.collectionName}`));

        console.log('\n⚠️  WARNING: This will delete ALL data from the database!');
        console.log('Clearing database in 3 seconds...\n');

        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Drop each collection
        for (const collection of collections) {
            await collection.drop();
            console.log(`✓ Dropped collection: ${collection.collectionName}`);
        }

        console.log('\n✅ Database cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

clearDatabase();
