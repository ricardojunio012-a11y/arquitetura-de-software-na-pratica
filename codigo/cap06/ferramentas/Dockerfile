FROM alpine:3.22
# diffutils: o diff do BusyBox não tem todas as opções usadas nos scripts
RUN apk add --no-cache diffutils
ENTRYPOINT ["sh", "/cap06/ferramentas/ferramentas.sh"]
