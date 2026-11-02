# Testes: o módulo de Comunicação é o mesmo dentro e fora do monólito.
from morada.comunicacao import Comunicacao


def test_envia_cada_aviso_uma_vez_so_mesmo_pedido_de_novo():
    comunicacao = Comunicacao()
    assert comunicacao.avisar("E-P-001", "pagamento recebido")
    assert not comunicacao.avisar("E-P-001", "pagamento recebido")
    assert comunicacao.avisar("E-P-002", "pagamento recebido")
