# ADR-010: Morada como monólito modular, com fronteiras verificadas

- Situação: aceito
- Data: 2024-03-11
- Quem decidiu: Tech Leads de Reservas e Financeiro, com o CTO

## Contexto

Reservas passou a ler a tabela de cobranças para aplicar a regra de inadimplência e
reimplementou a regra sem o parcelamento. Uma moradora em dia foi impedida de reservar,
e uma mudança de coluna no Financeiro quebrou as reservas (capítulo 10).

## Decisão

O Morada continua uma única unidade de implantação, organizada em módulos que
correspondem aos contextos delimitados. Cada módulo tem API pública, interior privado e
dados próprios, num esquema do banco com o nome do módulo. Nenhum módulo lê nem grava a
tabela de outro; quem precisa de um dado chama a API do dono.

## Alternativas consideradas

- Microsserviços: resolveriam a fronteira com a rede, a um custo que o time de oito
  pessoas não pagaria (capítulo 12).
- Só revisão de código: depende de atenção humana, que falhou no incidente.

## Consequências

Mudanças internas num módulo deixam de quebrar os outros. Consultas que eram um JOIN
entre módulos viram composição na aplicação.

## Quando revisitar

Se um módulo passar a ter necessidades de escala ou de implantação muito diferentes,
ou se as verificações acusarem violações frequentes entre os mesmos módulos.
