/**
 * 📊 Analysis Service
 * 
 * Compares domains, analyzes why competitors rank, and generates improvement suggestions.
 */

const { createLogger } = require('../utils/logger');
const keywordService = require('./keywordService');

const log = createLogger('analysis-service');

// ─── Compare My Domain vs Competitor ───
async function compareDomains(myDomain, competitorDomain, keyword, myPageData = null, competitorPageData = null) {
    log.info({ myDomain, competitorDomain, keyword }, 'comparing domains');

    const comparison = {
        keyword,
        myDomain,
        competitorDomain,
        timestamp: new Date().toISOString(),
        scores: {},
        differences: {},
        whyCompetitorRanks: [],
        suggestions: [],
    };

    try {
        // Get domain authorities
        const [myDA, competitorDA] = await Promise.all([
            keywordService.getDomainAuthority(myDomain),
            keywordService.getDomainAuthority(competitorDomain),
        ]);

        comparison.scores.domainAuthority = {
            mine: myDA,
            competitor: competitorDA,
            difference: competitorDA - myDA,
        };

        // If we have page data, compare content
        if (myPageData && competitorPageData) {
            comparison.scores.content = compareContent(myPageData, competitorPageData);
            comparison.scores.seo = compareSEO(myPageData, competitorPageData);
        }

        // Analyze why competitor ranks
        comparison.whyCompetitorRanks = analyzeWhyCompetitorRanks(
            comparison.scores,
            myPageData,
            competitorPageData
        );

        // Generate suggestions
        comparison.suggestions = generateSuggestions(
            comparison.scores,
            comparison.whyCompetitorRanks,
            myPageData,
            competitorPageData
        );

        // Calculate overall score
        comparison.overallScore = calculateOverallScore(comparison.scores);

        return comparison;
    } catch (err) {
        log.error({ err: err.message }, 'comparison failed');
        return { ...comparison, error: err.message };
    }
}

// ─── Compare Content ───
function compareContent(myPage, competitorPage) {
    const myKW = myPage.keywordAnalysis || {};
    const compKW = competitorPage.keywordAnalysis || {};

    return {
        wordCount: {
            mine: myPage.wordCount || 0,
            competitor: competitorPage.wordCount || 0,
            difference: (competitorPage.wordCount || 0) - (myPage.wordCount || 0),
            winner: (competitorPage.wordCount || 0) > (myPage.wordCount || 0) ? 'competitor' : 'mine',
        },
        keywordDensity: {
            mine: myKW.density || 0,
            competitor: compKW.density || 0,
            difference: ((compKW.density || 0) - (myKW.density || 0)).toFixed(2),
            winner: (compKW.density || 0) > (myKW.density || 0) ? 'competitor' : 'mine',
        },
        exactMatches: {
            mine: myKW.exactMatches || 0,
            competitor: compKW.exactMatches || 0,
            difference: (compKW.exactMatches || 0) - (myKW.exactMatches || 0),
            winner: (compKW.exactMatches || 0) > (myKW.exactMatches || 0) ? 'competitor' : 'mine',
        },
    };
}

// ─── Compare SEO Elements ───
function compareSEO(myPage, competitorPage) {
    const mySEO = myPage.seoElements || {};
    const compSEO = competitorPage.seoElements || {};

    const checks = {
        hasH1: { mine: mySEO.hasH1, competitor: compSEO.hasH1 },
        hasMetaDescription: { mine: mySEO.hasMetaDescription, competitor: compSEO.hasMetaDescription },
        hasSchema: { mine: mySEO.hasSchema, competitor: compSEO.hasSchema },
        internalLinks: { mine: mySEO.internalLinks || 0, competitor: compSEO.internalLinks || 0 },
        externalLinks: { mine: mySEO.externalLinks || 0, competitor: compSEO.externalLinks || 0 },
        images: { mine: mySEO.images || 0, competitor: compSEO.images || 0 },
        imagesWithAlt: { mine: mySEO.imagesWithAlt || 0, competitor: compSEO.imagesWithAlt || 0 },
    };

    // Calculate SEO score
    let myScore = 0;
    let compScore = 0;

    if (mySEO.hasH1) myScore += 15;
    if (compSEO.hasH1) compScore += 15;
    if (mySEO.hasMetaDescription) myScore += 15;
    if (compSEO.hasMetaDescription) compScore += 15;
    if (mySEO.hasSchema) myScore += 20;
    if (compSEO.hasSchema) compScore += 20;
    
    // Link score (more internal links = better)
    myScore += Math.min(25, (mySEO.internalLinks || 0) * 2);
    compScore += Math.min(25, (compSEO.internalLinks || 0) * 2);
    
    // Image alt text score
    const myAltRatio = mySEO.images > 0 ? (mySEO.imagesWithAlt / mySEO.images) : 0;
    const compAltRatio = compSEO.images > 0 ? (compSEO.imagesWithAlt / compSEO.images) : 0;
    myScore += Math.round(myAltRatio * 25);
    compScore += Math.round(compAltRatio * 25);

    return {
        checks,
        scores: {
            mine: myScore,
            competitor: compScore,
            difference: compScore - myScore,
            winner: compScore > myScore ? 'competitor' : 'mine',
        },
    };
}

