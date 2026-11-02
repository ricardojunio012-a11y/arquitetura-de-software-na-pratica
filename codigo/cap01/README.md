# Capítulo 1: o custo de mudar

Laboratório do capítulo 1 de *Arquitetura de Software na Prática*.

O Morada começa como uma função que calcula a taxa condominial, gera o boleto e envia o e-mail.
Três pedidos de mudança chegam: desconto por pontualidade, Pix e aviso por WhatsApp.
O laboratório aplica as mesmas mudanças em duas versões do código e mede o que cada uma custou.

| Etapa | O que é |
|---|---|
| `etapa1` | O código original: tudo numa função só |
| `etapa2` | O código original com as três mudanças, feitas do jeito mais direto |
| `etapa3` | O código refatorado: cálculo, pagamento, aviso e relatório separados (mesma saída da etapa 1) |
| `etapa4` | O código refatorado com as mesmas três mudanças (mesma saída da etapa 2) |

## Pré-requisito

Docker com Docker Compose. Nenhuma linguagem precisa estar instalada.

## Escolher a linguagem

Edite `.env` e defina `LINGUAGEM` como `node`, `php`, `python` ou `java`.

## Roteiro

```bash
# 1. Gerar as cobranças com o código original
docker compose run --rm app etapa1

# 2. Conferir a saída contra o resultado aprovado (teste de caracterização)
docker compose run --rm ferramentas verificar etapa1

# 3. Repetir para as outras etapas
docker compose run --rm app etapa2
docker compose run --rm ferramentas verificar etapa2
docker compose run --rm app etapa3
docker compose run --rm ferramentas verificar etapa3
docker compose run --rm app etapa4
docker compose run --rm ferramentas verificar etapa4

# 4. Rodar os testes de unidade (só existem para as etapas 3 e 4)
docker compose run --rm app testes

# 5. Medir o tamanho das mudanças (use "todas" para comparar as quatro linguagens)
docker compose run --rm ferramentas medir
docker compose run --rm ferramentas medir todas
```

As saídas ficam em `saida/etapaN/`. O resultado aprovado fica em `esperado/`.

## Estrutura

```
entrada/condominio.json   dados do Residencial Jardins (8 unidades)
esperado/original/        saída aprovada das etapas 1 e 3
esperado/mudancas/        saída aprovada das etapas 2 e 4
ferramentas/              verificação e medição (shell, roda em contêiner)
node/  php/  python/  java/   o mesmo código nas quatro linguagens
```

## Experimente quebrar

- Em `etapa1`, troque `+ 500000` por `+ 0` no cálculo da taxa e rode `verificar etapa1`: o teste de caracterização aponta exatamente as linhas que mudaram.
- Em `etapa3`, faça a mesma troca em `dinheiro` e rode `testes`: agora um teste de unidade falha e diz qual regra quebrou.
- Mude `HOJE` no `.env` para `2026-03-20` e rode `etapa1`: os juros mudam, e o teste de caracterização falha. Por quê? (Resposta no texto do capítulo.)
