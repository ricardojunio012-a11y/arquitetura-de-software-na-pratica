# Capítulo 36: arquitetura de segurança

Laboratório do capítulo 36 de *Arquitetura de Software na Prática*.

Um Keycloak 26.4 de verdade emite tokens OpenID Connect para os papéis do Morada (síndico, morador, porteiro e administradora). A API de boletos confere o token e o papel, mas, na primeira versão, não confere se o boleto pedido pertence a quem pede: uma moradora autenticada lê os boletos de outros condomínios só trocando o número na URL (IDOR, ou BOLA, o primeiro item do OWASP API Security Top 10 2023). A versão corrigida confere a relação de cada usuário com cada boleto, num pequeno modelo de relações no estilo do Zanzibar. A terceira versão tira os segredos do código: um "cofre" gera os segredos num volume do Docker, o Keycloak e a aplicação os leem de lá, e o segredo da integração é trocado pela API de administração do Keycloak.

| Versão | O que faz |
|---|---|
| `idor` | Faz login das cinco pessoas, testa tokens forjados, o papel (RBAC) e a enumeração de boletos contra a API vulnerável |
| `corrigido` | O mesmo roteiro contra a API com autorização por objeto |
| `segredos` | Varre o código em busca de segredos, usa o segredo do cofre na integração e troca o segredo |

## Pré-requisito

Docker com Docker Compose. Nenhuma porta é publicada no computador: tudo conversa pela rede interna do Compose. A primeira subida do Keycloak leva de um a quatro minutos, conforme a máquina.

## Roteiro

```bash
docker compose run --rm app idor
docker compose run --rm ferramentas verificar idor
docker compose run --rm app corrigido
docker compose run --rm ferramentas verificar corrigido
docker compose run --rm app segredos
docker compose run --rm ferramentas verificar segredos
docker compose run --rm app testes
docker compose down -v
```

O `down -v` apaga também o volume com os segredos; a próxima subida gera segredos novos.

## Experimente

- Em `src/api.ts`, troque a resposta 404 de um boleto alheio por 403. O que um atacante aprende com a diferença?
- Em `src/dados.ts`, acrescente a tupla que torna a porteira `carla` leitora dos boletos do C-01 e rode `corrigido`. Por que ela continua sem ler nada?
- Em `src/identidade.ts`, tire a conferência da audiência e escreva um teste em que um token emitido para outra API é aceito.
- Rode `segredos` duas vezes seguidas e explique por que o resultado é o mesmo, embora o segredo mude a cada vez.
- Rode `docker compose exec keycloak cat /proc/1/environ | tr '\0' '\n'` e veja onde os segredos aparecem no contêiner do Keycloak. O que isso diz sobre segredos em variáveis de ambiente?
