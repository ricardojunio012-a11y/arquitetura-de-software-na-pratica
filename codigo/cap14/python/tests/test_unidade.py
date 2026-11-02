# Testes de unidade: a regra do serviço, sem rede e sem banco. Rodam em milissegundos.
import pytest

from morada.comunicacao.dominio import AvisosEmMemoria, Comunicacao, DadosInvalidosErro


def test_envia_um_aviso_novo():
    comunicacao = Comunicacao(AvisosEmMemoria())
    assert comunicacao.avisar("E-1", "pagamento recebido") == "enviado"


def test_reconhece_um_aviso_repetido():
    comunicacao = Comunicacao(AvisosEmMemoria())
    comunicacao.avisar("E-1", "pagamento recebido")
    assert comunicacao.avisar("E-1", "pagamento recebido") == "repetido"


def test_recusa_um_aviso_sem_texto():
    with pytest.raises(DadosInvalidosErro):
        Comunicacao(AvisosEmMemoria()).avisar("E-1", "")
