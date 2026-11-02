# Capítulo 12: microsserviços

Laboratório do capítulo 12 de *Arquitetura de Software na Prática*.

O módulo de Comunicação extraído do monólito como um serviço HTTP, com falhas injetadas, novas tentativas e idempotência.

| Versão | O que faz |
|---|---|
| `monolito` | A Comunicação como módulo, chamada dentro do processo |
| `servico` | A Comunicação como serviço separado, chamada por HTTP com limite de tempo e novas tentativas com espera crescente e variação |
| `contatos` | A parte difícil: a Comunicação precisa dos e-mails dos moradores, que são do Cadastro. Compara consultar o Cadastro por API com manter uma réplica alimentada por eventos, com o Cadastro fora do ar por 10 minutos (relógio simulado) |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`). O Compose sobe o serviço de Comunicação junto com o monólito.

## Roteiro

```bash
docker compose run --rm app monolito
docker compose run --rm ferramentas verificar monolito
docker compose run --rm app servico
docker compose run --rm ferramentas verificar servico

# Tempos médios, p95 e pior aviso das duas versões, medidos na sua máquina
docker compose run --rm ferramentas comparar

# A parte difícil: os contatos dos moradores pertencem a outro módulo
docker compose run --rm app contatos
docker compose run --rm ferramentas verificar contatos
docker compose run --rm app testes
```

## Experimente

- Mude o número máximo de tentativas do cliente para 1 e conte os avisos perdidos.
- Faça o serviço ignorar o identificador do aviso e conte os avisos duplicados.
- Em `entrada/contatos.json`, aumente `atrasoDaReplica` para 30 minutos e conte os avisos que saem para um e-mail antigo.
