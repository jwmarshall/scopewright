# Pin the amd64 image as well as the CLI releases. Cursor's archive is amd64-only here.
ARG HARNESS
FROM node:22.22.0-bookworm-slim@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3 AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git ripgrep python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/harness/node_modules/.bin:/opt/cursor:${PATH}" \
    HOME=/home/node \
    CI=1 \
    NO_COLOR=1 \
    DISABLE_TELEMETRY=1 \
    DO_NOT_TRACK=1 \
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
    PI_OFFLINE=1 \
    PI_TELEMETRY=0 \
    GEMINI_CLI_TRUST_WORKSPACE=true \
    OPENCODE_DISABLE_DEFAULT_PLUGINS=true \
    OPENCODE_DISABLE_MODELS_FETCH=true
WORKDIR /opt/harness
ENTRYPOINT ["node", "/opt/harness/smoke.mjs"]

FROM base AS claude
ENV HARNESS=claude HARNESS_VERSION=2.1.307
RUN npm install --no-audit --no-fund @anthropic-ai/claude-code@2.1.307

FROM base AS codex
ENV HARNESS=codex HARNESS_VERSION=0.163.0
RUN npm install --no-audit --no-fund @openai/codex@0.163.0 skills@1.7.4

FROM base AS pi
ENV HARNESS=pi HARNESS_VERSION=1.4.0
RUN npm install --no-audit --no-fund @earendil-works/pi-coding-agent@1.4.0

FROM base AS omp
ENV HARNESS=omp HARNESS_VERSION=18.12.6
RUN npm install --no-audit --no-fund bun@1.4.3 @oh-my-pi/pi-coding-agent@18.12.6
ENTRYPOINT ["bun", "/opt/harness/smoke.mjs"]

FROM base AS antigravity
ENV HARNESS=antigravity HARNESS_VERSION=1.4.5
# Official install.sh linux_amd64 manifest, pinned instead of executing the mutable installer.
# Source: https://antigravity.google/cli/install.sh (2026-10-22); payload matches its SHA512.
RUN curl -fL -o /tmp/antigravity.tar.gz \
      https://storage.googleapis.com/antigravity-public/antigravity-cli/1.4.5-4952523841339392/linux-x64/cli_linux_x64.tar.gz \
    && echo '90cc1894b6862510869ad4cf1a6f4c043b7ae7c095bad8d5c355788a0ca935c7  /tmp/antigravity.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/antigravity.tar.gz -C /tmp antigravity \
    && install -m 0755 /tmp/antigravity /usr/local/bin/agy \
    && rm /tmp/antigravity.tar.gz /tmp/antigravity

FROM base AS gemini
ENV HARNESS=gemini HARNESS_VERSION=0.65.0
RUN npm install --no-audit --no-fund @google/gemini-cli@0.65.0 @google/gemini-cli-core@0.65.0

FROM base AS opencode
ENV HARNESS=opencode HARNESS_VERSION=1.19.3
RUN npm install --no-audit --no-fund opencode-ai@1.19.3 skills@1.7.4

FROM base AS cursor
ENV HARNESS=cursor HARNESS_VERSION=2026.10.19-6bbf2c4
# Official installer archive URL, pinned instead of executing the mutable installer.
# Source: https://cursor.com/install (2026-10-22).
RUN curl -fL -o /tmp/cursor.tar.gz \
      https://downloads.cursor.com/lab/2026.10.19-6bbf2c4/linux/x64/agent-cli-package.tar.gz \
    && echo 'cf80cc18d8b33bf33e762353977ca1868cfc45290c92c0ffdcef83bb8b37b44f  /tmp/cursor.tar.gz' | sha256sum -c - \
    && mkdir /opt/cursor \
    && tar --strip-components=1 -xzf /tmp/cursor.tar.gz -C /opt/cursor \
    && rm /tmp/cursor.tar.gz

FROM ${HARNESS} AS smoke
# Discard root-owned state created by CLI postinstall scripts before offline user runs.
RUN rm -rf /home/node && install -d -o node -g node /home/node
COPY smoke.mjs /opt/harness/smoke.mjs
USER node
WORKDIR /home/node
