# Capítulo 35: alta disponibilidade e recuperação de desastres

Laboratório do capítulo 35 de *Arquitetura de Software na Prática*.

O banco de produção do Morada roda com o arquivamento contínuo do WAL ligado. O laboratório faz um backup base, apaga por engano a tabela de cobranças e a recupera até o instante anterior ao acidente numa instância à parte, sem perder o que foi gravado depois; mede o RPO quando o servidor inteiro é perdido; e derruba réplicas e uma zona da API de avisos durante o tráfego, conferindo a hipótese de estado estável.

| Versão | O que faz |
|---|---|
| `pitr` | Backup base, 400 pagamentos, `DROP TABLE` por engano, restauração a um ponto no tempo numa instância à parte e cópia da tabela de volta para a produção |
| `desastre` | O servidor é perdido com 40 pagamentos num segmento de WAL ainda não arquivado: a restauração recupera tudo, menos esses 40 |
| `caos` | 1.000 pedidos por experimento contra réplicas da API em duas zonas, derrubando uma réplica ou uma zona inteira no meio do tráfego |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL e as três réplicas da API sobem sozinhos, sem porta publicada no computador.

## Roteiro

```bash
docker compose run --rm app pitr
docker compose run --rm ferramentas verificar pitr
docker compose run --rm app desastre
docker compose run --rm ferramentas verificar desastre
docker compose run --rm app caos
docker compose run --rm ferramentas verificar caos
docker compose run --rm app testes
docker compose down -v
```

Os tempos de cada etapa da restauração (o RTO medido) ficam em `saida/tempos/`, fora da verificação, porque mudam de máquina para máquina.

## Experimente

- Em `pitr.ts`, comente a chamada a `fecharSegmento` e rode de novo. A restauração falha: o WAL com os últimos pagamentos ainda não chegou ao arquivo. Leia a mensagem no log impresso.
- Em `pitr.ts`, troque a cópia da tabela pela promoção da instância restaurada como nova produção. Quantos avisos se perdem?
- Em `banco/entrada.sh`, ligue `archive_timeout=1`, recrie o banco (`docker compose down -v`) e rode `desastre` esperando dois segundos antes da perda. O que muda no RPO? Quanto cresce o volume `arquivo`?
- Aumente as cobranças para 3 milhões em `dados.ts` e meça o RTO de novo.
- Em `caos.ts`, faça o balanceador tentar outra réplica só na mesma zona. Qual experimento muda?
