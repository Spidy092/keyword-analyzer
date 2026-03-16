/**
 * 🚨 Alerts & Rank Tracking Routes
 */

const { createLogger } = require('../utils/logger');

const log = createLogger('routes:alerts');

async function alertRoutes(fastify, options) {
    const { db } = options;

    // ─── Add Domain to Track ───
    fastify.post('/api/alerts/track', {
        schema: {
            body: {
                type: 'object',
                required: ['domain'],
                properties: {
                    domain: { type: 'string' },
                },
            },
        },
        handler: async (request, reply) => {
            const { domain } = request.body;

            try {
                await db.query(
                    `INSERT INTO my_domains (domain) VALUES ($1)
                     ON CONFLICT (domain) DO NOTHING`,
                    [domain]
                );

                return {
                    success: true,
                    message: `Now tracking ${domain}`,
                };
            } catch (err) {
                log.error({ err: err.message }, 'failed to add domain');
                return reply.code(500).send({ error: err.message });
            }
        },
    });

    // ─── Get Tracked Domains ───
    fastify.get('/api/alerts/domains', async (request, reply) => {
        try {
            const result = await db.query(
                'SELECT * FROM my_domains ORDER BY added_at DESC'
            );

            return {
                domains: result.rows,
                total: result.rows.length,
            };
        } catch (err) {
            log.error({ err: err.message }, 'failed to get domains');
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── Get All Alerts ───
    fastify.get('/api/alerts', async (request, reply) => {
        const { domain, unreadOnly = false, limit = 50 } = request.query;

        try {
            let query = `
                SELECT a.*, k.keyword
                FROM alerts a
                JOIN keywords k ON a.keyword_id = k.id
            `;
            const params = [];
            const conditions = [];

            if (domain) {
                conditions.push(`a.domain = $${params.length + 1}`);
                params.push(domain);
            }

            if (unreadOnly === 'true') {
                conditions.push(`a.is_read = FALSE`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
            params.push(limit);

            const result = await db.query(query, params);

            // Get unread count
            const unreadResult = await db.query(
                'SELECT COUNT(*) as count FROM alerts WHERE is_read = FALSE'
            );

            return {
                alerts: result.rows,
                total: result.rows.length,
                unreadCount: parseInt(unreadResult.rows[0].count),
            };
        } catch (err) {
            log.error({ err: err.message }, 'failed to get alerts');
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── Mark Alert as Read ───
    fastify.put('/api/alerts/:id/read', async (request, reply) => {
        const { id } = request.params;

        try {
            await db.query(
                'UPDATE alerts SET is_read = TRUE WHERE id = $1',
                [id]
            );

            return { success: true };
        } catch (err) {
            log.error({ err: err.message }, 'failed to mark alert');
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── Mark All as Read ───
    fastify.put('/api/alerts/read-all', async (request, reply) => {
        const { domain } = request.body || {};

        try {
            if (domain) {
                await db.query(
                    'UPDATE alerts SET is_read = TRUE WHERE domain = $1',
                    [domain]
                );
            } else {
                await db.query('UPDATE alerts SET is_read = TRUE');
            }

            return { success: true };
        } catch (err) {
            log.error({ err: err.message }, 'failed to mark alerts');
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── Get Rank History ───
    fastify.get('/api/alerts/rank-history', async (request, reply) => {
        const { domain, keywordId, days = 30 } = request.query;

        try {
            let query = `
                SELECT rh.*, k.keyword
                FROM rank_history rh
                JOIN keywords k ON rh.keyword_id = k.id
                WHERE rh.checked_at > NOW() - INTERVAL '${parseInt(days)} days'
            `;
            const params = [];

            if (domain) {
                query += ` AND rh.domain = $${params.length + 1}`;
                params.push(domain);
            }

            if (keywordId) {
                query += ` AND rh.keyword_id = $${params.length + 1}`;
                params.push(keywordId);
            }

            query += ' ORDER BY rh.checked_at DESC';

            const result = await db.query(query, params);

            return {
                history: result.rows,
                total: result.rows.length,
            };
        } catch (err) {
            log.error({ err: err.message }, 'failed to get rank history');
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── Get Rank Changes Summary ───
    fastify.get('/api/alerts/summary', async (request, reply) => {
        const { domain } = request.query;

        try {
            if (!domain) {
                return reply.code(400).send({ error: 'domain is required' });
            }

            // Get current rankings
            const currentRankings = await db.query(
                `SELECT dr.*, k.keyword, k.search_volume
                 FROM domain_rankings dr
                 JOIN keywords k ON dr.keyword_id = k.id
                 WHERE dr.domain = $1
                 ORDER BY dr.rank_position`,
                [domain]
            );

            // Get recent changes
            const recentChanges = await db.query(
                `SELECT 
                    COUNT(*) FILTER (WHERE change_direction = 'up') as improved,
                    COUNT(*) FILTER (WHERE change_direction = 'down') as dropped,
                    COUNT(*) FILTER (WHERE change_direction = 'same') as stable,
                    COUNT(*) FILTER (WHERE change_direction = 'new') as new_rankings
                 FROM rank_history
                 WHERE domain = $1 AND checked_at > NOW() - INTERVAL '7 days'`,
                [domain]
            );

            // Get alerts count
            const alertsCount = await db.query(
                `SELECT COUNT(*) as count FROM alerts 
                 WHERE domain = $1 AND is_read = FALSE`,
                [domain]
            );

            return {
                domain,
                currentRankings: currentRankings.rows,
                totalKeywords: currentRankings.rows.length,
                changes: recentChanges.rows[0],
                unreadAlerts: parseInt(alertsCount.rows[0].count),
            };
        } catch (err) {
            log.error({ err: err.message }, 'failed to get summary');
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── Delete Alert ───
    fastify.delete('/api/alerts/:id', async (request, reply) => {
        const { id } = request.params;

        try {
            await db.query('DELETE FROM alerts WHERE id = $1', [id]);
            return { success: true };
        } catch (err) {
            log.error({ err: err.message }, 'failed to delete alert');
            return reply.code(500).send({ error: err.message });
        }
    });
}

module.exports = alertRoutes;
