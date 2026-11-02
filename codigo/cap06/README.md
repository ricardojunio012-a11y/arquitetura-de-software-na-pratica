# Capítulo 6: refatoração e código legado

Laboratório do capítulo 6 de *Arquitetura de Software na Prática*.

O módulo de reservas original do Morada, escrito às pressas e sem testes, passa por sete etapas.
Da etapa 2 em diante, todas geram exatamente a mesma saída:

| Etapa | O que muda |
|---|---|
| `etapa1` | O original: lê o relógio do sistema, usa estado global e manda e-mails por um cliente global. Não dá para testar |
| `etapa2` | Só os pontos de costura: a data de hoje e o envio de e-mails entram por parâmetro, com o comportamento antigo como padrão |
| `etapa3` | Nomes e funções: renomear variáveis e extrair funções |
| `etapa4` | Condicionais e constantes: cláusulas de guarda, constantes com nome, laço trocado por pipeline |
| `etapa5` | Fases e estado: decidir, formatar e gravar separados; nenhum estado global |
| `etapa6` | A regra nova no legado, sem refatorá-lo: parte da etapa 2 e acrescenta o limite por mês como broto (`limite`) e um registro de cada execução como invólucro |
| `etapa7` | O estrangulador: uma fachada manda o salão para o código novo (etapa 5 mais o broto) e roda a churrasqueira nos dois, em experimento, comparando as respostas |

O comportamento atual, inclusive o domingo sem acréscimo de fim de semana, é protegido por testes de
caracterização (golden master) contra a pasta `esperado/`.

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`).

## Roteiro

```bash
# O original: com o relógio de hoje, todos os pedidos de março são recusados
docker compose run --rm app etapa1
docker compose run --rm ferramentas verificar etapa1

# Da etapa 2 em diante, a saída é idêntica ao resultado aprovado
docker compose run --rm app etapa2
docker compose run --rm ferramentas verificar etapa2

# Testes de caracterização
docker compose run --rm app testes

# A regra nova com broto e invólucro, e o estrangulador com experimento
docker compose run --rm app etapa6
docker compose run --rm ferramentas verificar etapa6
docker compose run --rm app etapa7
docker compose run --rm ferramentas verificar etapa7

# Tamanho de cada passo de refatoração (a última linha compara a etapa 2 com a 6)
docker compose run --rm ferramentas medir
docker compose run --rm ferramentas medir todas
```

## Experimente

- Acrescente à entrada um pedido do salão para a A-101 em 2026-03-28 e rode a etapa 6: ele é
  recusado pelo limite do mês. Desfaça a mudança.
- Inverta as rotas na etapa 7 (salão em experimento, churrasqueira no novo): a saída não muda.
- Corrija o domingo na etapa 5 (troque `ehSabado` por `ehFimDeSemana`) e rode a etapa 7 antes de
  qualquer outra coisa: o experimento acusa a divergência da R-05 (100,00 no velho, 110,00 no novo),
  e a verificação da etapa 7 continua passando, porque quem respondeu foi o velho. Depois, veja os
  testes falharem, atualize o teste e o resultado aprovado e registre a correção num commit separado.
