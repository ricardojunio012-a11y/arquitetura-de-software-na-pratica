# Capítulo 11: arquitetura orientada a eventos

Laboratório do capítulo 11 de *Arquitetura de Software na Prática*.

O Financeiro publica `PagamentoConfirmado`, e Reservas e Comunicação reagem. Três formas de publicar o evento, com um cenário em que o processo cai depois de gravar (`entrada/cenario.json`).

| Versão | O que faz |
|---|---|
| `memoria` | Barramento em memória, sem falhas |
| `escrita-dupla` | Grava no banco e publica no RabbitMQ em seguida. A queda entre os dois passos perde um evento |
| `outbox` | Grava o evento na mesma transação, e um relay o publica. A queda repete um evento, e os assinantes idempotentes o ignoram |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`). O Compose sobe o PostgreSQL e o RabbitMQ junto com a aplicação.

## Roteiro

```bash
docker compose run --rm app memoria
docker compose run --rm ferramentas verificar memoria
docker compose run --rm app escrita-dupla
docker compose run --rm ferramentas verificar escrita-dupla
docker compose run --rm app outbox
docker compose run --rm ferramentas verificar outbox
docker compose run --rm app testes
```

Na versão `outbox`, `execucao.txt` mostra o relay caindo e publicando de novo, e `consumo.txt` mostra os assinantes ignorando a repetição.

## Experimente

- Remova a verificação de eventos já tratados do assinante de Comunicação e conte os avisos repetidos.
- Acrescente um módulo Portaria que assina `PagamentoConfirmado` e conte quantos arquivos do Financeiro mudaram.
