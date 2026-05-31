# Docker Compose NGINX Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dual-mode Docker Compose workflow where NGINX is the single gateway, dev uses `webpack-dev-server` with hot reload behind NGINX, and staging-like mode serves built static assets through NGINX while still proxying `/api` to the backend.

**Architecture:** Keep the browser-facing API boundary as `/api` in both modes and move runtime routing responsibility to NGINX. Use one Compose file with `dev` and `staging` profiles, a Node-based frontend dev container, an artifact-export container for staging-like assets, and one NGINX gateway that switches config using `NGINX_MODE`.

**Tech Stack:** Docker Compose, NGINX Alpine, Node 20 Alpine, Webpack dev server, existing Web FE multi-page HTML/Alpine/Tailwind app.

---

## File structure

### New files
- `.dockerignore` — trims Docker build context for both frontend images.
- `Dockerfile.dev` — frontend dev image with Node 20 and dependencies installed.
- `Dockerfile` — multi-stage build that exports compiled frontend assets for staging-like mode.
- `compose.yaml` — shared Compose definition with `dev` and `staging` profiles.
- `docker/nginx/dev.conf` — NGINX reverse proxy config for dev mode.
- `docker/nginx/staging.conf` — NGINX config for static frontend + `/api` proxy in staging-like mode.
- `docker/nginx/select-config.sh` — startup script that selects NGINX config based on `NGINX_MODE`.

### Modified files
- `webpack.config.js` — consolidate duplicated `devServer` config and make host/open/proxy target environment-driven for Docker-based dev.
- `DEPLOYMENT.md` — document Docker Compose dev and staging-like workflows.
- `DEPLOYMENT-CHECKLIST.md` — add Docker-specific verification steps.

### High-risk files
- `webpack.config.js`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`

---

### Task 1: Add frontend container build files

**Files:**
- Create: `.dockerignore`
- Create: `Dockerfile.dev`
- Create: `Dockerfile`

- [ ] **Step 1: Run a failing Docker build to confirm the frontend dev image does not exist yet**

Run:
```bash
docker build -f Dockerfile.dev .
```
Expected: FAIL with `failed to read dockerfile` because `Dockerfile.dev` does not exist yet.

- [ ] **Step 2: Create `.dockerignore` to keep the build context small and deterministic**

```gitignore
node_modules
build
.git
.github
.claude
.vscode
.env
.env.*
npm-debug.log*
coverage
```

- [ ] **Step 3: Create `Dockerfile.dev` for the frontend development container**

```Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

CMD ["npm", "run", "start"]
```

- [ ] **Step 4: Verify the dev image builds successfully**

Run:
```bash
docker build -f Dockerfile.dev -t infinite-track-fe-dev .
```
Expected: PASS with a final line similar to `naming to docker.io/library/infinite-track-fe-dev`.

- [ ] **Step 5: Create `Dockerfile` for the staging-like artifact export flow**

```Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM alpine:3.20 AS artifacts

WORKDIR /artifacts

COPY --from=build /app/build ./build

CMD ["sh", "-lc", "rm -rf /shared/* && cp -r /artifacts/build/. /shared && tail -f /dev/null"]
```

- [ ] **Step 6: Verify the staging artifact image builds successfully**

Run:
```bash
docker build -f Dockerfile --target artifacts -t infinite-track-fe-artifacts .
```
Expected: PASS with a final line similar to `naming to docker.io/library/infinite-track-fe-artifacts`.

- [ ] **Step 7: Commit the container build scaffolding**

```bash
git add .dockerignore Dockerfile.dev Dockerfile
git commit -m "chore: add frontend docker build scaffolding"
```

---

### Task 2: Add NGINX gateway configs for dev and staging-like modes

**Files:**
- Create: `docker/nginx/dev.conf`
- Create: `docker/nginx/staging.conf`
- Create: `docker/nginx/select-config.sh`

- [ ] **Step 1: Confirm the NGINX config directory does not exist yet**

Run:
```bash
ls docker/nginx
```
Expected: FAIL with `No such file or directory`.

- [ ] **Step 2: Create `docker/nginx/dev.conf` for reverse proxy + HMR support**

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 80;
  server_name _;

  location /api/ {
    proxy_pass http://backend:3005;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://frontend-dev:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_cache_bypass $http_upgrade;
  }
}
```

