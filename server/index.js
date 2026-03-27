const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');
const { requestContext, promClient } = require('./middleware/metrics');
const { generalLimiter } = require('./middleware/limiter');

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

// ── Observability: per-request metrics tracking (response time, DB queries, cache hits)
app.use(requestContext);

// ── General rate limiter: 200 req/min per IP — broad abuse protection
app.use('/api', generalLimiter);

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
                const userEvents = await db('events').where({ organizer_id: userId });

                userEvents.forEach(event => {
                    socket.join(`event:${event.id}:organizer`);
                    console.log(`Coordinator joined event:${event.id}:organizer`);
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

// PostgreSQL Connection is handled by db.js pool
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// Deep health check — verifies DB pool is alive
app.get('/health/db', async (req, res) => {
    try {
        await db.raw('SELECT 1');
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(503).json({ status: 'error', db: 'unreachable', error: err.message });
    }
});

// V12 Readiness Probe for container orchestration (Kubernetes) checks full stack
app.get('/ready', async (req, res) => {
    const checks = { db: false, redis: false, ml: false, vector: false };
    
    // DB Check
    try {
        await db.raw('SELECT 1');
        checks.db = true;
    } catch(e) {}
    
    // Redis Check
    try {
        const redisClient = require('./utils/redisClient');
        await redisClient.ping();
        checks.redis = true;
    } catch(e) {}

    // ML Verification
    try {
        const axios = require('axios');
        const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';
        // Check ML cluster availability natively
        await axios.get(`${mlUrl}/health`, { timeout: 1500 });
        checks.ml = true; // Flag true if we successfully reached without hanging
    } catch(e) {
        if (e.response && e.response.status === 200) checks.ml = true;
        // else ignore (leaves false)
    }

    // Vector Verification
    try {
        const axios = require('axios');
        const vectorUrl = process.env.VECTOR_SERVICE_URL || 'http://127.0.0.1:5002';
        await axios.get(`${vectorUrl}/health`, { timeout: 1500 });
        checks.vector = true;
    } catch (e) {
        if (e.response && e.response.status === 200) checks.vector = true;
    }

    const isReady = Object.values(checks).every(Boolean);
    res.status(isReady ? 200 : 503).json({ 
        status: isReady ? 'ready' : 'degraded', 
        checks,
        timestamp: new Date().toISOString()
    });
});

// Prometheus metrics endpoint exposing all instrumented app metrics
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
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
const adminRoutes = require('./routes/adminRoutes');

// Import Background Jobs
require('./jobs/recommendationJob');

app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// SPA fallback - serve index.html for all non-API routes (production only)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
