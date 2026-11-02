# Capítulo 3: acoplamento, coesão e modularidade

Laboratório do capítulo 3 de *Arquitetura de Software na Prática*.

O financeiro do Morada gera três relatórios: cobranças, inadimplência e prestação de contas. O
laboratório traz duas versões do mesmo código, com a mesma saída:

| Versão | Como está organizada |
|---|---|
| `antes` | Por tipo técnico (`config`, `util`, `servicos`, `relatorios`), com configuração global, um parâmetro que decide o que a função faz, um módulo que altera a lista de outro e um ciclo de dependências |
| `depois` | Por responsabilidade (`cobranca`, `inadimplencia`, `prestacao`, `compartilhado`), com interface pública em cada módulo, dados imutáveis e nenhum ciclo |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`).

## Roteiro

```bash
# Gerar os relatórios com cada versão e conferir contra o resultado aprovado
docker compose run --rm app antes
docker compose run --rm ferramentas verificar antes
docker compose run --rm app depois
docker compose run --rm ferramentas verificar depois

# Medir acoplamento aferente (Ca), eferente (Ce), instabilidade (I) e ciclos
docker compose run --rm ferramentas medir
docker compose run --rm ferramentas medir todas

# Testes: um deles mostra o acoplamento escondido da versão antes
docker compose run --rm app testes
```

## Experimente quebrar

- No `main` da versão `antes`, gere a inadimplência antes das cobranças (troque a ordem da lista
  de relatórios), reconstrua a imagem com `docker compose build app` e rode `antes` e
  `verificar antes`. A ordem das cobranças muda. Faça o mesmo na versão `depois`: nada muda.
- Na versão `depois`, tente usar as regras internas da cobrança (`regras`) a partir do módulo de
  inadimplência e rode `medir` de novo. Em Java, o compilador recusa, porque a classe não é pública.
