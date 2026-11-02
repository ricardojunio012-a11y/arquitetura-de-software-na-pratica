# Testes: os assinantes são idempotentes e independentes uns dos outros.
from morada.eventos import evento_de
from morada.modulos.comunicacao import Comunicacao
from morada.modulos.reservas import Reservas

RESERVA = {"reserva": "R-1", "unidade": "A-1", "espaco": "salao", "data": "2026-03-14"}
EVENTO = evento_de(
    {"pagamento": "P-1", "unidade": "A-1", "reserva": "R-1", "valorCentavos": 18000}
)


def test_confirmam_a_reserva_e_avisam_o_morador():
    reservas = Reservas([RESERVA])
    comunicacao = Comunicacao()
    reservas.ao_confirmar_pagamento(EVENTO)
    comunicacao.ao_confirmar_pagamento(EVENTO)
    assert reservas.linhas() == ["R-1;A-1;salao;2026-03-14;confirmada"]
    assert len(comunicacao.avisos) == 1


def test_ignoram_o_mesmo_evento_entregue_duas_vezes():
    comunicacao = Comunicacao()
    comunicacao.ao_confirmar_pagamento(EVENTO)
    comunicacao.ao_confirmar_pagamento(EVENTO)
    assert len(comunicacao.avisos) == 1
    assert comunicacao.registro[1] == "comunicacao ignorou E-P-1 (repetido)"
