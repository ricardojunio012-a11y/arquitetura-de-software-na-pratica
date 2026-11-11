# Testes do contrato. O primeiro é o que quebra o build quando alguém muda
# openapi/v1.yaml de um jeito que os clientes atuais não aguentam.
from morada.contrato.compatibilidade import comparar_contratos
from morada.contrato.openapi import ler_contrato
from morada.contrato.validar import validar_resposta

atual = ler_contrato("/dados/openapi/v1.yaml")
publicado = ler_contrato("/dados/openapi/publicado/v1.yaml")


def test_o_contrato_atual_e_compativel_com_o_publicado():
    quebras = [m for m in comparar_contratos(publicado, atual) if not m.compativel]
    assert quebras == []


def test_renomear_um_campo_da_resposta_e_incompativel():
    proposta = ler_contrato("/dados/entrada/propostas/b-renomear.yaml")
    quebras = [
        m.texto for m in comparar_contratos(publicado, proposta) if not m.compativel
    ]
    assert quebras == [
        "GET /v1/condominios/{condominio}/cobrancas 200: "
        "campo removido: dados[].valorCentavos"
    ]


def test_uma_resposta_com_o_tipo_errado_nao_passa_na_conferencia():
    corpo = {
        "dados": [
            {
                "id": "CB-02",
                "unidade": "102",
                "vencimento": "2026-10-10",
                "valorCentavos": "450,00",
                "situacao": "aberta",
            }
        ],
        "proximo": None,
    }
    caminho = "/v1/condominios/C-01/cobrancas"
    erros = validar_resposta(atual, "GET", caminho, 200, "application/json", corpo)
    assert erros == [
        "GET /v1/condominios/{condominio}/cobrancas 200: "
        "$.dados[0].valorCentavos: esperado integer, recebido string"
    ]
