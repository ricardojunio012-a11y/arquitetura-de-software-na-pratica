# Capítulo 38: governança arquitetural

Laboratório do capítulo 38 de *Arquitetura de Software na Prática*.

O registro de decisões do Morada fica em Markdown, versionado com o código, e um validador confere o formato, a numeração e os vínculos de substituição: o ADR-038 substitui o ADR-021. Duas decisões viram funções de aptidão que rodam na esteira e barram o commit que as viola: "nenhum módulo lê a tabela de outro" (ADR-010) e "p95 do painel de inadimplência abaixo de 300 ms a 40 pedidos por segundo" (ADR-038).

O banco é um PostgreSQL embutido (PGlite), em memória, dentro do próprio processo. As consultas são reais; o tempo de cada uma vem de uma premissa, e a carga roda num relógio simulado com semente fixa. Por isso o resultado é o mesmo em qualquer máquina.

| Versão | O que faz |
|---|---|
| `registro` | Valida `node/decisoes/` e gera o índice do registro |
| `defeitos` | Valida `node/decisoes-com-defeitos/`, um registro com sete problemas |
| `aptidao` | Passa três commits (`node/src/commits/c1` a `c3`) pelas duas funções de aptidão |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript e não sobe outros serviços.

## Roteiro

```bash
docker compose run --rm app registro
docker compose run --rm ferramentas verificar registro
docker compose run --rm app defeitos
docker compose run --rm ferramentas verificar defeitos
docker compose run --rm app aptidao
docker compose run --rm ferramentas verificar aptidao
docker compose run --rm app testes
```

A versão `aptidao` leva cerca de meio minuto, porque o commit `c3` faz milhares de consultas de verdade no PGlite.

## Experimente

- Escreva um ADR que substitui o ADR-012 (a Comunicação passa a receber os avisos por fila), e faça o validador aceitar o registro.
- Acrescente ao validador a regra "a numeração não tem buracos" e explique por que ela não vale para este recorte do registro.
- Crie o commit `c4`, que corrige o painel do `c3` e também acrescenta uma consulta sem índice. O que a função de latência mostra, e por quê?
- Escreva uma terceira função de aptidão: nenhuma dependência do `package.json` com licença fora de uma lista permitida.
