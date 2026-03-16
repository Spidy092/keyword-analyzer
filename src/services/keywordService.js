/**
 * 🔍 Keyword Research Service
 * 
 * Handles keyword research, search volume estimation, and competitor discovery.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');
const { createLogger } = require('../utils/logger');

const log = createLogger('keyword-service');

// ─── User Agents for Rotation ───
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ─── Search Volume Estimation ───
async function estimateSearchVolume(keyword, location = 'India') {
    log.info({ keyword, location }, 'estimating search volume');

    try {
        // Method 1: Serper.dev (if API key available)
        if ( config.apis.serper.key) {
            return await estimateViaSerper(keyword, location);
        }

        // Method 2: Google Autocomplete + Related Searches
        return await estimateViaGoogle(keyword, location);
    } catch (err) {
        log.error({ err: err.message }, 'search volume estimation failed');
        return { volume: 0, competition: 'unknown', cpc: 0, difficulty: 0 };
    }
}

// ─── Estimate via Serper.dev ───
async function estimateViaSerper(keyword, location) {
    try {
        const response = await axios.post(config.apis.serper.url, {
            q: keyword,
            location: location,
            gl: location.toLowerCase().includes('india') ? 'in' : 'us',
            hl: 'en',
            num: 10,
        }, {
            headers: {
                'X-API-KEY': config.apis.serper.key,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });

        const data = response.data;
        
        // Estimate based on results count and related searches
        const resultCount = data.searchInformation?.totalResults || 0;
        const relatedSearches = data.relatedSearches || [];
        
        // Rough estimation algorithm
        let estimatedVolume = 0;
        
        if (resultCount > 10000000) estimatedVolume = 10000 + Math.floor(Math.random() * 5000);
        else if (resultCount > 1000000) estimatedVolume = 5000 + Math.floor(Math.random() * 3000);
        else if (resultCount > 100000) estimatedVolume = 1000 + Math.floor(Math.random() * 2000);
        else if (resultCount > 10000) estimatedVolume = 500 + Math.floor(Math.random() * 500);
        else estimatedVolume = 100 + Math.floor(Math.random() * 200);

        // Adjust based on keyword length (longer = less volume)
        const wordCount = keyword.split(' ').length;
        if (wordCount > 4) estimatedVolume = Math.floor(estimatedVolume * 0.5);
        else if (wordCount > 3) estimatedVolume = Math.floor(estimatedVolume * 0.7);

        // Estimate competition based on ads
        const ads = data.ads || [];
        let competition = 'low';
        if (ads.length > 4) competition = 'high';
        else if (ads.length > 2) competition = 'medium';

        // Estimate difficulty based on domain authority of top results
        const organic = data.organic || [];
        let avgDA = 50;
        if (organic.length > 0) {
            // Check if top results are from high-authority domains
            const highAuthDomains = ['wikipedia.org', 'forbes.com', 'hubspot.com', 'semrush.com', 'ahrefs.com'];
            const highAuthCount = organic.filter(r => 
                highAuthDomains.some(d => r.link?.includes(d))
            ).length;
            avgDA = 30 + (highAuthCount * 15);
        }

        return {
            volume: estimatedVolume,
            competition,
            cpc: ads.length > 0 ? (Math.random() * 2 + 0.5).toFixed(2) : 0,
            difficulty: Math.min(100, avgDA),
            relatedSearches: relatedSearches.map(r => r.query).slice(0, 8),
            resultCount,
        };
    } catch (err) {
        log.error({ err: err.message }, 'serper estimation failed');
        throw err;
    }
}

// ─── Estimate via Google Scraping ───
async function estimateViaGoogle(keyword, location) {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=in&hl=en&num=10`;
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': getRandomUA(),
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        
        // Extract result count
        const resultStats = $('#result-stats').text();
        const resultMatch = resultStats.match(/[\d,]+/);
        const resultCount = resultMatch ? parseInt(resultMatch[0].replace(/,/g, '')) : 0;

        // Extract related searches
        const relatedSearches = [];
        $('div[data-ved] a[href*="search?q="]').each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 3 && text.length < 100) {
                relatedSearches.push(text);
            }
        });

        // Estimate volume based on results
        let estimatedVolume = 0;
        if (resultCount > 10000000) estimatedVolume = 8000 + Math.floor(Math.random() * 4000);
        else if (resultCount > 1000000) estimatedVolume = 3000 + Math.floor(Math.random() * 2000);
        else if (resultCount > 100000) estimatedVolume = 800 + Math.floor(Math.random() * 1000);
        else if (resultCount > 10000) estimatedVolume = 300 + Math.floor(Math.random() * 400);
        else estimatedVolume = 50 + Math.floor(Math.random() * 100);

        // Adjust for keyword length
        const wordCount = keyword.split(' ').length;
        if (wordCount > 4) estimatedVolume = Math.floor(estimatedVolume * 0.4);
        else if (wordCount > 3) estimatedVolume = Math.floor(estimatedVolume * 0.6);

        // Check for ads
        const adCount = $('div[data-text-ad], .uEierd, .commercial-unit-desktop-top').length;
        let competition = 'low';
        if (adCount > 3) competition = 'high';
        else if (adCount > 1) competition = 'medium';

        return {
            volume: estimatedVolume,
            competition,
            cpc: adCount > 0 ? (Math.random() * 1.5 + 0.3).toFixed(2) : 0,
            difficulty: Math.min(100, 40 + Math.floor(Math.random() * 30)),
            relatedSearches: [...new Set(relatedSearches)].slice(0, 8),
            resultCount,
        };
    } catch (err) {
        log.error({ err: err.message }, 'google estimation failed');
        return { volume: 100, competition: 'unknown', cpc: 0, difficulty: 50, relatedSearches: [], resultCount: 0 };
    }
}

// ─── Get SERP Results ───
async function getSERPResults(keyword, location = 'India', numResults = 20) {
    log.info({ keyword, location, numResults }, 'fetching SERP results');

    try {
        if (config.apis.serper.key) {
            return await getSERPViaSerper(keyword, location, numResults);
        }
        return await getSERPViaGoogle(keyword, location, numResults);
    } catch (err) {
        log.error({ err: err.message }, 'SERP fetch failed');
        return [];
    }
}

// ─── SERP via Serper.dev ───
async function getSERPViaSerper(keyword, location, numResults) {
    const results = [];
    const pages = Math.ceil(numResults / 10);

    for (let page = 0; page < pages; page++) {
        try {
            const response = await axios.post(config.apis.serper.url, {
                q: keyword,
                location: location,
                gl: location.toLowerCase().includes('india') ? 'in' : 'us',
                hl: 'en',
                num: 10,
                page: page,
            }, {
                headers: {
                    'X-API-KEY': config.apis.serper.key,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });

            const organic = response.data.organic || [];
            for (const result of organic) {
                results.push({
                    position: results.length + 1,
                    url: result.link,
                    domain: extractDomain(result.link),
                    title: result.title,
                    description: result.snippet,
                });
            }

            if (page < pages - 1) {
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (err) {
            log.error({ page, err: err.message }, 'serper page fetch failed');
            break;
        }
    }

    return results.slice(0, numResults);
}

// ─── SERP via Google Scraping ───
async function getSERPViaGoogle(keyword, location, numResults) {
    const results = [];
    const pages = Math.ceil(numResults / 10);

    for (let page = 0; page < pages; page++) {
        try {
            const start = page * 10;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=in&hl=en&num=10&start=${start}`;
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': getRandomUA(),
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: 10000,
            });

            const $ = cheerio.load(response.data);
            
            $('div.g').each((i, el) => {
                const link = $(el).find('a').attr('href');
                const title = $(el).find('h3').text();
                const description = $(el).find('div[data-sncf], span.aCOpRe, div.VwiC3b').first().text();

                if (link && link.startsWith('http') && !link.includes('google.com')) {
                    results.push({
                        position: results.length + 1,
                        url: link,
                        domain: extractDomain(link),
                        title,
                        description,
                    });
                }
            });

            if (page < pages - 1) {
                await new Promise(r => setTimeout(r, 3000));
            }
        } catch (err) {
            log.error({ page, err: err.message }, 'google page fetch failed');
            break;
        }
    }

    return results.slice(0, numResults);
}

// ─── Analyze Page Content ───
async function analyzePageContent(url, keyword) {
    log.info({ url, keyword }, 'analyzing page content');

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': getRandomUA() },
            timeout: 15000,
            maxRedirects: 5,
        });

        const $ = cheerio.load(response.data);
        
        // Remove scripts, styles, nav, footer
        $('script, style, nav, footer, header, aside').remove();
        
        // Get main content
        const bodyText = $('body').text().toLowerCase();
        const words = bodyText.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        // Count keyword occurrences
        const keywordLower = keyword.toLowerCase();
        const keywordWords = keywordLower.split(' ');
        
        // Exact phrase count
        const exactMatches = (bodyText.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        
        // Individual word counts
        const wordCounts = {};
        keywordWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            wordCounts[word] = (bodyText.match(regex) || []).length;
        });

        // Calculate density
        const keywordDensity = wordCount > 0 ? ((exactMatches * keywordWords.length) / wordCount * 100).toFixed(2) : 0;

        // Check SEO elements
        const hasH1 = $('h1').length > 0;
        const h1Text = $('h1').first().text();
        const hasMetaDescription = $('meta[name="description"]').attr('content') ? true : false;
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        
        // Check headings structure
        const headings = {
            h1: $('h1').length,
            h2: $('h2').length,
            h3: $('h3').length,
        };

        // Check images with alt text
        const images = $('img').length;
        const imagesWithAlt = $('img[alt]').length;

        // Check internal/external links
        const domain = extractDomain(url);
        let internalLinks = 0;
        let externalLinks = 0;
        $('a[href]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                if (href.includes(domain) || href.startsWith('/') || href.startsWith('#')) {
                    internalLinks++;
                } else if (href.startsWith('http')) {
                    externalLinks++;
                }
            }
        });

        // Check for schema markup
        const hasSchema = $('script[type="application/ld+json"]').length > 0;

        return {
            url,
            wordCount,
            keywordAnalysis: {
                exactMatches,
                wordCounts,
                density: parseFloat(keywordDensity),
            },
            seoElements: {
                hasH1,
                h1Text,
                hasMetaDescription,
                metaDescription,
                headings,
                images,
                imagesWithAlt,
                internalLinks,
                externalLinks,
                hasSchema,
            },
        };
    } catch (err) {
        log.error({ url, err: err.message }, 'page analysis failed');
        return {
            url,
            wordCount: 0,
            keywordAnalysis: { exactMatches: 0, wordCounts: {}, density: 0 },
            seoElements: { hasH1: false, hasMetaDescription: false },
            error: err.message,
        };
    }
}

// ─── Get Domain Authority ───
async function getDomainAuthority(domain) {
    try {
        if (config.apis.openPageRank.key) {
            const response = await axios.get(
                `${config.apis.openPageRank.url}?domains%5B0%5D=${domain}`,
                {
                    headers: { 'API-OPR': config.apis.openPageRank.key },
                    timeout: 5000,
                }
            );
            
            if (response.data?.response?.[0]?.page_rank_integer !== undefined) {
                return response.data.response[0].page_rank_integer * 10;
            }
        }

        // Fallback: estimate based on domain characteristics
        let score = 30;
        if (domain.endsWith('.edu') || domain.endsWith('.gov')) score = 80;
        else if (domain.endsWith('.org')) score = 50;
        else if (domain.includes('wikipedia') || domain.includes('medium')) score = 90;
        else if (domain.split('.').length === 2) score = 40; // Short domains tend to be older

        return score;
    } catch (err) {
        log.debug({ domain, err: err.message }, 'DA check failed');
        return 30;
    }
}

// ─── Extract Domain from URL ───
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return url;
    }
}

// ─── Get Keyword Suggestions ───
async function getKeywordSuggestions(seed, location = 'India') {
    log.info({ seed, location }, 'getting keyword suggestions');

    try {
        // Google Autocomplete
        const autocompleteUrl = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=${encodeURIComponent(seed)}`;
        
        const response = await axios.get(autocompleteUrl, {
            headers: { 'User-Agent': getRandomUA() },
            timeout: 5000,
        });

        const suggestions = response.data?.[1] || [];
        
        // Also get related searches from SERP
        const serpData = await estimateViaGoogle(seed, location);
        const relatedSearches = serpData.relatedSearches || [];

        // Combine and deduplicate
        const allSuggestions = [...new Set([...suggestions, ...relatedSearches])];

        return allSuggestions.map(s => ({
            keyword: s,
            type: s.includes(seed) ? 'autocomplete' : 'related',
        }));
    } catch (err) {
        log.error({ err: err.message }, 'suggestions fetch failed');
        return [];
    }
}

module.exports = {
    estimateSearchVolume,
    getSERPResults,
    analyzePageContent,
    getDomainAuthority,
    extractDomain,
    getKeywordSuggestions,
};
