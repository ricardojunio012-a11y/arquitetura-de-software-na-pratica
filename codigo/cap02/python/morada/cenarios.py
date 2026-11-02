# Cenários de qualidade executáveis: geram carga sintética, medem o que é nosso,
# estimam o que depende de terceiros e comparam o total com a meta.
import time
from dataclasses import dataclass
from datetime import date

from morada.cobranca.calculo import calcular_cobranca
from morada.cobranca.competencia import competencia_de
from morada.cobranca.notificacao import Aviso, formatar_email
from morada.cobranca.pagamento import Boleto


@dataclass(frozen=True)
class Resultado:
    cenario: dict
    cobrancas: int
    segundos_calculo: float  # medido
    segundos_registro: float  # estimado
    bytes_avisos: int
    passou: bool


# Condomínio sintético e determinístico: a mesma carga em qualquer linguagem
def condominio_sintetico(i: int, unidades: int) -> dict:
    lista = []
    for k in range(1, unidades + 1):
        lista.append(
            {
                "id": f"U-{k}",
                "fracaoMilionesimos": 1000000 // unidades,
                "morador": {
                    "nome": f"Morador {k}",
                    "email": f"morador{k}@exemplo.com",
                    "canal": "email",
                },
                "meioPagamento": "boleto",
                "debitoAnterior": (
                    {"valorCentavos": 50000, "vencimento": "2026-02-10"}
                    if k % 7 == 0
                    else None
                ),
            }
        )
    despesas = 3000000 + (i % 50) * 10000
    return {
        "condominio": {
            "id": f"cond-{i}",
            "nome": f"Condomínio {i}",
            "despesasDoMesCentavos": despesas,
        },
        "unidades": lista,
    }


# A medida de resposta do cenário: terminar dentro do limite
def avaliar(segundos: float, limite_segundos: float) -> bool:
    return segundos <= limite_segundos


def executar(cenario: dict, hoje: date) -> Resultado:
    boleto = Boleto()
    competencia = competencia_de(hoje)
    cobrancas = 0
    bytes_avisos = 0
    inicio = time.perf_counter()
    for i in range(1, cenario["condominios"] + 1):
        dados = condominio_sintetico(i, cenario["unidadesPorCondominio"])
        condominio = dados["condominio"]
        for unidade in dados["unidades"]:
            cobranca = calcular_cobranca(
                condominio["despesasDoMesCentavos"], unidade, hoje
            )
            codigo = boleto.gerar_codigo(condominio["id"], competencia, cobranca)
            aviso = Aviso(
                condominio["nome"], competencia, cobranca, boleto.nome, codigo
            )
            bytes_avisos += len(formatar_email(aviso).encode("utf-8"))
            cobrancas += 1
    segundos_calculo = time.perf_counter() - inicio
    # O registro dos boletos depende do banco emissor: estimamos pela capacidade dele
    segundos_registro = cobrancas / cenario["registrosPorSegundo"]
    total = segundos_calculo + segundos_registro
    return Resultado(
        cenario,
        cobrancas,
        segundos_calculo,
        segundos_registro,
        bytes_avisos,
        avaliar(total, cenario["limiteSegundos"]),
    )
