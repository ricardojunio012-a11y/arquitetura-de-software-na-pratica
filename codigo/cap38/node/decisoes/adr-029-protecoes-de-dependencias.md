# ADR-029: Tempo limite, anteparo e disjuntor em toda dependência externa

- Situação: aceito
- Data: 2025-07-07
- Quem decidiu: Tech Leads de Financeiro e Comunicação e time de plataforma

## Contexto

Uma lentidão do gateway de pagamento no dia 5 parou o Morada inteiro, e a carga das
novas tentativas manteve o sistema lento por quinze minutos depois da volta do gateway.

## Decisão

Toda chamada a uma dependência externa passa por uma biblioteca comum com tempo limite,
anteparo e disjuntor. Novas tentativas só na camada mais próxima da dependência, com
espera exponencial, variação e orçamento de 10%.

## Alternativas consideradas

- Cada time escolhe a sua biblioteca: parâmetros divergentes e nenhuma visão comum.
- Só tempo limite: protege o resto, mas continua mandando carga a quem caiu.

## Consequências

A falha de uma dependência fica contida nela. Alguns pagamentos que dariam certo são
recusados com o disjuntor aberto, e os parâmetros precisam ser mantidos.

## Quando revisitar

Se a manutenção manual dos parâmetros ficar pesada, ou se uma dependência crítica
ganhar um caminho alternativo.
