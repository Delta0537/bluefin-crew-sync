# Production image: Node 22 + Nitro `.output` (Railway, Fly, etc.)
# Railway injects service variables into the build; set VITE_* there so Vite can embed them.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Node 22 image ships npm 10; `npm ci` there rejects lockfiles produced by npm 11
# (missing optional peer entries like chokidar / lru-cache / readdirp). Match npm 11+.
RUN npm install -g npm@11.14.1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Makes a line show up in hosts that swallow early output (easier to see *something* ran).
RUN node --version && npm --version

# Railway: user-defined vars must be declared as ARG to exist during `docker build`.
# Add more ARG/ENV pairs if you introduce additional VITE_* keys.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/.output ./.output

EXPOSE 8080
# Railway sets PORT; Nitro reads PORT / NITRO_PORT. Echo helps project-level log aggregation UIs.
CMD ["sh", "-c", "echo bluefin-crew-sync-node-server-start && exec node .output/server/index.mjs"]
