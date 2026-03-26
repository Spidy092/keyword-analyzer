require('dotenv').config();

const path = require('path');
const fastify = require('fastify')({ logger: false });
const cors = require('@fastify/cors');
const static = require('@fastify/static');
const view = require('@fastify/view');
const ejs = require('ejs');

const config = require('./src/config');
const { logger, createLogger } = require('./src/utils/logger');
const db = require('./src/db');
const { startRankTracker } = require('./src/workers/rankTracker');

// Routes
const keywordRoutes = require('./src/routes/keywords');
const competitorRoutes = require('./src/routes/competitors');
const analysisRoutes = require('./src/routes/analysis');
const alertRoutes = require('./src/routes/alerts');
const onpageRoutes = require('./src/routes/onpage');


const log = createLogger('server');

async function main() {
    log.info('🚀 Starting Keyword Analyzer...');

    // ─── 1. Database ───
    try {
        await db.initializeDatabase();
        log.info('✅ Database initialized');
    } catch (err) {
        log.error({ err }, '❌ Database initialization failed');
        log.info('💡 Make sure PostgreSQL is running and the database exists.');
        log.info('   Run: createdb keyword_analyzer');
        process.exit(1);
    }

    // ─── 2. Register Plugins ───
    await fastify.register(cors, { origin: true });
    
    await fastify.register(static, {
        root: path.join(__dirname, 'public'),
        prefix: '/public/',
    });

    await fastify.register(view, {
        engine: { ejs },
        root: path.join(__dirname, 'views'),
    });

    // ─── 3. Register Routes ───
    await fastify.register(keywordRoutes, { db });
    await fastify.register(competitorRoutes, { db });
    await fastify.register(analysisRoutes, { db });
    await fastify.register(alertRoutes, { db });
    await fastify.register(onpageRoutes, { db });


    // ─── 4. Dashboard Route ───
    fastify.get('/', async (request, reply) => {
        return reply.view('index.ejs', {
            title: 'Keyword Analyzer',
            version: '1.0.0',
        });
    });

    // ─── 5. Health Check ───
    fastify.get('/health', async () => {
        try {
            await db.query('SELECT 1');
            return { status: 'ok', database: 'connected', uptime: process.uptime() };
        } catch (err) {
            return { status: 'error', database: 'disconnected', error: err.message };
        }
    });

    // ─── 6. Start Rank Tracker ───
    startRankTracker(db);

    // ─── 7. Start Server ───
    try {
        const address = await fastify.listen({ 
            port: config.server.port, 
            host: config.server.host 
        });
        log.info(`🌐 Server running at ${address}`);
        log.info(`📊 Dashboard: http://localhost:${config.server.port}`);
    } catch (err) {
        log.error({ err }, '❌ Failed to start server');
        process.exit(1);
    }
}

// ─── Graceful Shutdown ───
process.on('SIGTERM', async () => {
    log.info('SIGTERM received, shutting down...');
    await fastify.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    log.info('SIGINT received, shutting down...');
    await fastify.close();
    process.exit(0);
});

main().catch(err => {
    log.error({ err }, '❌ Fatal error');
    process.exit(1);
});
