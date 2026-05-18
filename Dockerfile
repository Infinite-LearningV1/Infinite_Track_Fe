FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG API_BASE_URL=/api
ARG APP_ENVIRONMENT=staging
ARG DEBUG_MODE=false
ARG LOG_LEVEL=info

ENV API_BASE_URL=$API_BASE_URL
ENV APP_ENVIRONMENT=$APP_ENVIRONMENT
ENV DEBUG_MODE=$DEBUG_MODE
ENV LOG_LEVEL=$LOG_LEVEL

RUN npm run build

FROM alpine:3.20 AS artifacts

WORKDIR /artifacts

COPY --from=build /app/build ./build

CMD ["sh", "-lc", "rm -rf /shared/* /shared/.[!.]* /shared/..?* && cp -r /artifacts/build/. /shared && touch /shared/.ready && tail -f /dev/null"]
