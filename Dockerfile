# Production image: Node 22 + Nitro `.output` (Railway, Fly, etc.)
# Railway injects service variables into the build; set VITE_* there so Vite can embed them.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/.output ./.output

EXPOSE 8080
# Railway sets PORT; Nitro reads PORT / NITRO_PORT
CMD ["node", ".output/server/index.mjs"]
