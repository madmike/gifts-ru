# Ensure pnpm installs all dependencies, including devDependencies
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the app
FROM base AS build
COPY . ./
RUN pnpm run build

# Final image with necessary files for production
FROM node:20-slim AS final
WORKDIR /app
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
EXPOSE 8000

CMD ["node", "dist/main.js"]
