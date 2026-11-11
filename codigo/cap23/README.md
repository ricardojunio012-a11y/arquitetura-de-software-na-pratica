# Capítulo 23: cache e CDN

Laboratório do capítulo 23 de *Arquitetura de Software na Prática*.

O painel financeiro do síndico com cache-aside no Redis, a invalidação depois de um pagamento, o estouro do cache com três formas de busca e a expiração antecipada probabilística (XFetch).

| Versão | O que faz |
|---|---|
| `cache-aside` | Primeiro pedido do banco, os seguintes do cache, e a invalidação depois de um pagamento |
| `estouro` | 200 pedidos simultâneos com a chave fora do cache: sem proteção, com promessa compartilhada e com trava no Redis; e a trava com prazo menor que a carga, soltada sem conferir o dono e com comparar e apagar (Lua) |
| `xfetch` | Simula cinco minutos de pedidos a um relatório caro, com vencimento fixo e com expiração antecipada |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL e o Redis sobem sozinhos.

## Roteiro

```bash
docker compose run --rm app cache-aside
docker compose run --rm ferramentas verificar cache-aside
docker compose run --rm app estouro
docker compose run --rm ferramentas verificar estouro
docker compose run --rm app xfetch
docker compose run --rm ferramentas verificar xfetch
docker compose run --rm app testes
```

## Experimente

- Distribua os pedidos do estouro entre três objetos de cache, como três réplicas, e compare a promessa com a trava.
- Inverta a ordem da invalidação e do `UPDATE`.
- Troque `soltarTrava` por um `del` simples e force uma carga mais longa que o prazo da trava.
- Aumente o custo de geração na simulação do XFetch.
