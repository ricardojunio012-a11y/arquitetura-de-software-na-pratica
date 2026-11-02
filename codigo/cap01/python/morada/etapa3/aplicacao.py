# Orquestra a geração mensal: calcula, gera o pagamento, registra e avisa.
from datetime import date

from morada.etapa3.calculo import calcular_cobranca
from morada.etapa3.competencia import competencia_de
from morada.etapa3.notificacao import Aviso, Notificador
from morada.etapa3.pagamento import MeioDePagamento
from morada.etapa3.relatorio import RelatorioDeCobrancas


def gerar_cobranca_mensal(
    dados: dict,
    hoje: date,
    pagamento: MeioDePagamento,
    notificador: Notificador,
) -> RelatorioDeCobrancas:
    condominio = dados["condominio"]
    competencia = competencia_de(hoje)
    relatorio = RelatorioDeCobrancas(condominio["nome"], competencia)
    for unidade in dados["unidades"]:
        cobranca = calcular_cobranca(condominio["despesasDoMesCentavos"], unidade, hoje)
        codigo = pagamento.gerar_codigo(condominio["id"], competencia, cobranca)
        relatorio.adicionar(cobranca, codigo)
        notificador.notificar(
            Aviso(condominio["nome"], competencia, cobranca, pagamento.nome, codigo)
        )
    return relatorio
