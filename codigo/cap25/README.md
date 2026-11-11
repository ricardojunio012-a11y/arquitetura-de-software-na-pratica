# Capítulo 25: processamento assíncrono e filas no system design

Laboratório do capítulo 25 de *Arquitetura de Software na Prática*.

A geração mensal de boletos para 3.000 condomínios, com uma fila numa tabela do PostgreSQL (`FOR UPDATE SKIP LOCKED` e prazo de visibilidade) e 16 workers. Um worker morre com uma tarefa na mão, e outro fica lento e é barrado pelo token de posse ao tentar concluir uma tarefa que já foi refeita; segundas vias passam na frente; um banco emissor com limite de 8 chamadas simultâneas recusa os workers até que eles usem contrapressão.

| Versão | O que faz |
|---|---|
| `fila` | Processa as 3.000 tarefas com um worker que morre no meio e outro que trava, e confere que nenhum boleto se duplicou |
| `pressao` | Insere 50 segundas vias prioritárias no meio da geração, sem e com contrapressão diante do banco emissor |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL sobe sozinho.

## Roteiro

```bash
docker compose run --rm app fila
docker compose run --rm ferramentas verificar fila
docker compose run --rm app pressao
docker compose run --rm ferramentas verificar pressao
docker compose run --rm app testes
```

## Experimente

- Tire a idempotência dos boletos e conte os duplicados.
- Encurte o prazo de visibilidade e veja as tarefas sendo refeitas sem necessidade.
- Tire o token de posse do `concluir` e veja o worker lento concluir uma tarefa que não é mais dele.
- Tire a prioridade das segundas vias.
