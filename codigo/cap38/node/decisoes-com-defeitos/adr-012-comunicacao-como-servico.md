# ADR-012: Extrair só a Comunicação como serviço

- Situação: aceito
- Data: 2024-06-03
- Quem decidiu: Tech Lead da Comunicação, com o CTO

## Contexto

A Comunicação tem picos no dia do vencimento, depende de provedores externos instáveis
e precisa de uma biblioteca que conflita com as do resto do sistema. Os demais módulos
mudam juntos e não têm problema de escala.

## Decisão

Extrair apenas a Comunicação como serviço HTTP, com dados próprios e implantação
independente. O monólito a chama com tempo limite de 2 segundos, até 3 tentativas e o
identificador do aviso como chave de idempotência.

## Alternativas consideradas

- Catorze serviços: custo de operação e de coordenação sem um problema que o pague.
- Tudo no monólito: a biblioteca em conflito e os picos afetariam o resto.

## Consequências

A lentidão dos provedores fica dentro do serviço. Uma queda do serviço ainda segura o
Financeiro por até três tentativas; isolar por completo pede uma fila.
