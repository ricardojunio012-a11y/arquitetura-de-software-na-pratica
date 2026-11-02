# Capítulo 7: DDD tático

Laboratório do capítulo 7 de *Arquitetura de Software na Prática*.

As reservas do Morada executam treze comandos (reservar e cancelar) em duas versões com a mesma saída:

| Versão | Como está modelada |
|---|---|
| `antes` | Modelo anêmico: reservas com campos públicos e todas as regras num serviço. Qualquer código pode gravar uma reserva inválida |
| `depois` | Modelo rico: objetos de valor `Dinheiro` e `Periodo`, entidade `Reserva`, agregado `Agenda` (sem sobreposição, antecedência mínima, limite mensal, multa de cancelamento), eventos de domínio, repositório e serviço de aplicação |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`).

## Roteiro

```bash
# Executar os comandos com cada versão e conferir contra o resultado aprovado
docker compose run --rm app antes
docker compose run --rm ferramentas verificar antes
docker compose run --rm app depois
docker compose run --rm ferramentas verificar depois

# Testes: um mostra o estado inválido aceito pelo modelo anêmico; os outros, as invariantes
docker compose run --rm app testes
```

A pasta `saida/<versão>` traz o resultado de cada comando, os eventos publicados e a agenda final.

## Experimente

- Tente criar duas reservas sobrepostas na versão `depois` sem passar pela agenda.
- Acrescente a regra "no máximo 8 horas seguidas" e compare onde ela entra em cada versão.
- Implemente "trocar a reserva de espaço" como um serviço de domínio.