// ─── Analyze Why Competitor Ranks ───
function analyzeWhyCompetitorRanks(scores, myPage, competitorPage) {
    const reasons = [];

    // Domain Authority
    if (scores.domainAuthority?.difference > 10) {
        reasons.push({
            factor: 'Domain Authority',
            impact: 'HIGH',
            explanation: `Competitor has DA ${scores.domainAuthority.competitor} vs your DA ${scores.domainAuthority.mine}. Higher DA = more trust from Google.`,
            gap: `+${scores.domainAuthority.difference} DA points`,
        });
    }

    // Content Length
    if (scores.content?.wordCount?.difference > 500) {
        reasons.push({
            factor: 'Content Length',
            impact: 'MEDIUM',
            explanation: `Competitor has ${scores.content.wordCount.competitor} words vs your ${scores.content.wordCount.mine} words. Longer content often ranks better for informational queries.`,
            gap: `+${scores.content.wordCount.difference} words`,
        });
    }

    // Keyword Optimization
    if (scores.content?.keywordDensity?.difference > 0.5) {
        reasons.push({
            factor: 'Keyword Density',
            impact: 'MEDIUM',
            explanation: `Competitor uses the keyword more naturally (${scores.content.keywordDensity.competitor}% vs ${scores.content.keywordDensity.mine}%). Better keyword optimization.`,
            gap: `+${scores.content.keywordDensity.difference}% density`,
        });
    }

    // Exact Keyword Matches
    if (scores.content?.exactMatches?.difference > 2) {
        reasons.push({
            factor: 'Keyword Usage',
            impact: 'MEDIUM',
            explanation: `Competitor mentions the keyword ${scores.content.exactMatches.competitor} times vs your ${scores.content.exactMatches.mine} times.`,
            gap: `+${scores.content.exactMatches.difference} mentions`,
        });
    }

    // SEO Elements
    if (scores.seo?.scores?.difference > 10) {
        reasons.push({
            factor: 'SEO Optimization',
            impact: 'HIGH',
            explanation: `Competitor has better on-page SEO (headings, meta tags, schema markup).`,
            gap: `+${scores.seo.scores.difference} SEO points`,
        });
    }

    // H1 Tag
    if (competitorPage?.seoElements?.hasH1 && !myPage?.seoElements?.hasH1) {
        reasons.push({
            factor: 'H1 Tag Missing',
            impact: 'HIGH',
            explanation: `Your page is missing an H1 tag. Competitor has: "${competitorPage.seoElements.h1Text}"`,
            gap: 'Missing H1',
        });
    }

    // Meta Description
    if (competitorPage?.seoElements?.hasMetaDescription && !myPage?.seoElements?.hasMetaDescription) {
        reasons.push({
            factor: 'Meta Description Missing',
            impact: 'MEDIUM',
            explanation: `Your page is missing a meta description. This affects click-through rate from search results.`,
            gap: 'Missing meta description',
        });
    }

    // Schema Markup
    if (competitorPage?.seoElements?.hasSchema && !myPage?.seoElements?.hasSchema) {
        reasons.push({
            factor: 'Schema Markup',
            impact: 'MEDIUM',
            explanation: `Competitor uses structured data (schema markup) which helps Google understand the content better.`,
            gap: 'No schema markup',
        });
    }

    // Internal Links
    const compLinks = competitorPage?.seoElements?.internalLinks || 0;
    const myLinks = myPage?.seoElements?.internalLinks || 0;
    if (compLinks > myLinks + 5) {
        reasons.push({
            factor: 'Internal Linking',
            impact: 'MEDIUM',
            explanation: `Competitor has ${compLinks} internal links vs your ${myLinks}. Better internal linking helps with page authority distribution.`,
            gap: `+${compLinks - myLinks} internal links`,
        });
    }

    // Sort by impact
    const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    reasons.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

    return reasons;
}

