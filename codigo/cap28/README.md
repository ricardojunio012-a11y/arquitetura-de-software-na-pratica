# Capítulo 28: concorrência e idempotência

Laboratório do capítulo 28 de *Arquitetura de Software na Prática*.

Vinte moradores pedem a churrasqueira para o mesmo sábado à tarde, no mesmo instante, cada um por uma conexão. A reserva que confere antes de inserir aceita mais de um; o bloqueio otimista e a restrição de exclusão do PostgreSQL (`EXCLUDE USING gist`) aceitam um só. Depois, o morador toca duas vezes no botão "pagar": sem chave de idempotência saem dois pagamentos; com a mesma chave nos dois toques, sai um.

| Versão | O que faz |
|---|---|
| `reservas` | Dispara os 20 pedidos contra as três formas de reservar e conta as reservas gravadas |
| `pagamento` | Dispara os dois toques juntos, sem e com chave de idempotência |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL sobe sozinho.

## Roteiro

```bash
docker compose run --rm app reservas
docker compose run --rm ferramentas verificar reservas
docker compose run --rm app pagamento
docker compose run --rm ferramentas verificar pagamento
docker compose run --rm app testes
```

## Experimente

- Tire o `ROLLBACK` do bloqueio otimista quando a versão mudou e conte as reservas.
- Troque `&&` por `=` na restrição de exclusão e reserve dois horários que se sobrepõem.
- Gere uma chave nova a cada toque, em vez de uma por intenção de pagar, e veja a proteção sumir.