- [ ] **Step 3: Create `docker/nginx/staging.conf` for static files + backend proxy**

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://backend:3005;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = / {
    try_files /index.html =404;
  }

  location / {
    try_files $uri $uri/ =404;
  }
}
```

- [ ] **Step 4: Create `docker/nginx/select-config.sh` to switch gateway mode without duplicating the NGINX service**

```sh
#!/bin/sh
set -eu

case "${NGINX_MODE:-dev}" in
  dev)
    cp /opt/nginx/dev.conf /etc/nginx/conf.d/default.conf
    ;;
  staging)
    cp /opt/nginx/staging.conf /etc/nginx/conf.d/default.conf
    ;;
  *)
    echo "Unsupported NGINX_MODE: ${NGINX_MODE:-}" >&2
    exit 1
    ;;
esac
```

- [ ] **Step 5: Verify the files are present and readable inside an NGINX container**

Run:
```bash
docker run --rm \
  -v "$PWD/docker/nginx:/opt/nginx:ro" \
  nginx:1.27-alpine \
  sh -lc 'test -f /opt/nginx/dev.conf && test -f /opt/nginx/staging.conf && test -f /opt/nginx/select-config.sh'
```
Expected: PASS with no output and exit code `0`.

- [ ] **Step 6: Commit the NGINX gateway configs**

```bash
git add docker/nginx/dev.conf docker/nginx/staging.conf docker/nginx/select-config.sh
git commit -m "feat: add nginx gateway configs for docker workflows"
```

---

### Task 3: Wire Compose profiles and shared runtime volumes

**Files:**
- Create: `compose.yaml`

- [ ] **Step 1: Run a failing Compose config command to confirm no Compose file exists yet**

Run:
```bash
docker compose --profile dev config
```
Expected: FAIL with a message similar to `no configuration file provided`.

- [ ] **Step 2: Create `compose.yaml` with `dev` and `staging` profiles**

```yaml
services:
  backend:
    image: ${BACKEND_IMAGE:-infinite-track-backend:latest}
    profiles: ["dev", "staging"]
    expose:
      - "${BACKEND_PORT:-3005}"
    networks:
      - app

  frontend-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    profiles: ["dev"]
    working_dir: /app
    command: npm run start
    environment:
      NODE_ENV: development
      APP_ENVIRONMENT: development
      WEBPACK_DEV_HOST: 0.0.0.0
      WEBPACK_OPEN: "false"
      WEBPACK_API_PROXY_TARGET: http://backend:${BACKEND_PORT:-3005}
      WATCHPACK_POLLING: "true"
    volumes:
      - .:/app
      - frontend_node_modules:/app/node_modules
    depends_on:
      - backend
    networks:
      - app

  frontend-build:
    build:
      context: .
      dockerfile: Dockerfile
      target: artifacts
    profiles: ["staging"]
    working_dir: /artifacts
    volumes:
      - frontend_dist:/shared
    networks:
      - app

  nginx:
    image: nginx:1.27-alpine
    profiles: ["dev", "staging"]
    environment:
      NGINX_MODE: ${NGINX_MODE:-dev}
    ports:
      - "${GATEWAY_PORT:-8080}:80"
    volumes:
      - ./docker/nginx/dev.conf:/opt/nginx/dev.conf:ro
      - ./docker/nginx/staging.conf:/opt/nginx/staging.conf:ro
      - ./docker/nginx/select-config.sh:/docker-entrypoint.d/99-select-config.sh:ro
      - frontend_dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - app

volumes:
  frontend_node_modules:
  frontend_dist:

networks:
  app:
    driver: bridge
