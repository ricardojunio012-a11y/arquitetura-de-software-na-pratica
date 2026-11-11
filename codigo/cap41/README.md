# Capítulo 41: modernização de legado e arquitetura evolutiva

Laboratório do capítulo 41 de *Arquitetura de Software na Prática*.

O Morada comprou a Beta, uma concorrente com um sistema de 2009. O laboratório põe um proxy na frente da API do legado, traduz o modelo antigo numa camada anticorrupção, migra os dados de um cliente (o Residencial Acácias) com conferência, roda o legado e o Morada em paralelo comparando as respostas e, por fim, desliga a primeira parte do legado.

Tudo roda num só contêiner: o legado (SQLite, pelo `node:sqlite`), o Morada (PostgreSQL embutido, PGlite), a camada de compatibilidade e o proxy, cada um no seu servidor HTTP, em portas internas. Nenhuma porta é publicada no host. O tempo é simulado (um dia por vez, a partir de 1º de novembro de 2026) e o uso do aplicativo é sorteado com semente fixa. Por isso o resultado é o mesmo a cada execução.

| Versão | O que faz |
|---|---|
| `inventario` | O proxy só observa: 30 dias de uso, contados por rota |
| `traducao` | A camada anticorrupção traduz o Acácias, com exemplos de antes e depois |
| `migracao` | Cópia ingênua, migração pela camada e a mesma migração repetida, com conferência |
| `paralelo` | Duas rodadas de execução paralela, antes e depois das correções |
| `desligamento` | O Acácias passa para o Morada, a rota sem uso é desligada e o legado perde o Acácias |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. A primeira subida do PGlite pode levar de 10 a 30 segundos.

## Roteiro

```bash
docker compose run --rm app inventario
docker compose run --rm ferramentas verificar inventario
docker compose run --rm app traducao
docker compose run --rm ferramentas verificar traducao
docker compose run --rm app migracao
docker compose run --rm ferramentas verificar migracao
docker compose run --rm app paralelo
docker compose run --rm ferramentas verificar paralelo
docker compose run --rm app desligamento
docker compose run --rm ferramentas verificar desligamento
docker compose run --rm app testes
```

## Experimente

- Em `legado/banco.ts`, troque a observação do síndico por "Sindico - isento" e rode `paralelo`. A regra da camada v2 continua achando a isenção? E se a observação disser "ex-síndico"?
- Em `versoes/paralelo.ts`, tire o vínculo de G-10 das regras v2. O que a rodada 2 mostra, e o que o `desligamento` diz na lista de conferência?
- Em `proxy.ts`, aceite como arredondamento diferenças de até 50 centavos. Que divergência real passaria escondida?
- Em `versoes/desligamento.ts`, mova a conferência para depois dos 30 dias de uso. Por que ela falha, se nada deu errado?
