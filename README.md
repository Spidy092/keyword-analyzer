# 🔍 Keyword Analyzer

Advanced Keyword Research & Competitor Analysis Tool with Rank Tracking and Alerts.

---

## ✨ Features

### 1. 🔍 Keyword Research
- Enter any keyword (e.g., "web design company in bengaluru")
- **Location-based search** (optional) - India, US, UK, cities
- **Search volume estimation**
- **Competition level** (low/medium/high)
- **CPC (Cost Per Click)**
- **Keyword difficulty score**
- **Related searches** suggestions
- **Top 20 ranking pages** with details

### 2. 🏆 Competitor Analysis
- **Automatic competitor discovery** from SERP
- **Domain Authority** estimation
- **Keyword count** per competitor
- **Average position** tracking
- **Best position** achieved
- Click competitor → See all their ranking keywords

### 3. 📊 Page Analysis (Click Competitor)
When you click on a competitor, you get:
- **Word count** of their page
- **Keyword density** percentage
- **Keyword count** (how many times keyword appears)
- **SEO elements check**:
  - H1 tag present?
  - Meta description?
  - Schema markup?
- **Internal/External links** count
- **Domain Authority** score

### 4. ⚖️ Compare & Analyze
Enter your domain + competitor domain + keyword:
- **Side-by-side comparison**
- **Why competitor ranks higher** (detailed reasons)
- **Gap analysis** (what they have that you don't)
- **Improvement suggestions** (prioritized)
- **Estimated impact** of each suggestion

### 5. 📈 Rank Tracking
- **Add your domain** to track
- **Automatic daily checks**
- **Rank history** for all keywords
- **Position changes** tracking
- **Manual check** option

### 6. 🚨 Alerts System
- **Rank drop alerts** (when you drop 5+ positions)
- **Rank improvement alerts** (when you gain 10+ positions)
- **New ranking alerts** (when you start ranking)
- **Lost ranking alerts** (when you lose ranking)
- **Filter by type**
- **Mark as read**
- **Webhook notifications** (Telegram/Discord)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   KEYWORD ANALYZER                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📡 FRONTEND (EJS + CSS + JS)                           │
│  ├── Dashboard                                          │
│  ├── Keyword Research                                   │
│  ├── Competitors                                        │
│  ├── Compare & Analyze                                  │
│  ├── Rank Tracking                                      │
│  └── Alerts                                             │
│                                                         │
│  🖥️ BACKEND (Fastify + Node.js)                         │
│  ├── /api/keywords/*                                    │
│  ├── /api/competitors/*                                 │
│  ├── /api/analysis/*                                    │
│  └── /api/alerts/*                                      │
│                                                         │
│  🔧 SERVICES                                            │
│  ├── keywordService.js (SERP, volume, analysis)         │
│  ├── analysisService.js (comparison, suggestions)       │
│  └── rankTracker.js (periodic checks, alerts)           │
│                                                         │
│  🗄️ DATABASE (PostgreSQL)                               │
│  ├── keywords                                           │
│  ├── competitors                                        │
│  ├── ranking_pages                                      │
│  ├── my_domains                                         │
│  ├── domain_rankings                                    │
│  ├── rank_history                                       │
│  ├── alerts                                             │
│  └── analysis_reports                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create database
createdb keyword_analyzer

# Tables are auto-created on first run
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Start Server
```bash
npm start
# or for development
npm run dev
```

### 5. Open Dashboard
```
http://localhost:3000
```

---

## 📡 API Endpoints

### Keywords
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/keywords/research` | Research a keyword |
| GET | `/api/keywords` | List all keywords |
| GET | `/api/keywords/:id` | Get keyword details |
| POST | `/api/keywords/suggestions` | Get suggestions |
| DELETE | `/api/keywords/:id` | Delete keyword |

### Competitors
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/competitors/analyze` | Analyze competitor page |
| GET | `/api/competitors/keyword/:id` | Get competitors for keyword |
| GET | `/api/competitors/:domain` | Get competitor details |
| POST | `/api/competitors/compare` | Compare competitors |
| GET | `/api/competitors/top` | Get top competitors |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/compare` | Compare domains |
| POST | `/api/analysis/report` | Generate full report |
| POST | `/api/analysis/page` | Analyze single page |
| POST | `/api/analysis/suggestions` | Get suggestions |
| GET | `/api/analysis/history` | Get analysis history |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/alerts/track` | Add domain to track |
| GET | `/api/alerts/domains` | Get tracked domains |
| GET | `/api/alerts` | Get all alerts |
| PUT | `/api/alerts/:id/read` | Mark alert as read |
| PUT | `/api/alerts/read-all` | Mark all as read |
| GET | `/api/alerts/rank-history` | Get rank history |
| GET | `/api/alerts/summary` | Get summary |

---

## 🔑 API Keys (All Free)

| Service | Purpose | Free Limit | Required |
|---------|---------|------------|----------|
| Serper.dev | SERP Search | 2,500/day | ✅ Yes |
| OpenPageRank | Domain Authority | 33,000/day | ✅ Yes |
| Google CSE | Backup Search | 100/day | Optional |

---

## 📊 Usage Examples

### Research a Keyword
```bash
curl -X POST http://localhost:3000/api/keywords/research \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "web design company in bengaluru",
    "location": "Bengaluru"
  }'
```

### Compare Domains
```bash
curl -X POST http://localhost:3000/api/analysis/compare \
  -H "Content-Type: application/json" \
  -d '{
    "myDomain": "mywebsite.com",
    "competitorDomain": "competitor.com",
    "keyword": "web design company",
    "myUrl": "https://mywebsite.com/web-design",
    "competitorUrl": "https://competitor.com/web-design"
  }'
```

### Track Your Domain
```bash
curl -X POST http://localhost:3000/api/alerts/track \
  -H "Content-Type: application/json" \
  -d '{"domain": "mywebsite.com"}'
```

---

## 🎯 Workflow Example

1. **Research** → Enter "web design company in bengaluru"
2. **See Results** → Search volume, competition, top 20 ranking pages
3. **Click Competitor** → See their keyword density, word count, SEO
4. **Compare** → Enter your domain vs competitor domain
5. **Get Suggestions** → What to improve to rank higher
6. **Track** → Add your domain to monitor rankings
7. **Get Alerts** → When your rank drops or improves

---

## 🛡️ Anti-Detection

- Random User-Agent rotation
- Adaptive rate limiting
- Exponential backoff
- Request delays between searches

---

## 📈 Metrics Tracked

- Keywords researched
- Competitors discovered
- Pages analyzed
- Rank changes
- Alerts generated

---

## 🔄 Rank Tracking Schedule

- **Automatic**: Daily at 3 AM
- **Manual**: Click "Check" button
- **Alerts**: Generated automatically on changes

---

## 📱 Dashboard Features

- **Responsive design** (works on mobile)
- **Real-time updates**
- **Filter alerts** by type
- **Search keywords**
- **Export data** (coming soon)

---

## 🚀 Deployment

### Docker
```bash
docker-compose up -d
```

### Manual
```bash
# Install PostgreSQL and Redis
# Configure .env
npm start
```

---

## 📄 License

ISC

---

**Built with ❤️ by Spidy092**
