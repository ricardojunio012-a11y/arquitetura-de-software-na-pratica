# Capítulo 10: DDD estratégico e o monólito modular

Laboratório do capítulo 10 de *Arquitetura de Software na Prática*.

Reservas e Financeiro como módulos de um monólito modular, com API pública e dados próprios, e um teste de arquitetura em cada linguagem (dependency-cruiser, deptrac, import-linter e ArchUnit).

| Versão | O que faz |
|---|---|
| `antes` | Reservas lê diretamente a tabela do Financeiro |
| `depois` | Reservas consulta o Financeiro pela porta `SituacaoFinanceira`, da API pública do módulo |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`).

## Roteiro

```bash
docker compose run --rm app antes
docker compose run --rm ferramentas verificar antes
docker compose run --rm app depois
docker compose run --rm ferramentas verificar depois

# Só termina com sucesso se "antes" violar a regra e "depois" a respeitar
docker compose run --rm app arquitetura
docker compose run --rm app testes
```

## Agora a parte difícil: o atalho em SQL (só em TypeScript)

O teste de arquitetura só lê `import`; o incidente do capítulo foi uma consulta SQL. Este passo
sobe um PostgreSQL na rede interna do Compose (sem porta no host), cria um esquema e um papel por
módulo e mostra o banco recusando a consulta de Reservas à tabela do Financeiro. Usa sempre a
imagem Node, qualquer que seja a linguagem do `.env`.

```bash
docker compose run --rm esquemas
docker compose run --rm ferramentas verificar esquemas
docker compose down
```

## Experimente

- Na versão `depois`, faça o Financeiro importar algo de Reservas e rode `arquitetura` para ler a mensagem.
- Antes do código, faça um Event Storming de papel do estorno de um pagamento.
