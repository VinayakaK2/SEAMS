const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Allow client origin
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Make io accessible to our router
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle user joining rooms based on role
    socket.on('join_rooms', async ({ userId, role }) => {
        try {
            console.log(`User ${userId} with role ${role} joining rooms`);

            // Join role-based room
            socket.join(`room:${role}`);
            console.log(`User joined room:${role}`);

            // If coordinator, join rooms for their events
            if (role === 'coordinator' || role === 'faculty') {
                const Event = require('./models/Event');
                const userEvents = await Event.find({ organizer: userId });

                userEvents.forEach(event => {
                    socket.join(`event:${event._id}:organizer`);
                    console.log(`Coordinator joined event:${event._id}:organizer`);
                });
            }

            socket.emit('rooms_joined', { success: true });
        } catch (error) {
            console.error('Error joining rooms:', error);
            socket.emit('rooms_joined', { success: false, error: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Database Connection
connectDB();

// Routes
app.get('/', (req, res) => {
    res.send('SEAMS API is running...');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const auditRoutes = require('./routes/auditRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