```

- [ ] **Step 3: Verify the dev profile resolves correctly**

Run:
```bash
NGINX_MODE=dev docker compose --profile dev config
```
Expected: PASS with rendered services for `backend`, `frontend-dev`, and `nginx`.

- [ ] **Step 4: Verify the staging profile resolves correctly**

Run:
```bash
NGINX_MODE=staging docker compose --profile staging config
```
Expected: PASS with rendered services for `backend`, `frontend-build`, and `nginx`.

- [ ] **Step 5: Smoke test the dev stack startup**

Run:
```bash
NGINX_MODE=dev docker compose --profile dev up --build -d
```
Expected: PASS with running containers for `backend`, `frontend-dev`, and `nginx`.

- [ ] **Step 6: Confirm the frontend gateway answers through NGINX**

Run:
```bash
curl -I http://localhost:${GATEWAY_PORT:-8080}
```
Expected: PASS with an HTTP status line such as `HTTP/1.1 200 OK` or another successful page status returned by NGINX.

- [ ] **Step 7: Stop the dev stack after the smoke test**

Run:
```bash
docker compose --profile dev down
```
Expected: PASS with container/network cleanup output.

- [ ] **Step 8: Commit the Compose wiring**

```bash
git add compose.yaml
git commit -m "feat: add docker compose profiles for nginx gateway"
```

---

### Task 4: Make the Webpack dev server Docker-aware with minimal risk

**Files:**
- Modify: `webpack.config.js`

- [ ] **Step 1: Record the current duplicate `devServer` definition before editing the high-risk file**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('webpack.config.js','utf8');console.log((s.match(/devServer:/g)||[]).length)"
```
Expected: `2`

- [ ] **Step 2: Replace the duplicated dev server setup with one environment-driven `devServer` object**

Add these constants near the top of the file after `require("dotenv").config();`:

```js
const devServer = {
  static: {
    directory: path.join(__dirname, "build"),
  },
  host: process.env.WEBPACK_DEV_HOST || "127.0.0.1",
  allowedHosts: "all",
  compress: true,
  port: 3000,
  hot: true,
  open: process.env.WEBPACK_OPEN === "true",
  historyApiFallback: true,
  proxy: [
    {
      context: ["/api"],
      target: process.env.WEBPACK_API_PROXY_TARGET || "http://localhost:3005",
      changeOrigin: true,
      secure: false,
      logLevel: "debug",
      onError: (err) => {
        console.log("Proxy Error:", err);
      },
      onProxyReq: (proxyReq) => {
        console.log("Proxying request to:", proxyReq.path);
      },
    },
  ],
};
```

Then update the exported config so it uses the single shared object:

```js
module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: "./src/js/index.js",
  module: {
    rules: [
      // existing rules unchanged
    ],
  },
  plugins: [
    // existing plugins unchanged
  ],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
    assetModuleFilename: "[path][name][ext]",
  },
  devServer,
  target: "web",
  stats: "errors-only",
};
```

Delete both old inline `devServer` blocks so the file contains exactly one `devServer:` reference.

- [ ] **Step 3: Verify only one `devServer` definition remains**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('webpack.config.js','utf8');console.log((s.match(/devServer:/g)||[]).length)"
```
Expected: `1`

- [ ] **Step 4: Verify the frontend production build still works after the Webpack refactor**

Run:
```bash
npm run build
```
Expected: PASS with Webpack build completion and no config syntax errors.

- [ ] **Step 5: Verify the dev profile still boots with Docker-aware host settings**

Run:
```bash
NGINX_MODE=dev docker compose --profile dev up --build -d
```
Expected: PASS with `frontend-dev` healthy enough to serve requests through the gateway.

- [ ] **Step 6: Confirm the gateway still serves the frontend after the Webpack change**

Run:
```bash
curl -I http://localhost:${GATEWAY_PORT:-8080}
```
Expected: PASS with an HTTP success status from the NGINX gateway.

- [ ] **Step 7: Stop the dev stack after verification**

Run:
```bash
docker compose --profile dev down
```
Expected: PASS with stack cleanup output.

- [ ] **Step 8: Commit the Webpack adjustment**

```bash
git add webpack.config.js
git commit -m "fix: make webpack dev server docker-aware"
```

---

### Task 5: Document Docker workflows and verification steps

**Files:**
- Modify: `DEPLOYMENT.md`
- Modify: `DEPLOYMENT-CHECKLIST.md`

- [ ] **Step 1: Add Docker Compose usage to `DEPLOYMENT.md`**

Append a new section like this:

```md
## Docker Compose Workflows

