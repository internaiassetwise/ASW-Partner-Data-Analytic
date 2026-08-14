FROM node:22-bookworm-slim

WORKDIR /app

# Install from a clean Linux filesystem so native optional dependencies
# (Tailwind oxide and Lightning CSS) match Railway's operating system.
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --include=dev --include=optional

COPY . .

# Fail here with a clear message if a native package is ever missing again.
RUN test -f node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node
ARG API_BASE_URL=http://127.0.0.1:4000
ENV API_BASE_URL=$API_BASE_URL
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "start:frontend"]
