# syntax=docker/dockerfile:1

# Build context = the workspace dir containing BOTH repos (compose.prod.yml
# sets context: ../..). @microshala/contracts is a `link:` dep into the
# sibling backend repo, so the sibling path must exist inside the image at
# the same relative location pnpm-lock.yaml records.

# ---------- deps ----------
FROM node:24-alpine AS deps
WORKDIR /workspace/cms-lms-test-devin-swe-2
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
# contracts is `link:` into the sibling repo in dev — inside Docker its zod
# import can't resolve at the symlink realpath — vendor it under the frontend
# and install as a normal `file:` package instead (dev manifest stays link:).
COPY cms-lms-test-devin-swe-2-nest-backend/src/contracts ./vendor/contracts
COPY cms-lms-test-devin-swe-2/package.json cms-lms-test-devin-swe-2/pnpm-lock.yaml ./
RUN sed -i 's|"link:\.\./cms-lms-test-devin-swe-2-nest-backend/src/contracts"|"file:./vendor/contracts"|' package.json \
 && pnpm install --no-frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY cms-lms-test-devin-swe-2 ./
RUN pnpm build

# ---------- runner ----------
# Standalone output nests under the app dir because turbopack.root is the
# workspace parent — server.js lives at cms-lms-test-devin-swe-2/server.js.
FROM node:24-alpine AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# npm@12 clears the scanner-flagged deps vendored inside the image's npm.
RUN addgroup -S app && adduser -S app -G app && npm i -g npm@12.1.0
COPY --from=build /workspace/cms-lms-test-devin-swe-2/.next/standalone ./
COPY --from=build /workspace/cms-lms-test-devin-swe-2/.next/static \
     ./cms-lms-test-devin-swe-2/.next/static
COPY --from=build /workspace/cms-lms-test-devin-swe-2/public \
     ./cms-lms-test-devin-swe-2/public
USER app
EXPOSE 3000
# Liveness = the Next server itself (/login), not /api/v1/health — a dead DB
# must not restart-loop the frontend; the public chain check is the runbook's.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "cms-lms-test-devin-swe-2/server.js"]
