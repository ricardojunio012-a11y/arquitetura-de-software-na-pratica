# Capítulo 30: transações distribuídas e Sagas

Laboratório do capítulo 30 de *Arquitetura de Software na Prática*.

O onboarding do Residencial Jardins passa por quatro serviços, cada um com o seu esquema no PostgreSQL e nenhuma transação comum: contrato, primeira cobrança, provisionamento do tenant e importação dos moradores, seguidos do e-mail de boas-vindas, o passo que não se desfaz. A planilha tem um CPF errado na linha 37.

| Versão | O que faz |
|---|---|
| `ingenuo` | Chama os serviços em sequência; a importação falha e o contrato, a cobrança e o tenant ficam pela metade |
| `saga` | Um orquestrador grava o progresso e, na falha, compensa os passos concluídos em ordem inversa |
| `retomada` | Com a planilha corrigida, o orquestrador cai depois da cobrança; outro processo retoma, e a cobrança não se duplica |
| `compensacao` | O orquestrador cai no meio da compensação; outro processo retoma pelo estado gravado e continua compensando, sem avançar de novo |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL sobe sozinho.

## Roteiro

```bash
docker compose run --rm app ingenuo
docker compose run --rm ferramentas verificar ingenuo
docker compose run --rm app saga
docker compose run --rm ferramentas verificar saga
docker compose run --rm app retomada
docker compose run --rm ferramentas verificar retomada
docker compose run --rm app compensacao
docker compose run --rm ferramentas verificar compensacao
docker compose run --rm app testes
```

## Experimente

- Tire o `ON CONFLICT` da emissão da cobrança e rode a versão `retomada`.
- Mova o e-mail de boas-vindas para antes da importação e rode a versão `saga`.
- Faça a compensação do tenant falhar uma vez e veja o que o orquestrador deveria fazer.
- Apague o tratamento do estado `compensando` na retomada e rode a versão `compensacao`.
