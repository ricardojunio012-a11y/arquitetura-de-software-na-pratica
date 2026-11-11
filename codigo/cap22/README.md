# Capítulo 22: escalabilidade horizontal e balanceamento de carga

Laboratório do capítulo 22 de *Arquitetura de Software na Prática*.

Três réplicas da API do painel atrás de um NGINX, com a sessão do síndico na memória de cada réplica ou no Redis, a queda de uma réplica durante o uso e uma simulação de algoritmos de balanceamento.

| Versão | O que faz |
|---|---|
| `sessao-memoria` | Login e nove pedidos ao painel, com a sessão na memória das réplicas |
| `sessao-redis` | O mesmo, com a sessão no Redis |
| `queda` | Trinta pedidos, com a `api2` deixando de aceitar conexões depois do décimo |
| `algoritmos` | Simula rodízio, menos conexões, duas escolhas e hash do condomínio com a mesma carga |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. Cada cenário com o balanceador espera 31 segundos antes de começar, para o NGINX voltar a usar todas as réplicas.

## Roteiro

```bash
docker compose run --rm app sessao-memoria
docker compose run --rm ferramentas verificar sessao-memoria
docker compose run --rm app sessao-redis
docker compose run --rm ferramentas verificar sessao-redis
docker compose run --rm app queda
docker compose run --rm ferramentas verificar queda
docker compose run --rm app algoritmos
docker compose run --rm ferramentas verificar algoritmos
docker compose run --rm --no-deps app testes
docker compose down
```

## Experimente

- Ligue a afinidade de sessão (`ip_hash`) no NGINX e veja a sessão em memória "funcionar".
- Desligue o reenvio (`proxy_next_upstream off`) e veja o síndico receber o erro da queda.
- Mande SIGTERM a uma réplica (`docker compose kill -s SIGTERM api1`) e veja o desligamento gracioso; sem o tratamento do sinal em `node/src/api.ts`, o `docker compose stop` espera o prazo e mata o processo.
