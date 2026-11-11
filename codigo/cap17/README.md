# Capítulo 17: multi-tenancy em SaaS

Laboratório do capítulo 17 de *Arquitetura de Software na Prática*.

Todos os condomínios do Morada numa tabela compartilhada, separados por `condominio_id`. Um relatório com um `WHERE` esquecido vaza dados entre condomínios até que o PostgreSQL passe a filtrar as linhas com Row-Level Security. Uma integração defeituosa de um condomínio atrasa todos os outros até ser contida por um balde de fichas por condomínio.

| Versão | O que faz |
|---|---|
| `vazamento` | Roda o relatório com defeito sem RLS, com RLS, numa transação sem condomínio e tentando gravar a cobrança de outro condomínio; depois, em nome de uma administradora que enxerga dois condomínios (tabela `administracoes`) |
| `barulho` | Simula um segundo de pedidos à API, sem limite e com um balde de fichas por condomínio (`entrada/barulho.json`) |

## Pré-requisito

Docker com Docker Compose. O padrão é a versão em TypeScript (`node`); as versões extras em `php`, `python` e `java` se escolhem em `.env`. O Compose sobe um PostgreSQL com dois papéis: o administrador, que cria as tabelas (`sql/esquema.sql` e `sql/rls.sql`), e o `app_morada`, usado pela aplicação.

## Roteiro

```bash
docker compose run --rm app vazamento
docker compose run --rm ferramentas verificar vazamento
docker compose run --rm app barulho
docker compose run --rm ferramentas verificar barulho
docker compose run --rm app testes
```

## Experimente

- Conecte a aplicação com o administrador (troque `APP_BANCO_URL` por `BANCO_URL`) e veja a política deixar de valer.
- Troque o `true` do `set_config` por `false` e pense no que sobra numa conexão reaproveitada.
- Mude o limite em `entrada/barulho.json` e compare as esperas.
- Tire a linha `(3, 15)` de `administracoes` em `sql/esquema.sql` e veja a administradora perder o condomínio 15 sem mudar código.
