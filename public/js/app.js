/**
 * 🎯 Keyword Analyzer - Frontend App
 */

const API_BASE = '';

// ─── State ───
let currentPage = 'dashboard';
let currentKeyword = null;

// ─── DOM Elements ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadDashboard();
    loadAlerts();
});

// ─── Navigation ───
function initNavigation() {
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    $$('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });

    // Menu toggle for mobile
    $('.menu-toggle')?.addEventListener('click', () => {
        $('.sidebar').classList.toggle('active');
    });
}

function navigateTo(page) {
    currentPage = page;
    
    // Update nav
    $$('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update page
    $$('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        research: 'Keyword Research',
        competitors: 'Competitors',
        analysis: 'Compare & Analyze',
        tracking: 'Rank Tracking',
        alerts: 'Alerts',
    };
    $('#pageTitle').textContent = titles[page] || page;

    // Load page data
    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'research': break;
        case 'competitors': loadTopCompetitors(); break;
        case 'tracking': loadTrackedDomains(); break;
        case 'alerts': loadAlerts(); break;
    }
}

// ─── API Helper ───
async function api(endpoint, options = {}) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const data = await response.json();
        hideLoading();
        return data;
    } catch (err) {
        hideLoading();
        console.error('API Error:', err);
        showError(err.message);
        throw err;
    }
}

// ─── Dashboard ───
async function loadDashboard() {
    try {
        // Load keywords
        const keywordsData = await api('/api/keywords?limit=5');
        renderRecentKeywords(keywordsData.keywords || []);

        // Load alerts
        const alertsData = await api('/api/alerts?limit=5');
        renderRecentAlerts(alertsData.alerts || []);

        // Update stats
        $('#totalKeywords').textContent = keywordsData.total || 0;
        $('#activeAlerts').textContent = alertsData.unreadCount || 0;

        // Load competitors count
        const competitorsData = await api('/api/competitors/top?limit=1');
        $('#totalCompetitors').textContent = competitorsData.total || 0;

    } catch (err) {
        console.error('Dashboard load failed:', err);
    }
}

function renderRecentKeywords(keywords) {
    const tbody = $('#recentKeywordsTable tbody');
    if (!keywords.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No keywords yet</td></tr>';
        return;
    }

    tbody.innerHTML = keywords.map(kw => `
        <tr>
            <td><strong>${kw.keyword}</strong></td>
            <td>${formatNumber(kw.search_volume)}</td>
            <td><span class="badge badge-${kw.competition}">${kw.competition}</span></td>
            <td>
                <div class="progress-bar">
                    <div class="progress" style="width: ${kw.difficulty}%"></div>
                </div>
                ${kw.difficulty}%
            </td>
        </tr>
    `).join('');
}

