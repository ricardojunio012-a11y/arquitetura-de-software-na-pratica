# Capítulo 8: estilos arquiteturais

Laboratório do capítulo 8 de *Arquitetura de Software na Prática*.

Dois estilos lado a lado: uma API de reservas em camadas e um núcleo de cobrança com plugins por banco (microkernel).

| Versão | O que faz |
|---|---|
| `camadas` | API de reservas em camadas (apresentação, aplicação, domínio, dados). As requisições de `entrada/requisicoes.json` são enviadas pelo cliente de testes do framework |
| `plugins` | Núcleo de cobrança que carrega, sem reconstruir a imagem, um plugin por banco a partir da pasta de plugins da linguagem |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`).

## Roteiro

```bash
docker compose run --rm app camadas
docker compose run --rm ferramentas verificar camadas
docker compose run --rm app plugins
docker compose run --rm ferramentas verificar plugins
docker compose run --rm app testes
```

## Experimente

- Crie um plugin da Caixa copiando o do Banco Alfa e rode `plugins` de novo, sem `docker compose build`.
- Faça o plugin Beta lançar um erro e observe que as linhas dos outros bancos continuam corretas.
- Acrescente à reserva confirmada quantos dias faltam para a data e conte quantas camadas mudaram.
