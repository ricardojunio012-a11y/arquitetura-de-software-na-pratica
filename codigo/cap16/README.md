# Capítulo 16: arquitetura de banco de dados relacional

Laboratório do capítulo 16 de *Arquitetura de Software na Prática*.

O banco do Morada com migrações versionadas (`migracoes/`), uma consulta de inadimplência sobre 1 milhão de cobranças e o fundo de reserva de um condomínio.

| Versão | O que faz |
|---|---|
| `consulta` | Aplica as migrações, gera 1 milhão de cobranças e mostra o plano da consulta de inadimplência sem índice, com um índice na coluna errada e com o índice da migração 003 |
| `isolamento` | Duas saídas do fundo de reserva intercaladas sempre na mesma ordem, em READ COMMITTED, REPEATABLE READ e SERIALIZABLE |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`). O Compose sobe um PostgreSQL junto com a aplicação.

## Roteiro

```bash
# Os tempos de cada estado aparecem no terminal; os planos vão para saida/consulta
docker compose run --rm app consulta
docker compose run --rm ferramentas verificar consulta
docker compose run --rm app isolamento
docker compose run --rm ferramentas verificar isolamento

# Migrações e duas saídas simultâneas com a linha do fundo travada
docker compose run --rm app testes
```

## Experimente

- Troque a ordem das colunas do índice da migração 003 e compare os planos.
- Experimente um índice parcial (`WHERE situacao = 'aberta'`).
- Crie uma migração 004 e veja `saida/consulta/migracoes.txt`.
