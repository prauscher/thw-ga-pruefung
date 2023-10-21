FROM python:3.12-slim-bookworm AS base

WORKDIR /opt/app

RUN python3 -m pip install --upgrade pip

# Cache
RUN python3 -m pip install tornado
RUN apt update \
    && apt install tini gosu -y \
    && apt clean all -y

FROM base AS build

COPY ./ /opt/app

RUN chown root:root docker-entrypoint.sh && chmod 500 docker-entrypoint.sh
RUN tar cf /build.tar  requirements.txt main.py app/ templates/ static/

FROM base AS app

RUN adduser --system --group --disabled-login --no-create-home --firstuid 200 worker

ENV WEB_PORT=8888
ENV WEB_DEBUG=no

COPY --from=build /build.tar /tmp/build.tar
RUN tar xf /tmp/build.tar \
    && rm /tmp/build.tar && \
    python3 -m pip install --no-cache-dir -r requirements.txt

COPY --from=build /opt/app/docker-entrypoint.sh /docker-entrypoint.sh

VOLUME /data
WORKDIR /data

ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
CMD ["python3", "-u", "/opt/app/main.py"]
