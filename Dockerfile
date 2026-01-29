# First stage.  This stage is responsible for installing dependencies and building the application.
# The output of this stage is a built version of your Next.js app, which includes all the static assets and optimized files that will be served to users.
FROM node:22-alpine AS build

ARG RELEASE_TAG_NAME
ENV NEXT_PUBLIC_RELEASE_TAG_NAME=${RELEASE_TAG_NAME}

ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

ARG SENTRY_AUTH_TOKEN
WORKDIR /app

COPY . .

RUN npm install -g pnpm@10
RUN pnpm i
RUN pnpm chakra typegen src/ui/theme/theme.ts
RUN pnpm build

# This stage creates the final Docker image that will be used in production. It only contains the necessary runtime environment and the built application files from the first stage.
FROM node:22-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG RELEASE_TAG_NAME
ENV NEXT_PUBLIC_RELEASE_TAG_NAME=${RELEASE_TAG_NAME}

ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

WORKDIR /app

COPY --from=build /app/next.config.js /app/next.config.js
COPY --from=build /app/public /app/public
COPY --from=build /app/.next/static /app/.next/static
COPY --from=build /app/.next/standalone /app


EXPOSE 3000
CMD [ "node", "server.js" ]
