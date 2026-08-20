# Infinite Track — Web Frontend

**Infinite Track** adalah sistem presensi digital yang dikembangkan untuk mendukung pengelolaan kehadiran pada pola kerja WFO, WFH, dan WFA di Infinite Learning.

Repository ini berisi **Web Frontend Infinite Track** yang digunakan sebagai dashboard monitoring, pengelolaan, dan pelaporan data presensi.

## Repository

| Item               | Value                                   |
| ------------------ | --------------------------------------- |
| Repository         | `Infinite-LearningV1/Infinite_Track_Fe` |
| Integration branch | `develop`                               |
| Production branch  | `master`                                |
| Runtime            | Static multi-page frontend              |
| Node.js            | `20+`                                   |

## Tech Stack

- HTML
- JavaScript
- Alpine.js
- Tailwind CSS
- Webpack 5
- Axios
- Leaflet
- Chart.js / ApexCharts
- jsPDF / XLSX

## Getting Started

```bash
git clone https://github.com/Infinite-LearningV1/Infinite_Track_Fe.git
cd Infinite_Track_Fe
git checkout develop
npm ci
cp .env.example .env
npm run start
```

### Local runtime boundary

Web FE runs directly on Webpack Dev Server at `http://localhost:3000`.
The backend is started independently from the backend repository and must listen on `http://localhost:3005` for the default local integration path.
Webpack proxies browser requests under `/api/*` to that backend target, so local browser code keeps `API_BASE_URL=/api`.

Web FE does not require Nginx, Docker Compose, or a Web FE-owned backend container for canonical local development.

## Environment

| Variable            | Development      | Production                            |
| ------------------- | ---------------- | ------------------------------------- |
| `API_BASE_URL`      | `/api`           | `https://api.infinite-track.tech/api` |
| `API_AUTH_ENDPOINT` | `/auth`          | `/auth`                               |
| `API_VERSION`       | `v1`             | `v1`                                  |
| `APP_NAME`          | `Infinite Track` | `Infinite Track`                      |
| `APP_VERSION`       | `2.0.1`          | `2.0.1`                               |
| `APP_ENVIRONMENT`   | `development`    | `production`                          |
| `SESSION_TIMEOUT`   | `3600000`        | `3600000`                             |
| `REMEMBER_ME_DAYS`  | `7`              | `7`                                   |
| `DEFAULT_LANGUAGE`  | `id`             | `id`                                  |
| `TIMEZONE`          | `Asia/Jakarta`   | `Asia/Jakarta`                        |
| `DEBUG_MODE`        | `true`           | `false`                               |
| `LOG_LEVEL`         | `info`           | `error`                               |

## Commands

| Command         | Purpose                                       |
| --------------- | --------------------------------------------- |
| `npm ci`        | Install dependencies from `package-lock.json` |
| `npm run start` | Start development server                      |
| `npm test`      | Run full regression test suite                |
| `npm run build` | Create production build                       |

## Project Structure

```text
Infinite_Track_Fe/
├── .github/              # GitHub Actions
├── docs/
│   └── adr/              # Architecture Decision Records
├── src/
│   ├── js/
│   │   ├── components/
│   │   ├── config/
│   │   ├── features/
│   │   ├── services/
│   │   ├── stores/
│   │   └── utils/
│   ├── partials/
│   ├── images/
│   └── *.html
├── tests/                # Regression tests by domain
├── .env.example
├── .env.production.example
├── webpack.config.js
└── package.json
```

## Frontend Architecture

```mermaid
flowchart LR
    HTML["HTML Pages<br/>src/*.html + partials"]
    BOOT["index.js<br/>Bootstrap / Composition"]
    ALPINE["Alpine.js Runtime"]
    FEATURE["Features"]
    COMPONENT["Shared Components"]
    STORE["Auth Store"]
    SERVICE["Services"]
    REQUEST["authRequest / Axios"]
    API["Backend API"]

    HTML --> BOOT
    BOOT --> ALPINE
    ALPINE --> FEATURE
    ALPINE --> COMPONENT
    ALPINE <--> STORE
    FEATURE --> SERVICE
    FEATURE --> COMPONENT
    SERVICE --> REQUEST
    REQUEST --> API
```

## Branch Workflow

```text
feature/* ─┐
fix/*     ─┼─> develop ──> master
chore/*   ─┘
```

## CI & Verification

```mermaid
flowchart LR
    A["Pull Request / Push"]
    B["npm ci"]
    C["npm test"]
    D["npm run build"]
    E["Ready for Review"]

    A --> B --> C --> D --> E
```

## Deployment

| Item             | Value                                 |
| ---------------- | ------------------------------------- |
| Release branch   | `master`                              |
| Build command    | `npm ci && npm run build`             |
| Output directory | `build/`                              |
| Frontend         | `https://infinite-track.tech`         |
| API base         | `https://api.infinite-track.tech/api` |
| Hosting model    | DigitalOcean App Platform Static Site |
| Backend ingress  | Backend-owned Nginx at `api.infinite-track.tech` |

```text
develop
   ↓
master
   ↓
production build
   ↓
deploy build/
```

The Web FE production artifact is static `build/` content. The Web FE repository does not own a production Nginx runtime. Browser API traffic goes directly to `https://api.infinite-track.tech/api`; backend ingress/TLS remains a backend responsibility.

## License

Repository menggunakan MIT License. Lihat [`LICENSE`](LICENSE).
