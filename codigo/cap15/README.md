# Capítulo 15: design de APIs

Laboratório do capítulo 15 de *Arquitetura de Software na Prática*.

A API pública do Morada para administradoras de condomínios: identificação da administradora em todo pedido (o cabeçalho `Morada-Administradora` faz o papel do token OAuth), cada uma vendo só os seus condomínios (`entrada/condominios.json`), listagem de cobranças com filtro e paginação por cursor, erros no formato da RFC 9457 e registro de pagamentos com chave de idempotência, única por administradora, gravada na mesma transação do pagamento. O contrato está em `openapi/v1.yaml`; a cópia em `openapi/publicado/v1.yaml` é o que os clientes já usam.

| Versão | O que faz |
|---|---|
| `api` | Prepara o banco, envia as 14 requisições de `entrada/requisicoes.json` e confere cada resposta contra o contrato |
| `compatibilidade` | Compara as propostas de `entrada/propostas` com o contrato publicado e diz quais quebram os clientes |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`). O Compose sobe um PostgreSQL junto com a aplicação.

## Roteiro

```bash
docker compose run --rm app api
docker compose run --rm ferramentas verificar api
docker compose run --rm app compatibilidade
docker compose run --rm ferramentas verificar compatibilidade

# Inclui o teste que quebra quando openapi/v1.yaml muda de forma incompatível
# e cinco pagamentos simultâneos com a mesma chave
docker compose run --rm app testes
```

A pasta `saida/api` traz as respostas (`respostas.txt`), o estado final do banco (`estado.txt`) e a conferência contra o contrato (`contrato.txt`).

## Experimente

- Faça a API devolver `valorCentavos` como texto e leia `contrato.txt`.
- Renomeie um campo em `openapi/v1.yaml` e rode os testes.
- Grave a resposta da chave de idempotência numa transação separada e pense na falha que isso permite.
- Volte a chave primária de `chaves_idempotencia` para só `chave` e veja o que a administradora ADM-B recebe no pedido 13.
