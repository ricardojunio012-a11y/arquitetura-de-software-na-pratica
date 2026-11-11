# Capítulo 37: privacidade e conformidade

Laboratório do capítulo 37 de *Arquitetura de Software na Prática*.

Carlos Menezes, morador da unidade 302 do Residencial Jardins, se muda e pede ao Morada a cópia dos seus dados e a eliminação deles. O laboratório cumpre o pedido no banco de produção, nos eventos já publicados para outros módulos e no backup da noite anterior, e mostra uma trilha de auditoria que denuncia quem tenta reescrevê-la.

| Versão | O que faz |
|---|---|
| `ingenuo` | Apaga a linha do cadastro. Os eventos publicados e o backup continuam com o nome, o CPF e o e-mail, e a restauração do backup traz o ex-morador de volta |
| `esquecimento` | Cada titular tem a sua chave, e os dados pessoais são gravados cifrados. A eliminação apaga o cadastro e destrói a chave; eventos e backup ficam ilegíveis para ele e legíveis para os outros |
| `trilha` | Oito registros encadeados por hash. A aplicação e o dono do banco não conseguem alterar; quem desliga os gatilhos consegue, e a verificação acusa. Reescrever os hashes e cortar o fim só são descobertos com a âncora publicada fora do banco |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL sobe sozinho, sem porta publicada no computador. A chave mestra de teste está no `.env`.

## Roteiro

```bash
docker compose run --rm app ingenuo
docker compose run --rm ferramentas verificar ingenuo
docker compose run --rm app esquecimento
docker compose run --rm ferramentas verificar esquecimento
docker compose run --rm app trilha
docker compose run --rm ferramentas verificar trilha
docker compose run --rm app testes
docker compose down -v
```

A cópia entregue ao titular fica em `saida/<versão>/exportacao.json`, e os backups, em `saida/backups/`.

## Experimente

- Procure o CPF do ex-morador nos dois backups: `grep -c 161.803.398-05 saida/backups/*.sql`.
- Em `laboratorio.ts`, faça o backup incluir o esquema `cofre` e procure a chave do titular 3 no arquivo. Quem tem o backup e a chave mestra recupera o ex-morador.
- Grave o CPF em claro no campo `alvo` de um registro da trilha e rode `esquecimento`: a busca acusa o dado pessoal dentro da própria trilha.
- Mude a âncora para o registro 6 e rode `trilha` de novo. Quais ataques passam a escapar?
