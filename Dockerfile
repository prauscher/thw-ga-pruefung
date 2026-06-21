FROM python:3.14-alpine3.24 AS base

ARG TINI_VERSION=0.19.0-r3
ARG SUEXEC_VERSION=0.3-r0

WORKDIR /opt/app

RUN apk add --no-cache "tini=${TINI_VERSION}" "su-exec=${SUEXEC_VERSION}"

FROM base AS build

ARG PYPI_PIP_VERSION=26.1.2

RUN python3 -m venv /opt/venv
COPY requirements.txt /tmp/requirements.txt

RUN /opt/venv/bin/python -m pip install --no-cache-dir "pip==${PYPI_PIP_VERSION}" && \
    /opt/venv/bin/python -m pip install --no-cache-dir -r /tmp/requirements.txt

COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY main.py ./main.py
COPY templates/ ./templates/
COPY static/ ./static/
COPY app/ ./app/

RUN find "." -exec chown root:root '{}' +  && \
    find "." -type d -exec chmod 755 '{}' +  && \
    find "." -type f -exec chmod 644 '{}' +  && \
    chmod 555 "/docker-entrypoint.sh" && \
    chown root:root "/docker-entrypoint.sh"

FROM base

RUN adduser -S -D -H worker

ENV WEB_PORT=8888
ENV WEB_DEBUG=no

VOLUME /data
WORKDIR /data

ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
CMD ["/opt/venv/bin/python3", "-u", "/opt/app/main.py"]

COPY --from=build /docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=build /opt/app /opt/app
COPY --from=build /opt/venv /opt/venv
