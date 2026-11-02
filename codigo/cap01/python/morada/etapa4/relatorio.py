# O relatório de cobranças do mês, para a administradora.
from morada.etapa4.calculo import Cobranca
from morada.etapa4.competencia import Competencia
from morada.etapa4.dinheiro import reais


class RelatorioDeCobrancas:
    def __init__(self, condominio: str, competencia: Competencia):
        self._linhas = [
            f"# Cobranças {competencia.rotulo} - {condominio} - "
            f"vencimento {competencia.vencimento}",
            "unidade;morador;taxa;fundo;debito;multa;juros;total;"
            "total_ate_05;pagamento",
        ]

    def adicionar(self, c: Cobranca, codigo_de_pagamento: str) -> None:
        valores = [
            reais(v) for v in (c.taxa, c.fundo, c.debito, c.multa, c.juros, c.total)
        ]
        com_desconto = "-" if c.total_ate_05 is None else reais(c.total_ate_05)
        self._linhas.append(
            ";".join(
                [
                    c.unidade["id"],
                    c.unidade["morador"]["nome"],
                    *valores,
                    com_desconto,
                    codigo_de_pagamento,
                ]
            )
        )

    def salvar(self, arquivo: str) -> None:
        with open(arquivo, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(self._linhas) + "\n")