function renderRecentAlerts(alerts) {
    const container = $('#recentAlertsList');
    if (!alerts.length) {
        container.innerHTML = '<p class="text-center text-muted">No alerts yet</p>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.is_read ? '' : 'unread'}">
            <div class="alert-icon ${getAlertIconClass(alert.alert_type)}">
                <i class="fas ${getAlertIcon(alert.alert_type)}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time">${formatTimeAgo(alert.created_at)}</div>
            </div>
        </div>
    `).join('');
}

// ─── Keyword Research ───
$('#researchBtn')?.addEventListener('click', async () => {
    const keyword = $('#keywordInput').value.trim();
    const location = $('#locationInput').value;

    if (!keyword) {
        showError('Please enter a keyword');
        return;
    }

    try {
        const data = await api('/api/keywords/research', {
            method: 'POST',
            body: JSON.stringify({ keyword, location }),
        });

        currentKeyword = data.keyword;
        renderResearchResults(data);
    } catch (err) {
        console.error('Research failed:', err);
    }
});

function renderResearchResults(data) {
    $('#researchResults').style.display = 'block';

    // Overview
    $('#searchVolume').textContent = formatNumber(data.keyword.searchVolume);
    $('#competition').textContent = data.keyword.competition;
    $('#competition').className = `value badge badge-${data.keyword.competition}`;
    $('#cpc').textContent = `$${data.keyword.cpc}`;
    $('#difficulty').textContent = `${data.keyword.difficulty}%`;

    // Competitors
    $('#competitorCount').textContent = data.competitors.length;
    const tbody = $('#competitorsTable tbody');
    tbody.innerHTML = data.competitors.map((comp, i) => `
        <tr>
            <td>${comp.position}</td>
            <td class="domain">${comp.domain}</td>
            <td>${truncate(comp.title, 50)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="analyzeCompetitor('${comp.url}', '${data.keyword.keyword}')">
                    <i class="fas fa-chart-bar"></i> Analyze
                </button>
            </td>
        </tr>
    `).join('');

    // Related searches
    const relatedContainer = $('#relatedSearches');
    relatedContainer.innerHTML = (data.keyword.relatedSearches || []).map(rs => 
        `<span class="tag" onclick="searchRelated('${rs}')">${rs}</span>`
    ).join('');
}

function searchRelated(keyword) {
    $('#keywordInput').value = keyword;
    $('#researchBtn').click();
}

// ─── Analyze Competitor ───
async function analyzeCompetitor(url, keyword) {
    try {
        const data = await api('/api/competitors/analyze', {
            method: 'POST',
            body: JSON.stringify({ url, keyword }),
        });

        showCompetitorAnalysis(data.analysis);
    } catch (err) {
        console.error('Analysis failed:', err);
    }
}

function showCompetitorAnalysis(analysis) {
    const modal = $('#competitorAnalysisModal');
    const content = $('#competitorAnalysisContent');

    content.innerHTML = `
        <div class="analysis-detail">
            <h4>${analysis.domain}</h4>
            <p class="url">${analysis.url}</p>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="label">Domain Authority</span>
                    <span class="value">${analysis.domainAuthority}</span>
                </div>
                <div class="stat-box">
                    <span class="label">Word Count</span>
                    <span class="value">${formatNumber(analysis.content.wordCount)}</span>
                </div>
                <div class="stat-box">
                    <span class="label">Keyword Density</span>
                    <span class="value">${analysis.content.keywordAnalysis.density}%</span>
                </div>
                <div class="stat-box">
                    <span class="label">Keyword Matches</span>
                    <span class="value">${analysis.content.keywordAnalysis.exactMatches}</span>
                </div>
            </div>

            <h5>SEO Elements</h5>
            <div class="seo-checks">
                <div class="check ${analysis.seo.hasH1 ? 'pass' : 'fail'}">
                    <i class="fas ${analysis.seo.hasH1 ? 'fa-check' : 'fa-times'}"></i>
                    H1 Tag
                </div>
                <div class="check ${analysis.seo.hasMetaDescription ? 'pass' : 'fail'}">
                    <i class="fas ${analysis.seo.hasMetaDescription ? 'fa-check' : 'fa-times'}"></i>
                    Meta Description
                </div>
                <div class="check ${analysis.seo.hasSchema ? 'pass' : 'fail'}">
                    <i class="fas ${analysis.seo.hasSchema ? 'fa-check' : 'fa-times'}"></i>
                    Schema Markup
                </div>
            </div>

            <h5>Links</h5>
            <div class="link-stats">
                <span>Internal: ${analysis.seo.internalLinks || 0}</span>
                <span>External: ${analysis.seo.externalLinks || 0}</span>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

// Close modal
$$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

// ─── Competitors Page ───
async function loadTopCompetitors() {
    try {
        const data = await api('/api/competitors/top?limit=20');
        renderTopCompetitors(data.competitors || []);
    } catch (err) {
        console.error('Failed to load competitors:', err);
    }
}

function renderTopCompetitors(competitors) {
    const tbody = $('#topCompetitorsTable tbody');
    if (!competitors.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No competitors found</td></tr>';
        return;
    }

    tbody.innerHTML = competitors.map(comp => `
        <tr>
            <td class="domain">${comp.domain}</td>
            <td>${comp.keyword_count}</td>
            <td>#${Math.round(comp.avg_position)}</td>
            <td>#${comp.best_position}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewCompetitorDetail('${comp.domain}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewCompetitorDetail(domain) {
    try {
        const data = await api(`/api/competitors/${domain}`);
        
        $('#competitorDetail').style.display = 'block';
        $('#competitorDomain').textContent = domain;
        $('#competitorDA').textContent = data.domainAuthority;
        $('#competitorKeywords').textContent = data.totalKeywords;

        const tbody = $('#competitorRankingsTable tbody');
        tbody.innerHTML = data.rankings.map(r => `
            <tr>
                <td>${r.keyword}</td>
                <td>#${r.rank_position}</td>
                <td>${formatNumber(r.search_volume)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load competitor detail:', err);
    }
}

$('#closeCompetitorDetail')?.addEventListener('click', () => {
    $('#competitorDetail').style.display = 'none';
});

// ─── Analysis Page ───
$('#analyzeBtn')?.addEventListener('click', async () => {
    const myDomain = $('#myDomainInput').value.trim();
    const competitorDomain = $('#competitorDomainInput').value.trim();
    const keyword = $('#analysisKeywordInput').value.trim();
    const myUrl = $('#myUrlInput').value.trim();
    const competitorUrl = $('#competitorUrlInput').value.trim();

    if (!myDomain || !competitorDomain || !keyword) {
        showError('Please fill in all required fields');
        return;
    }

    try {
        const data = await api('/api/analysis/compare', {
            method: 'POST',
            body: JSON.stringify({ myDomain, competitorDomain, keyword, myUrl, competitorUrl }),
        });

        renderAnalysisResults(data.comparison);
    } catch (err) {
        console.error('Analysis failed:', err);
    }
});

function renderAnalysisResults(comparison) {
    $('#analysisResults').style.display = 'block';

    // Comparison grid
    const grid = $('#comparisonGrid');
    grid.innerHTML = `
        <div class="comparison-item">
            <div class="domain">${comparison.myDomain}</div>
            <div class="score mine">${comparison.scores?.domainAuthority?.mine || '-'}</div>
            <div class="label">Domain Authority</div>
        </div>
        <div class="comparison-item">
            <div class="domain">${comparison.competitorDomain}</div>
            <div class="score competitor">${comparison.scores?.domainAuthority?.competitor || '-'}</div>
            <div class="label">Domain Authority</div>
        </div>
    `;

    // Reasons
    const reasonsList = $('#reasonsList');
    reasonsList.innerHTML = (comparison.whyCompetitorRanks || []).map(reason => `
        <div class="reason-item ${reason.impact.toLowerCase()}">
            <div class="factor">${reason.factor}</div>
            <div class="explanation">${reason.explanation}</div>
            <div class="gap">Gap: ${reason.gap}</div>
        </div>
    `).join('') || '<p>No significant differences found</p>';

    // Suggestions
    const suggestionsList = $('#suggestionsList');
    suggestionsList.innerHTML = (comparison.suggestions || []).map(sug => `
        <div class="suggestion-item">
            <span class="priority badge badge-${sug.priority.toLowerCase()}">${sug.priority}</span>
            <div class="action">${sug.action}</div>
            <ul class="details">
                ${sug.details.map(d => `<li>${d}</li>`).join('')}
            </ul>
            <div class="impact">📈 ${sug.estimatedImpact}</div>
        </div>
    `).join('') || '<p>No suggestions available</p>';
}

// ─── Rank Tracking ───
$('#trackDomainBtn')?.addEventListener('click', async () => {
    const domain = $('#trackDomainInput').value.trim();
    if (!domain) {
        showError('Please enter a domain');
        return;
    }

    try {
        await api('/api/alerts/track', {
            method: 'POST',
            body: JSON.stringify({ domain }),
        });

        $('#trackDomainInput').value = '';
        loadTrackedDomains();
        showSuccess(`Now tracking ${domain}`);
    } catch (err) {
        console.error('Failed to track domain:', err);
    }
});

async function loadTrackedDomains() {
    try {
        const data = await api('/api/alerts/domains');
        renderTrackedDomains(data.domains || []);

        // Load rank history
        const historyData = await api('/api/alerts/rank-history?days=7');
        renderRankHistory(historyData.history || []);
    } catch (err) {
        console.error('Failed to load tracked domains:', err);
    }
}

function renderTrackedDomains(domains) {
    const tbody = $('#trackedDomainsTable tbody');
    if (!domains.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No domains tracked</td></tr>';
        return;
    }

    tbody.innerHTML = domains.map(d => `
        <tr>
            <td class="domain">${d.domain}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="checkDomainRankings('${d.domain}')">
                    <i class="fas fa-sync"></i> Check
                </button>
            </td>
        </tr>
    `).join('');
}

function renderRankHistory(history) {
    const tbody = $('#rankHistoryTable tbody');
    if (!history.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No rank history</td></tr>';
        return;
    }

    tbody.innerHTML = history.map(h => `
        <tr>
            <td>${h.keyword}</td>
            <td class="domain">${h.domain}</td>
            <td>${h.previous_rank > 0 ? '#' + h.previous_rank : '-'}</td>
            <td>${h.rank_position > 0 ? '#' + h.rank_position : '-'}</td>
            <td>
                <span class="badge badge-${getChangeClass(h.change_direction)}">
                    ${getChangeIcon(h.change_direction)} ${h.change_direction}
                </span>
            </td>
            <td>${formatTimeAgo(h.checked_at)}</td>
        </tr>
    `).join('');
}

async function checkDomainRankings(domain) {
    try {
        showLoading();
        // This would trigger a manual rank check
        showSuccess(`Checking rankings for ${domain}...`);
        // Reload after check
        setTimeout(() => {
            loadTrackedDomains();
            hideLoading();
        }, 5000);
    } catch (err) {
        hideLoading();
        console.error('Rank check failed:', err);
    }
}

// ─── Alerts Page ───
async function loadAlerts() {
    try {
        const data = await api('/api/alerts?limit=50');
        renderAlerts(data.alerts || []);
        
        // Update badge
        const badge = $('#alertBadge');
        if (badge) {
            badge.textContent = data.unreadCount || 0;
            badge.style.display = data.unreadCount > 0 ? 'inline' : 'none';
        }
    } catch (err) {
        console.error('Failed to load alerts:', err);
    }
}

function renderAlerts(alerts) {
    const container = $('#alertsListFull');
    if (!alerts.length) {
        container.innerHTML = '<p class="text-center">No alerts</p>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.is_read ? '' : 'unread'}" data-type="${alert.alert_type}">
            <div class="alert-icon ${getAlertIconClass(alert.alert_type)}">
                <i class="fas ${getAlertIcon(alert.alert_type)}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time">${formatTimeAgo(alert.created_at)}</div>
            </div>
            ${!alert.is_read ? `
                <button class="btn btn-sm" onclick="markAlertRead(${alert.id})">
                    <i class="fas fa-check"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

// Filter alerts
$$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        $$('.alert-item').forEach(item => {
            if (filter === 'all' || item.dataset.type === filter) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

async function markAlertRead(id) {
    try {
        await api(`/api/alerts/${id}/read`, { method: 'PUT' });
        loadAlerts();
    } catch (err) {
        console.error('Failed to mark alert:', err);
    }
}

$('#markAllReadBtn')?.addEventListener('click', async () => {
    try {
        await api('/api/alerts/read-all', { method: 'PUT', body: '{}' });
        loadAlerts();
        showSuccess('All alerts marked as read');
    } catch (err) {
        console.error('Failed to mark alerts:', err);
    }
});

// ─── Helpers ───
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
}

function getAlertIcon(type) {
    const icons = {
        rank_drop: 'fa-arrow-down',
        rank_improvement: 'fa-arrow-up',
        new_ranking: 'fa-star',
        lost_ranking: 'fa-times-circle',
    };
    return icons[type] || 'fa-bell';
}

function getAlertIconClass(type) {
    const classes = {
        rank_drop: 'drop',
        rank_improvement: 'up',
        new_ranking: 'new',
        lost_ranking: 'drop',
    };
    return classes[type] || '';
}

function getChangeClass(direction) {
    const classes = {
        up: 'low',
        down: 'high',
        same: 'medium',
        new: 'low',
        lost: 'high',
    };
    return classes[direction] || 'medium';
}

function getChangeIcon(direction) {
    const icons = {
        up: '↑',
        down: '↓',
        same: '→',
        new: '★',
        lost: '✗',
    };
    return icons[direction] || '→';
}

function showLoading() {
    $('#loadingOverlay')?.classList.add('active');
}

function hideLoading() {
    $('#loadingOverlay')?.classList.remove('active');
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}
