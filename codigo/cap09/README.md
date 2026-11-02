# Capítulo 9: hexagonal e Clean Architecture

Laboratório do capítulo 9 de *Arquitetura de Software na Prática*.

O mesmo caso de uso de reservas, com o núcleo isolado por portas, ligado a adaptadores diferentes: HTTP ou linha de comando na entrada, memória ou PostgreSQL na saída.

| Versão | O que faz |
|---|---|
| `http-memoria` | API HTTP com o repositório em memória |
| `http-postgres` | A mesma API com o repositório no PostgreSQL. A saída é idêntica à anterior |
| `cli-postgres` | Linha de comando com o repositório no PostgreSQL, a partir de `entrada/comandos.txt` |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`). O Compose sobe um PostgreSQL junto com a aplicação.

## Roteiro

```bash
docker compose run --rm app http-memoria
docker compose run --rm ferramentas verificar http-memoria
docker compose run --rm app http-postgres
docker compose run --rm ferramentas verificar http-postgres
docker compose run --rm app cli-postgres
docker compose run --rm ferramentas verificar cli-postgres
docker compose run --rm app testes
```

O arquivo `agendas.txt` de cada versão mostra o estado final das agendas, lido de volta pelo repositório.

## Experimente

- Troque a raiz de composição da linha de comando para o repositório em memória e explique o que deixa de funcionar.
- Escreva um adaptador que guarde as agendas em arquivos JSON e faça-o passar no teste de contrato.
