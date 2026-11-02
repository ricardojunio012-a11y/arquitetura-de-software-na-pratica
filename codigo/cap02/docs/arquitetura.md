# Documentação de arquitetura do Morada (arc42 resumido)

Este documento segue as seções do modelo arc42 (https://arc42.org), na forma enxuta que uma empresa
pequena consegue manter atualizada. Os diagramas estão em `c4/workspace.dsl`.

## 1. Introdução e objetivos

O Morada calcula e envia a cobrança mensal de condomínios, com boleto ou Pix, e avisa os moradores
por e-mail ou WhatsApp. Os três objetivos de qualidade mais importantes, em ordem:

1. **Correção do cálculo:** a cobrança segue a convenção do condomínio e a lei (multa de até 2%).
2. **Desempenho no dia 1º:** boletos disponíveis em até 4 horas (cenários DES-01 e DES-02).
3. **Isolamento entre condomínios:** nenhum condomínio vê dados de outro (SEG-01).

Partes interessadas: síndicos, moradores, administradoras, os dois sócios e o time de desenvolvimento.

## 2. Restrições

- Time de duas pessoas; orçamento de infraestrutura de até R$ 1.500 por mês.
- Integração com os bancos pelo padrão que cada um oferece (API ou arquivo CNAB).
- Lei Geral de Proteção de Dados (Lei nº 13.709/2018) para dados de moradores.

## 3. Contexto e escopo

Ver a visão de contexto no Structurizr (`docker compose up -d structurizr`, visão "Contexto").
O Morada conversa com o banco emissor, o provedor de Pix, o provedor de e-mail e o WhatsApp Business.

## 4. Estratégia de solução

Uma aplicação única (monólito), com a cobrança organizada em módulos: cálculo, pagamento,
notificação, relatório e orquestração (capítulo 1). Meio de pagamento e canal de aviso ficam atrás
de interfaces, porque são as partes que mais mudam.

## 5. Visão de blocos

Ver as visões "Conteineres" e "Componentes" no Structurizr.

## 6. Visão de execução

Geração mensal: o agendador dispara a cobrança no dia 1º; para cada unidade, calcula, registra o
boleto no banco emissor, grava a cobrança e envia o aviso.

## 7. Visão de implantação

Um servidor de aplicação e um banco PostgreSQL gerenciado, na mesma região de nuvem.

## 8. Conceitos transversais

Valores em centavos inteiros; datas em UTC; arredondamento meio para cima; dados pessoais
mínimos nos logs.

## 9. Decisões de arquitetura

- ADR-001: separar as regras de cobrança dos meios de pagamento e dos canais de aviso (capítulo 1).

## 10. Requisitos de qualidade

Ver `cenarios-de-qualidade.md`.

## 11. Riscos e dívidas técnicas

- **Registro de boletos no dia 1º (alto):** com 30.000 condomínios, o registro um a um levaria
  6 h 40 min (cenário DES-02). Alternativas em estudo: registro em lote por arquivo, registro
  distribuído ao longo do mês, Pix como meio principal.
- **Ponto único de falha (médio):** um único servidor de aplicação.

## 12. Glossário

| Termo | Significado |
|---|---|
| Fração ideal | Parte do condomínio que pertence a cada unidade; base do rateio das despesas |
| Fundo de reserva | Percentual sobre a taxa, definido na convenção, para despesas extraordinárias |
| Banco emissor | Banco que registra o boleto e informa o pagamento |
| CNAB | Padrão de arquivos de troca de informações entre empresas e bancos |
