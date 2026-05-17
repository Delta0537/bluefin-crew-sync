# Production image: Node 22 + Nitro `.output` (Railway, Fly, etc.)
# Railway injects service variables into the build; set VITE_* there so Vite can embed them.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

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
# Railway sets PORT; Nitro reads PORT / NITRO_PORT
CMD ["node", ".output/server/index.mjs"]
