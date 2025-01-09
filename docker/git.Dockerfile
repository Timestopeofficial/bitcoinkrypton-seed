# syntax=docker/dockerfile:1.2

# Build from master branch by default.
# One can override this using --build-arg when building the docker image from this file.
ARG REPO_URL=https://github.com/Timestopeofficial/krypton.git
ARG BRANCH=master
ARG DATA_PATH=/krypton
ARG PACKAGING=1

#---------------------------- BUILD KRYPTON - BASE -------------------------------
FROM node:14-buster as base

# Install build dependencies
RUN apt-get update \
    && apt-get --no-install-recommends -y install build-essential git-core \
    && rm -rf /var/lib/apt/lists/*

# Create build directory
WORKDIR /build

# Clone repo
ARG BRANCH
ARG REPO_URL
RUN git clone --branch ${BRANCH} ${REPO_URL} /build

#---------------------------- BUILD KRYPTON - BUILD ------------------------------
FROM base as builder

# Install, Build & Test
ARG PACKAGING
RUN --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    yarn --frozen-lockfile
RUN yarn lint
RUN yarn lint-types
RUN yarn test-node

#---------------------------- BUILD KRYPTON - DEPS -------------------------------
FROM base as installer

# Install and build production dependencies
ARG PACKAGING
RUN --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --production

#---------------------------- BUILD KRYPTON - NODE -------------------------------
FROM node:14-buster-slim

# Install tini - a tiny init for containers
RUN apt-get update \
    && apt-get --no-install-recommends -y install tini \
    && rm -rf /var/lib/apt/lists/*

# We're going to execute krypton in the context of its own user, what else?
ENV USER=krypton
RUN groupadd -r -g 999 ${USER} \
    && useradd -r -g ${USER} -u 999 -s /sbin/nologin -c "User with restricted privileges for Krypton daemon" ${USER}

# Create data directory for the krypton process
ARG DATA_PATH
RUN mkdir -p ${DATA_PATH} && chown ${USER}:root ${DATA_PATH}
VOLUME ${DATA_PATH}
WORKDIR ${DATA_PATH}

# Copy production dependencies from installer and built files from builder
COPY --from=installer /build/package.json /build/yarn.lock  /usr/share/krypton/
COPY --from=installer /build/node_modules                   /usr/share/krypton/node_modules
COPY --from=builder   /build/*.md                           /usr/share/krypton/
COPY --from=builder   /build/build                          /usr/share/krypton/build
COPY --from=builder   /build/clients                        /usr/share/krypton/clients
COPY --from=builder   /build/dist                           /usr/share/krypton/dist
COPY --from=builder   /build/doc                            /usr/share/krypton/doc

# Execute client as non-root user
USER ${USER}

# Documentation
EXPOSE 12011 12211 12411

# Just execute the krypton process. One can customize the created container easily
# to one's needs by (at least) the following options:
# - supply your own arguments to the entrypoint while creating the container, e.g.
#    docker run krypton/nodejs-client --miner
# - just bind mount your own krypton.conf to the container at /etc/krypton/krypton.conf
#   then you can just create the container like (assuming the config is in the
#   current working directory)
#     docker run -v $(pwd)/krypton.conf:/etc/krypton/krypton.conf krypton/nodejs-client --config=/etc/krypton.conf
# (- of course, you can combine and modify these options suitable to your needs)
ENTRYPOINT [ "/usr/bin/tini", "--", "/usr/share/krypton/clients/nodejs/krypton" ]
