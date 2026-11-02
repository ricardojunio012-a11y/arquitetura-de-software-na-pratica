# Quem reage aos eventos de reserva. Cada um faz uma coisa e não conhece os outros.
from morada.eventos import Evento
from morada.notificacao import FabricaDeCanais, Mensagem
from morada.tipos import data_br, reais


class NotificarMorador:
    nome = "NotificarMorador"

    def __init__(self, fabrica: FabricaDeCanais):
        self._fabrica = fabrica

    def tratar(self, evento: Evento) -> None:
        p = evento.pedido
        quando = f"{p.espaco.nome} em {data_br(p.data)}"
        if evento.tipo == "ReservaConfirmada":
            taxa = reais(p.espaco.taxaCentavos)
            mensagem = Mensagem(
                "Reserva confirmada", f"{quando}. Taxa de uso: R$ {taxa}."
            )
        else:
            mensagem = Mensagem("Reserva recusada", f"{quando}: {evento.motivo}.")
        morador = p.unidade.morador
        self._fabrica.para(morador).enviar(morador, mensagem)


class LancarTaxaDeUso:
    nome = "LancarTaxaDeUso"

    def __init__(self, taxas: list[str]):
        self._taxas = taxas

    def tratar(self, evento: Evento) -> None:
        p = evento.pedido
        descricao = f"Taxa de uso: {p.espaco.nome} em {data_br(p.data)}"
        self._taxas.append(f"{p.unidade.id};{descricao};{reais(p.espaco.taxaCentavos)}")


class AvisarPortaria:
    nome = "AvisarPortaria"

    def __init__(self, lista: list[str]):
        self._lista = lista

    def tratar(self, evento: Evento) -> None:
        p = evento.pedido
        quem = f"{p.unidade.id} {p.unidade.morador.nome}"
        self._lista.append(f"{data_br(p.data)} {p.espaco.nome}: {quem}")
