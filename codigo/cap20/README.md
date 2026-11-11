# Capítulo 20: arquitetura de sistemas com IA

Laboratório do capítulo 20 de *Arquitetura de Software na Prática*.

O Assistente do síndico responde dúvidas a partir dos regimentos e das atas de três condomínios, indexados no pgvector (RAG). A versão protegida busca só no condomínio de quem pergunta, descarta trechos com sinais de injeção de prompt e trechos pouco relevantes, usa cache por condomínio e respeita um orçamento diário de tokens por condomínio. Uma suíte de avaliação compara a versão ingênua com a protegida.

O modelo de linguagem fica atrás da interface `Modelo` (`node/src/modelo.ts`). O laboratório usa um modelo extrativo determinístico, para rodar em qualquer máquina e dar sempre a mesma saída; um modelo de verdade entra implementando a mesma interface.

| Versão | O que faz |
|---|---|
| `assistente` | Responde às perguntas de `entrada/conversa.json` e mostra a origem de cada resposta (modelo, cache ou limite) e o gasto por condomínio |
| `avaliacao` | Roda a suíte de `entrada/avaliacao.json` contra o assistente ingênuo e o protegido |
| `variacao` | A parte difícil: roda a suíte cinco vezes contra um modelo que varia (sorteio com semente fixa) e confere pelo texto e pelo conteúdo |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL com pgvector sobe sozinho.

## Roteiro

```bash
docker compose run --rm app assistente
docker compose run --rm ferramentas verificar assistente
docker compose run --rm app avaliacao
docker compose run --rm ferramentas verificar avaliacao
docker compose run --rm app variacao
docker compose run --rm ferramentas verificar variacao
docker compose run --rm app testes
```

## Experimente

- Tire o condomínio da chave do cache e veja a resposta de um condomínio servir para outro.
- Escreva uma injeção nova num documento e veja se a guarda pega.
- Acrescente à suíte a pergunta "Até que horas posso fazer barulho?" e explique o resultado.
- Na versão `variacao`, acrescente sementes ou mude a chance de deslize em `node/src/modelo-variavel.ts` e veja a taxa de acerto mudar.
