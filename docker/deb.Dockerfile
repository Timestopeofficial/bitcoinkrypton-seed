ARG DATA_PATH=/krypton

#---------------------------- BUILD KRYPTON - BUILD ------------------------------
FROM node:14-buster as builder
# Get repo key and install it
RUN wget -qO - https://www.krypton.com/krypton-signing-key.pub | apt-key add -

#---------------------------- BUILD KRYPTON - NODE -------------------------------
FROM node:14-buster-slim

# Install the repo
COPY --from=builder /etc/apt/trusted.gpg /etc/apt/
RUN echo "deb [arch=amd64] http://repo.krypton.com/deb stable main" > /etc/apt/sources.list.d/krypton.list

# Install krypton and tini
RUN apt-get update \
    && apt-get --no-install-recommends -y install krypton tini \
    && rm -rf /var/lib/apt/lists/*

# We're going to execute krypton in the context of its own user, what else?
ENV USER=krypton

# Create data directory for the krypton process
ARG DATA_PATH
RUN mkdir -p ${DATA_PATH} && chown ${USER}:root ${DATA_PATH}
VOLUME ${DATA_PATH}
WORKDIR ${DATA_PATH}

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
ENTRYPOINT [ "/usr/bin/tini", "--", "/usr/bin/krypton" ]
