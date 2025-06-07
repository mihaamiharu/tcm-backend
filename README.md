
# Test Case Management (TCM) System

A robust, full-featured Test Case Management (TCM) system designed to streamline QA workflows. Built with a modern backend stack using NestJS and PostgreSQL, this application provides a powerful platform for designing, managing, and executing test scenarios.

## ✨ Key Features (Phase 1)

-   **Role-Based Access Control (RBAC):**
    -   **Admin:** Manages users and all projects.
    -   **Tester:** Manages test artifacts within assigned projects.
    -   **Viewer:** Read-only access for stakeholders like PMs or developers.
-   **Comprehensive Test Design:**
    -   **Dual-Format Test Cases:** Create both `Standard` (checklist-style) and `Gherkin` (BDD-style) test cases.
    -   **Reusable Step Library:** A central, project-specific library for Gherkin steps (`Given`, `When`, `Then`) to promote consistency and reduce duplication.
    -   **Tagging System:** Organize and filter test cases with custom, project-specific tags.
-   **Structured Test Execution:**
    -   **Test Runs:** Group test cases into execution cycles.
    -   **Test Case Snapshots:** Test runs use snapshots of test cases, ensuring that in-progress runs are not affected by later edits to the original tests.
    -   **Sync Functionality:** Manually update a test case within a run to its latest version with a "Sync" button.
-   **Modern Rich Text Editing:** A clean, intuitive rich text editor for detailed descriptions, steps, and results, allowing for better formatting, inline code, and lists.

## 🛠️ Technology Stack

-   **Backend:** [NestJS](https://nestjs.com/) (TypeScript)
-   **Database:** [PostgreSQL](https://www.postgresql.org/)
-   **ORM:** [TypeORM](https://typeorm.io/)
-   **Containerization:** [Podman](https://podman.io/) / [Docker Compose](https://docs.docker.com/compose/)
-   **Authentication:** JWT (JSON Web Tokens), `bcrypt` for password hashing
-   **API Validation:** `class-validator` and `class-transformer`
-   **(Planned) Frontend:** Svelte with TypeScript

## 🚀 Getting Started

Follow these instructions to get the backend server up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18.x or newer recommended)
-   [Podman](https://podman.io/) and `podman-compose` (or [Docker Desktop](https://www.docker.com/products/docker-desktop/))
-   `npm` (included with Node.js)
-   A Git client

### 1. Clone the Repository

Bash

```
git clone <your-repository-url>
cd tcm-backend

```

### 2. Install Dependencies

Install all the required npm packages.

Bash

```
npm install

```

### 3. Configure Environment Variables

Create a local environment file by copying the example template.

Bash

```
cp .env.example .env.local

```

Now, open `.env.local` and make sure the variables match the credentials you want to use for your local database. The default values are already configured to work with the provided `docker-compose.yml` file.

### 4. Start the Database

This project uses Podman/Docker Compose to run a PostgreSQL database in a container, ensuring a clean and consistent development environment.

Bash

```
# Ensure Podman machine is running (for Mac/Windows users)
podman machine start

# Start the database container in the background
podman-compose up -d

```

### 5. Run the Application

Once the database is running, you can start the NestJS development server.

Bash

```
npm run start:dev

```

The server will start on the port specified in your `.env.local` file (default is `3000`). You should see a "Nest application successfully started" message in your console.

## 📖 API Documentation

The application exposes a RESTful API for managing all resources. The main modules are:

-   **Auth:** `/auth` (User registration, login)
-   **Users:** `/users` (Admin-only user management)
-   **Projects:** `/projects` (Project and membership management)
-   **Test Suites:** `/projects/{projectId}/suites`
-   **Tags:** `/projects/{projectId}/tags`
-   **Step Library:** `/projects/{projectId}/steps`
-   **Test Cases:** `/suites/{suiteId}/cases` and `/cases/{caseId}`
-   **Test Runs & Executions:** `/projects/{projectId}/runs` and `/executions/{executionId}`

For detailed endpoint specifications, please refer to the controller files within the `src` directory.

## 🧪 Running Tests (Placeholder)

-   **Unit Tests:** `npm run test`
-   **E2E Tests:** `npm run test:e2e`
-   **Test Coverage:** `npm run test:cov`

_(This section can be updated once test suites are implemented.)_

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.