// ─── Generate Improvement Suggestions ───
function generateSuggestions(scores, reasons, myPage, competitorPage) {
    const suggestions = [];

    // Content suggestions
    if (scores.content?.wordCount?.difference > 200) {
        suggestions.push({
            priority: 'HIGH',
            category: 'Content',
            action: `Add ${Math.ceil(scores.content.wordCount.difference / 100) * 100} more words to your content`,
            details: [
                'Add more detailed sections',
                'Include FAQs related to the topic',
                'Add examples and case studies',
                'Include statistics and data',
            ],
            estimatedImpact: 'Could improve ranking by 5-10 positions',
        });
    }

    // Keyword optimization
    if (scores.content?.keywordDensity?.difference > 0.3) {
        suggestions.push({
            priority: 'HIGH',
            category: 'Keywords',
            action: 'Improve keyword optimization',
            details: [
                'Include keyword in H1 tag',
                'Use keyword in first 100 words',
                'Add keyword to meta title and description',
                'Use related keywords naturally',
                'Target density: 1-2%',
            ],
            estimatedImpact: 'Could improve ranking by 3-8 positions',
        });
    }

    // H1 tag
    if (!myPage?.seoElements?.hasH1) {
        suggestions.push({
            priority: 'HIGH',
            category: 'SEO',
            action: 'Add an H1 tag with your target keyword',
            details: [
                'Use only one H1 per page',
                'Include your main keyword',
                'Keep it under 60 characters',
                'Make it compelling for users',
            ],
            estimatedImpact: 'Could improve ranking by 5-15 positions',
        });
    }

    // Meta description
    if (!myPage?.seoElements?.hasMetaDescription) {
        suggestions.push({
            priority: 'MEDIUM',
            category: 'SEO',
            action: 'Add a meta description',
            details: [
                'Keep it between 150-160 characters',
                'Include your target keyword',
                'Add a call-to-action',
                'Make it compelling to click',
            ],
            estimatedImpact: 'Improves click-through rate by 5-10%',
        });
    }

    // Schema markup
    if (!myPage?.seoElements?.hasSchema && competitorPage?.seoElements?.hasSchema) {
        suggestions.push({
            priority: 'MEDIUM',
            category: 'Technical SEO',
            action: 'Add schema markup (structured data)',
            details: [
                'Add LocalBusiness schema if applicable',
                'Add FAQ schema for question-based content',
                'Add Article schema for blog posts',
                'Use Google\'s Structured Data Testing Tool',
            ],
            estimatedImpact: 'Can get rich snippets in search results',
        });
    }

    // Internal linking
    const compLinks = competitorPage?.seoElements?.internalLinks || 0;
    const myLinks = myPage?.seoElements?.internalLinks || 0;
    if (compLinks > myLinks + 3) {
        suggestions.push({
            priority: 'MEDIUM',
            category: 'Link Building',
            action: `Add ${compLinks - myLinks} more internal links`,
            details: [
                'Link from high-authority pages on your site',
                'Use descriptive anchor text',
                'Link to related content',
                'Create a content hub structure',
            ],
            estimatedImpact: 'Improves page authority and crawlability',
        });
    }

    // Domain Authority (long-term)
    if (scores.domainAuthority?.difference > 20) {
        suggestions.push({
            priority: 'LOW',
            category: 'Authority',
            action: 'Build domain authority (long-term strategy)',
            details: [
                'Get backlinks from high-DA sites',
                'Create linkable assets (infographics, tools)',
                'Guest post on relevant sites',
                'Build brand mentions',
            ],
            estimatedImpact: 'Long-term improvement in all rankings',
        });
    }

    // Image optimization
    if (myPage?.seoElements?.images > myPage?.seoElements?.imagesWithAlt) {
        suggestions.push({
            priority: 'LOW',
            category: 'SEO',
            action: 'Add alt text to all images',
            details: [
                `You have ${myPage.seoElements.images} images, ${myPage.seoElements.images - myPage.seoElements.imagesWithAlt} missing alt text`,
                'Use descriptive alt text',
                'Include keywords where relevant',
                'Keep alt text under 125 characters',
            ],
            estimatedImpact: 'Improves image SEO and accessibility',
        });
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
}

// ─── Calculate Overall Score ───
function calculateOverallScore(scores) {
    let total = 50; // Base score

    // DA contribution
    if (scores.domainAuthority) {
        total += (scores.domainAuthority.mine - 50) * 0.5;
    }

    // Content contribution
    if (scores.content) {
        if (scores.content.wordCount?.winner === 'mine') total += 10;
        else total -= 10;
        
        if (scores.content.keywordDensity?.winner === 'mine') total += 10;
        else total -= 10;
    }

    // SEO contribution
    if (scores.seo) {
        total += (scores.seo.scores?.mine - 50) * 0.3;
    }

    return Math.max(0, Math.min(100, Math.round(total)));
}

// ─── Generate Full Report ───
async function generateReport(keyword, myDomain, competitorDomains, serpResults) {
    log.info({ keyword, myDomain, competitorCount: competitorDomains.length }, 'generating full report');

    const report = {
        keyword,
        myDomain,
        timestamp: new Date().toISOString(),
        serpAnalysis: {},
        competitorAnalysis: [],
        myPosition: null,
        suggestions: [],
        summary: {},
    };

    try {
        // Find my position in SERP
        const myResult = serpResults.find(r => r.domain.includes(myDomain));
        report.myPosition = myResult ? myResult.position : null;

        // Analyze top 5 competitors
        const topCompetitors = serpResults.slice(0, 5);
        
        for (const competitor of topCompetitors) {
            if (competitor.domain.includes(myDomain)) continue;

            const pageAnalysis = await keywordService.analyzePageContent(competitor.url, keyword);
            const da = await keywordService.getDomainAuthority(competitor.domain);

            report.competitorAnalysis.push({
                domain: competitor.domain,
                url: competitor.url,
                position: competitor.position,
                title: competitor.title,
                domainAuthority: da,
                content: {
                    wordCount: pageAnalysis.wordCount,
                    keywordDensity: pageAnalysis.keywordAnalysis.density,
                    exactMatches: pageAnalysis.keywordAnalysis.exactMatches,
                },
                seo: pageAnalysis.seoElements,
            });

            // Rate limit
            await new Promise(r => setTimeout(r, 2000));
        }

        // If I'm ranking, analyze my page
        if (myResult) {
            const myPageAnalysis = await keywordService.analyzePageContent(myResult.url, keyword);
            const myDA = await keywordService.getDomainAuthority(myDomain);

            report.myPage = {
                url: myResult.url,
                position: myResult.position,
                domainAuthority: myDA,
                content: {
                    wordCount: myPageAnalysis.wordCount,
                    keywordDensity: myPageAnalysis.keywordAnalysis.density,
                    exactMatches: myPageAnalysis.keywordAnalysis.exactMatches,
                },
                seo: myPageAnalysis.seoElements,
            };

            // Compare with top competitor
            if (report.competitorAnalysis.length > 0) {
                const topCompetitor = report.competitorAnalysis[0];
                report.comparison = await compareDomains(
                    myDomain,
                    topCompetitor.domain,
                    keyword,
                    myPageAnalysis,
                    {
                        wordCount: topCompetitor.content.wordCount,
                        keywordAnalysis: {
                            density: topCompetitor.content.keywordDensity,
                            exactMatches: topCompetitor.content.exactMatches,
                        },
                        seoElements: topCompetitor.seo,
                    }
                );
            }
        }

        // Generate summary
        report.summary = {
            totalCompetitors: report.competitorAnalysis.length,
            averageDA: Math.round(
                report.competitorAnalysis.reduce((sum, c) => sum + c.domainAuthority, 0) / 
                report.competitorAnalysis.length
            ),
            averageWordCount: Math.round(
                report.competitorAnalysis.reduce((sum, c) => sum + c.content.wordCount, 0) / 
                report.competitorAnalysis.length
            ),
            myRanking: report.myPosition ? `#${report.myPosition}` : 'Not ranking',
            topSuggestion: report.comparison?.suggestions?.[0]?.action || 'Analyze your page first',
        };

        return report;
    } catch (err) {
        log.error({ err: err.message }, 'report generation failed');
        return { ...report, error: err.message };
    }
}

module.exports = {
    compareDomains,
    generateReport,
    analyzeWhyCompetitorRanks,
    generateSuggestions,
};
