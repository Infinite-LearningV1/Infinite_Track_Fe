FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM alpine:3.20 AS artifacts
WORKDIR /artifacts
COPY --from=build /app/build ./build
CMD ["sh", "-lc", "rm -rf /shared/* && cp -r /artifacts/build/. /shared && tail -f /dev/null"]
