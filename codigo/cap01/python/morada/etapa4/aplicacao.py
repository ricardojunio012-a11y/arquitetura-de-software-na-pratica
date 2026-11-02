# Orquestra a geração mensal: calcula, gera o pagamento, registra e avisa.
from datetime import date

from morada.etapa4.calculo import calcular_cobranca
from morada.etapa4.competencia import competencia_de
from morada.etapa4.notificacao import Aviso, Notificador
from morada.etapa4.pagamento import MeioDePagamento
from morada.etapa4.relatorio import RelatorioDeCobrancas


def gerar_cobranca_mensal(
    dados: dict,
    hoje: date,
    meios_de_pagamento: dict[str, MeioDePagamento],
    notificadores: dict[str, Notificador],
) -> RelatorioDeCobrancas:
    condominio = dados["condominio"]
    competencia = competencia_de(hoje)
    relatorio = RelatorioDeCobrancas(condominio["nome"], competencia)
    for unidade in dados["unidades"]:
        pagamento = meios_de_pagamento[unidade["meioPagamento"]]
        notificador = notificadores[unidade["morador"]["canal"]]
        cobranca = calcular_cobranca(condominio["despesasDoMesCentavos"], unidade, hoje)
        codigo = pagamento.gerar_codigo(condominio["id"], competencia, cobranca)
        relatorio.adicionar(cobranca, codigo)
        notificador.notificar(
            Aviso(condominio["nome"], competencia, cobranca, pagamento.nome, codigo)
        )
    return relatorio
