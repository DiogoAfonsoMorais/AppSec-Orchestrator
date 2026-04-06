# 🛡️ AppSec Orchestrator

![NestJS](https://img.shields.io/badge/NestJS-E0234C?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-871C10?style=for-the-badge&logo=bull&logoColor=white)

A high-performance security orchestration platform built with NestJS. Manages, automates, and monitors security scans across repositories, containers, and web applications using industry-standard security tools.

---

## 🌟 Features

- **Multi-Target Scanning** — Scan repositories (git), Docker containers, and web applications
- **8 Security Tools Integrated** — Semgrep, Gitleaks, Nmap, Nuclei, Trivy, OWASP ZAP, Nikto, EyeWitness
- **Scan Profiles** — Choose between QUICK, FULL, or CUSTOM scans per target type
- **Risk Scoring** — Weighted scoring system (CRITICAL=10, HIGH=7, MEDIUM=4, LOW=1)
- **OWASP Mapping** — Findings automatically categorized by OWASP Top 10
- **Live Logs** — Real-time streaming of scan progress and output
- **Jira Integration** — Export findings directly to Jira issues
- **Discord/Slack Notifications** — Webhook alerts on scan completion
- **Report Exporting** — Generate structured JSON reports
- **Dashboard** — EJS-powered web UI for monitoring scans

---

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| NestJS | Core framework |
| Prisma | Database ORM |
| PostgreSQL | Relational database |
| Redis | Message broker for BullMQ |
| BullMQ | Distributed job queue |
| Docker | Container execution for tools |
| EJS | Server-side dashboard rendering |

---

## 🔧 Security Tools Integrated

| Tool | Purpose | Target Type |
|------|---------|-------------|
| **Semgrep** | Static code analysis (SAST) | REPO |
| **Gitleaks** | Secret detection in code | REPO |
| **Trivy** | Container vulnerability scanning | REPO, CONTAINER |
| **Nmap** | Network discovery and port scanning | WEB, CONTAINER |
| **Nuclei** | Vulnerability scanning with templates | WEB |
| **OWASP ZAP** | Web application security testing | WEB |
| **Nikto** | Web server scanner | WEB |
| **EyeWitness** | Website screenshot capture | WEB |

### Scan Profile Matrix

| Profile | REPO | WEB | CONTAINER |
|---------|------|-----|-----------|
| **QUICK** | Semgrep, Gitleaks | Nmap, Nuclei | Trivy |
| **FULL** | Semgrep, Gitleaks, Trivy | Nmap, Nuclei, ZAP, Nikto, Gitleaks, Trivy, EyeWitness | Trivy, Nmap |

---

## 📋 Prerequisites

- **Node.js** (v18+)
- **Docker** & **Docker Compose**
- **npm** or **pnpm**

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/DiogoAfonsoMorais/AppSec.git
cd AppSec/orchestrator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port **5439** (internal: 5432)
- Redis on port **6380** (internal: 6379)

### 4. Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://orchestrator:secretpassword@127.0.0.1:5439/appsec?schema=public"

# Redis
REDIS_HOST="127.0.0.1"
REDIS_PORT=6380

# Application
PORT=3003

# Notifications (Optional)
NOTIFICATIONS_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Jira Integration (Optional)
JIRA_URL="https://your-domain.atlassian.net"
JIRA_USER_EMAIL="your-email@example.com"
JIRA_API_TOKEN="your-api-token"
JIRA_PROJECT_KEY="SEC"
```

### 5. Database Migration

```bash
npx prisma migrate dev
```

### 6. Generate Prisma Client

```bash
npx prisma generate
```

---

## 🏃 Running the Project

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run start:prod
```

The application will be available at **http://localhost:3003**.

---

## 🔌 API Reference

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/projects` | Create a new project |
| `GET` | `/projects` | List all projects (with scan count) |
| `PATCH` | `/projects/:id` | Update project name/description |
| `DELETE` | `/projects/:id` | Delete project (cascades to scans) |

**Create Project:**
```json
POST /projects
{
  "name": "My Web App",
  "description": "Main production application"
}
```

### Scans

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/scans` | Trigger a new security scan |
| `GET` | `/scans/:id/export` | Export scan report as JSON |
| `POST` | `/scans/:id/cancel` | Cancel an ongoing scan |

**Create Scan:**
```json
POST /scans
{
  "target": "https://example.com",
  "targetType": "WEB",
  "profile": "FULL",
  "projectId": "uuid-of-project"
}
```

**Target Types:** `REPO`, `CONTAINER`, `WEB`
**Profiles:** `QUICK`, `FULL`, `CUSTOM`

**With Authentication:**
```json
POST /scans
{
  "target": "https://example.com",
  "targetType": "WEB",
  "profile": "FULL",
  "headers": { "X-Custom-Header": "value" },
  "authConfig": { "type": "BEARER", "value": "your-token" }
}
```

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/integrations/jira/finding/:id` | Export finding to Jira |

---

## 📊 Dashboard

Access the web dashboard at **http://localhost:3003/dashboard** for:

- Real-time scan status tracking
- Live logs streaming
- Scan history and statistics
- Risk score visualization
- Finding details and severity breakdown

---

## 📁 Project Structure

```
orchestrator/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── ...
├── src/
│   ├── dashboard/             # EJS dashboard views & controller
│   ├── integrations/          # Jira integration
│   ├── notifications/         # Discord/Slack webhooks
│   ├── orchestrator/          # BullMQ scan consumer/processor
│   ├── prisma/                # Prisma service
│   ├── projects/             # Project CRUD module
│   ├── scans/                 # Scan lifecycle, DTOs, controllers
│   ├── tools/                 # Security tool runners
│   │   ├── interfaces/       # Tool runner interface
│   │   └── runners/          # Individual tool implementations
│   │       ├── semgrep.runner.ts
│   │       ├── gitleaks.runner.ts
│   │       ├── nmap.runner.ts
│   │       ├── nuclei.runner.ts
│   │       ├── trivy.runner.ts
│   │       ├── zap.runner.ts
│   │       ├── nikto.runner.ts
│   │       └── eyewitness.runner.ts
│   ├── app.module.ts
│   └── main.ts               # Application entry point
├── docker-compose.yml         # PostgreSQL + Redis
├── prisma.config.ts
└── package.json
```

---

## 🗄️ Database Schema

### Models

- **Project** — Groups related scans
- **User** — Authentication (email, passwordHash, role)
- **Scan** — Single scan execution (target, status, progress, riskScore, liveLogs)
- **ToolRun** — Individual tool execution within a scan
- **Finding** — Security vulnerability discovered during scan

### Scan Statuses

`PENDING` → `IN_PROGRESS` → `COMPLETED` | `FAILED` | `CANCELLED`

### Finding Severity

`INFO` | `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

---

## 📜 License

This project is **LICENSED** (MIT).

---

## 👤 Author

Developed by **Diogo Afonso Morais**
