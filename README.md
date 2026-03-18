# 🛡️ AppSec Orchestrator

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-FF4500?style=for-the-badge&logo=redis&logoColor=white)](https://bullmq.io/)

Um orquestrador de ferramentas de segurança de alto desempenho, construído com **NestJS**. Desenhado para gerir, automatizar e monitorizar análises de segurança (como o Semgrep) em múltiplos projetos, num ambiente escalável.

---

## 🌟 Funcionalidades

- **Gestão de Projetos** — Cria e organiza múltiplos repositórios/projetos a analisar.
- **Orquestração de Scans** — Análise de segurança automatizada com ferramentas industry-standard.
- **Sistema de Filas (BullMQ)** — Gestão inteligente de jobs de scan para garantir estabilidade e escalabilidade.
- **Monitorização em Tempo Real** — Dashboard em EJS para acompanhamento do estado dos scans ao vivo.
- **Armazenamento Relacional** — Integração com PostgreSQL via Prisma para integridade robusta dos dados.
- **Exportação de Relatórios** — Geração de relatórios a partir dos resultados dos scans.

---

## 🛠️ Stack Tecnológico

| Tecnologia | Função |
| :--- | :--- |
| **NestJS** | Framework principal |
| **Prisma** | ORM da base de dados |
| **PostgreSQL** | Base de dados relacional |
| **Redis** | Message broker em memória para o BullMQ |
| **BullMQ** | Fila de jobs distribuída |
| **EJS** | Renderização server-side do Dashboard |
| **Docker** | Infraestrutura de containerização |

---

## 🚀 Como Começar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) e Docker Compose
- [npm](https://www.npmjs.com/)

### 1. Configuração do Projeto

```bash
# Clonar o repositório
git clone https://github.com/DiogoAfonsoMorais/AppSec.git
cd AppSec/orchestrator

# Instalar dependências
npm install
```

### 2. Infraestrutura

Inicia os serviços necessários (PostgreSQL e Redis) via Docker:

```bash
docker-compose up -d
```

### 3. Variáveis de Ambiente

Cria um ficheiro `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://orchestrator:secretpassword@127.0.0.1:5432/appsec?schema=public"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
PORT=3003
```

### 4. Migração da Base de Dados

Sincroniza o schema da base de dados com o Prisma:

```bash
npx prisma migrate dev
```

---

## 🏃 Executar o Projeto

```bash
# Modo desenvolvimento (watch mode)
npm run start:dev

# Produção
npm run start:prod
```

A aplicação fica disponível em `http://localhost:3003`.

---

## 🔌 API

### Projetos

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/projects` | Criar um novo projeto |
| `GET` | `/projects` | Listar todos os projetos |
| `PATCH` | `/projects/:id` | Atualizar um projeto |
| `DELETE` | `/projects/:id` | Remover um projeto (cascading) |

### Scans

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/scans` | Iniciar um novo scan de segurança |
| `GET` | `/scans/:id/export` | Exportar relatório de um scan |
| `POST` | `/scans/:id/cancel` | Cancelar um scan em curso |

### Dashboard

Acede a `http://localhost:3003/dashboard` para visualizar o estado dos scans em tempo real e o histórico de análises.

---

## 📁 Estrutura do Projeto

```text
orchestrator/
└── src/
    ├── dashboard/     # Views EJS e lógica de frontend
    ├── orchestrator/  # Lógica central de gestão de jobs
    ├── prisma/        # Schema e cliente da base de dados
    ├── projects/      # Módulo de gestão de projetos
    ├── scans/         # Ciclo de vida e resultados dos scans
    ├── tools/         # Interface com ferramentas externas (ex: Semgrep)
    └── main.ts        # Entry point da aplicação
```

---

## 📜 Licença

Este projeto está licenciado como **UNLICENSED** (Privado) por omissão.

---

<p align="center">
  Desenvolvido por <a href="https://github.com/DiogoAfonsoMorais">Diogo Afonso Morais</a>
</p>
