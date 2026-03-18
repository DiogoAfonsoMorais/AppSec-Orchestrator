# 🛡️ AppSec Orchestrator

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-FF4500?style=for-the-badge&logo=redis&logoColor=white)](https://bullmq.io/)

A professional, high-performance security tool orchestrator built with **NestJS**. Designed to manage, automate, and monitor security scans (like Semgrep) across multiple projects in a scalable environment.

---

## 🌟 Key Features

- **Project Management**: Create and organize multiple repositories/projects to be scanned.
- **Scan Orchestration**: Automated security analysis using industry-standard tools.
- **Queue System (BullMQ)**: Intelligent scan job handling to ensure stability and scalability.
- **Real-time Monitoring**: Dashboard views built with EJS for live scan status tracking.
- **Relational Data Storage**: PostgreSQL integration via Prisma for robust data integrity.
- **Flexible Exporters**: Generate reports from scan results effortlessly.

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **NestJS** | Core Framework |
| **Prisma** | Database ORM |
| **PostgreSQL** | Relational Database |
| **Redis** | In-memory message broker for BullMQ |
| **BullMQ** | Distributed Job/Message Queue |
| **EJS** | Server-side rendering for the Dashboard |
| **Docker** | Containerization infrastructure |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose
- [npm](https://www.npmjs.com/)

### 1. Project Setup

```bash
# Clone the repository
$ git clone <your-repo-url>
$ cd orchestrator

# Install dependencies
$ npm install
```

### 2. Infrastructure

Spin up the required services (PostgreSQL & Redis) using Docker:

```bash
$ docker-compose up -d
```

### 3. Environment Configuration

Create a `.env` file in the root (use the existing `.env` as a template):

```env
DATABASE_URL="postgresql://orchestrator:secretpassword@127.0.0.1:5432/appsec?schema=public"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
PORT=3003
```

### 4. Database Migration

Sync your database schema with Prisma:

```bash
$ npx prisma migrate dev
```

---

## 🏃 Running the Project

```bash
# Development (watch mode)
$ npm run start:dev

# Production
$ npm run start:prod
```

The application will be available at `http://localhost:3003`.

---

## 🔌 API & Usage

### Projects

- `POST /projects` - Create a new project.
- `GET /projects` - List all projects.
- `PATCH /projects/:id` - Update project details.
- `DELETE /projects/:id` - Remove a project (cascading removal).

### Scans

- `POST /scans` - Trigger a new security scan.
- `GET /scans/:id/export` - Export scan report.
- `POST /scans/:id/cancel` - Terminate an ongoing scan.

### Dashboard

- Access `http://localhost:3003/dashboard` (or the configured base route) to view real-time scan statuses and historical data.

---

## 📁 Project Structure

```text
src/
├── dashboard/     # EJS Views & Frontend logic
├── orchestrator/  # Core logic for scan job management
├── prisma/        # Database schema & client
├── projects/      # Project management module
├── scans/         # Scan lifecycle & results
├── tools/         # Interface for external security tools (e.g. Semgrep)
└── main.ts        # Application entry point
```

---

## 📜 License

This project is licensed under the **UNLICENSED** (Private) license by default. Customize as needed.

---

<p align="center">
  Developed with ❤️ for <strong>AppSec Orchestration</strong>.
</p>
