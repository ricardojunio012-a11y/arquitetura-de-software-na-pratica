# Capítulo 39: dívida técnica, pontos quentes e acoplamento de mudança

Laboratório do capítulo 39 de *Arquitetura de Software na Prática*.

O laboratório cria, dentro do contêiner, um repositório git de verdade com 18 meses de histórico simulado do Morada (janeiro de 2025 a junho de 2026): 389 commits de 8 pessoas, com autores e datas fixos, gerados por um sorteio com semente fixa e gravados com `git fast-import`. Nesse histórico há um módulo quente e complexo (a cobrança) e um acoplamento de mudança escondido: a regra de reservas lê uma tabela do Financeiro sem importar nada dele. Uma ferramenta em TypeScript lê o histórico com `git log --numstat` e calcula os pontos quentes (frequência de mudança × complexidade pela indentação), os pares de arquivos que mudam juntos e o caso de negócio para pagar a maior dívida.

| Versão | O que faz |
|---|---|
| `historico` | Gera o repositório e mostra o resumo e os últimos commits |
| `pontos-quentes` | Lista os arquivos por prioridade: revisões × complexidade |
| `acoplamento` | Lista os pares que mudam juntos e diz se o código mostra a ligação (import) |
| `caso` | Calcula os juros do maior ponto quente e compara três opções em 12 e 24 meses |

As horas de cada mudança vêm de um trailer `Horas:` nos commits, que faz o papel do apontamento de horas das tarefas. As premissas de custo (R$ 150 por hora, R$ 1.200 por pessoa-dia, esforço do pagamento, preço e adesão da novidade) ficam em `node/premissas.json`.

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript e não sobe outros serviços.

## Roteiro

```bash
docker compose run --rm app historico
docker compose run --rm ferramentas verificar historico
docker compose run --rm app pontos-quentes
docker compose run --rm ferramentas verificar pontos-quentes
docker compose run --rm app acoplamento
docker compose run --rm ferramentas verificar acoplamento
docker compose run --rm app caso
docker compose run --rm ferramentas verificar caso
docker compose run --rm app testes
```

## No seu repositório

A mesma análise roda em qualquer repositório git, montado só para leitura (no Git Bash, prefixe com `MSYS_NO_PATHCONV=1`):

```bash
docker compose run --rm -v /caminho/do/repositorio:/repo:ro app analisar /repo
```

## Experimente

- Mude `MAXIMO_DE_ARQUIVOS` em `metricas.ts` para 100 e veja o que o commit de formatação faz com as revisões.
- Em `historico.ts`, baixe de 0.8 para 0.3 a chance de a regra de reservas mudar junto com a situação financeira.
- Em `premissas.json`, mude a redução esperada dos juros e o esforço do pagamento até a opção "pagar antes" ficar mais barata em 24 meses.
