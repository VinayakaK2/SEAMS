const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve static files from React build (production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
}

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

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// Routes
app.get('/api', (req, res) => {
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

// SPA fallback - serve index.html for all non-API routes (production only)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
