const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Admin user details
        const adminEmail = 'admin@seams.edu';
        const adminPassword = 'admin123';
        const adminName = 'System Administrator';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('❌ Admin user already exists!');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Create admin user
        const admin = new User({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            isEmailVerified: true,
            usn: 'ADMIN001',
            branch: 'Administration',
            semester: 'N/A'
        });

        await admin.save();

        console.log('\n✅ Admin user created successfully!');
        console.log('\n📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        console.log('\n⚠️  Please change the password after first login!\n');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