### Development mode

Use NGINX as the single browser entrypoint while keeping Webpack hot reload behind the gateway.

```bash
NGINX_MODE=dev BACKEND_IMAGE=infinite-track-backend:latest docker compose --profile dev up --build
```

Open:

```text
http://localhost:8080
```

### Staging-like mode

Build frontend assets and let NGINX serve them directly while still proxying `/api` to the backend.

```bash
NGINX_MODE=staging BACKEND_IMAGE=infinite-track-backend:latest docker compose --profile staging up --build
```

Open:

```text
http://localhost:8080
```

### Stop the stack

```bash
docker compose --profile dev down
docker compose --profile staging down
```
```

- [ ] **Step 2: Add Docker-specific checks to `DEPLOYMENT-CHECKLIST.md`**

Append checklist items like this:

```md
## Docker Gateway Verification

- [ ] `NGINX_MODE=dev docker compose --profile dev up --build` starts `backend`, `frontend-dev`, and `nginx`
- [ ] `http://localhost:8080` loads the frontend through NGINX
- [ ] Editing a frontend file triggers hot reload in dev mode
- [ ] API requests from the browser still use `/api` and reach the backend successfully
- [ ] `NGINX_MODE=staging docker compose --profile staging up --build` serves built static assets through NGINX
- [ ] Staging-like mode no longer depends on `webpack-dev-server`
```

- [ ] **Step 3: Verify the docs mention both gateway modes and concrete commands**

Run:
```bash
node -e "const fs=require('fs');const a=fs.readFileSync('DEPLOYMENT.md','utf8');const b=fs.readFileSync('DEPLOYMENT-CHECKLIST.md','utf8');console.log(a.includes('Docker Compose Workflows'), a.includes('NGINX_MODE=dev'), a.includes('NGINX_MODE=staging'), b.includes('Docker Gateway Verification'))"
```
Expected: `true true true true`

- [ ] **Step 4: Run one final staging-like smoke check before closing the docs task**

Run:
```bash
NGINX_MODE=staging docker compose --profile staging up --build -d
```
Expected: PASS with `backend`, `frontend-build`, and `nginx` containers running.

- [ ] **Step 5: Confirm the staging-like gateway responds through NGINX**

Run:
```bash
curl -I http://localhost:${GATEWAY_PORT:-8080}
```
Expected: PASS with an HTTP success status for the built frontend entrypoint.

- [ ] **Step 6: Stop the staging-like stack after verification**

Run:
```bash
docker compose --profile staging down
```
Expected: PASS with stack cleanup output.

- [ ] **Step 7: Commit the documentation updates**

```bash
git add DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md
git commit -m "docs: add docker compose gateway workflow"
```

---

## Spec coverage check

- Dual-mode Compose with `dev` and `staging` profiles — covered in Task 3.
- Single NGINX gateway with mode-based config selection — covered in Task 2 and Task 3.
- Dev mode uses `webpack-dev-server` with hot reload behind NGINX — covered in Task 2, Task 3, and Task 4.
- Staging-like mode serves built static assets through NGINX — covered in Task 1, Task 2, and Task 3.
- Frontend keeps browser-facing `/api` boundary — covered in Task 2, Task 4, and Task 5.
- Docs and operational workflow updates — covered in Task 5.

## Placeholder scan

No `TODO`, `TBD`, or deferred implementation markers remain in this plan.

## Type consistency check

- Compose profiles are consistently named `dev` and `staging`.
- Gateway mode variable is consistently named `NGINX_MODE` with values `dev` and `staging`.
- Backend container port is consistently `3005` with `${BACKEND_PORT:-3005}` in Compose.
- Frontend browser API boundary remains `/api` across every task.
