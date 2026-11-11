# Capítulo 27: fundamentos de sistemas distribuídos

Laboratório do capítulo 27 de *Arquitetura de Software na Prática*.

Um PostgreSQL líder e uma réplica, com o Toxiproxy no meio do caminho da replicação. O laboratório corta a rede e mostra as duas escolhas do teorema CAP: com replicação assíncrona, a escrita é aceita e a réplica fica com o dado antigo; com replicação síncrona, a escrita espera a rede voltar. Na parte difícil, uma segunda réplica (a candidata) é promovida a líder durante a partição: os dois lados confirmam escritas, e a do líder antigo se perde quando a rede volta.

| Versão | O que faz |
|---|---|
| `assincrona` | Corta a rede, muda o horário de silêncio no líder e lê no líder e na réplica |
| `sincrona` | O mesmo, com replicação síncrona: a escrita fica sem confirmação até a rede voltar |
| `promocao` | Corta a rede até a candidata, confirma uma escrita no líder, promove a candidata, confirma outra nela e mostra a escrita perdida; no fim, reconstrói a candidata a partir do líder |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript.

## Roteiro

```bash
docker compose run --rm app assincrona
docker compose run --rm ferramentas verificar assincrona
docker compose run --rm app sincrona
docker compose run --rm ferramentas verificar sincrona
docker compose run --rm app promocao
docker compose run --rm ferramentas verificar promocao
docker compose run --rm --no-deps app testes
docker compose down
```

## Experimente

- Troque o corte da rede por latência (um *toxic* `latency`) e meça as escritas.
- Leia sempre do líder no cenário assíncrono.
