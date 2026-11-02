# Uso: python -m morada.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# Monta os objetos e processa os pedidos de reserva na ordem em que chegaram.
import json
import os
import sys
from datetime import date

from morada.aprovacao import AntecedenciaMinima, EspacoLivre, LimitePorMes, UnidadeEmDia
from morada.assinantes import AvisarPortaria, LancarTaxaDeUso, NotificarMorador
from morada.corrida import corrida
from morada.eventos import Barramento
from morada.notificacao import FabricaDeCanais, ProvedorSimulado
from morada.repositorio import RepositorioEmMemoria
from morada.servico import ServicoDeReservas
from morada.tipos import Espaco, Morador, Pedido, Unidade

entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)
espacos = {e["id"]: Espaco(**e) for e in dados["espacos"]}
unidades = {
    u["id"]: Unidade(u["id"], u["emDebito"], Morador(**u["morador"]))
    for u in dados["unidades"]
}


def montar_aprovacao(reservas):
    aprovacao = UnidadeEmDia()
    aprovacao.depois(AntecedenciaMinima(hoje)).depois(EspacoLivre(reservas)).depois(
        LimitePorMes(reservas)
    )
    return aprovacao


reservas = RepositorioEmMemoria()
aprovacao = montar_aprovacao(reservas)

provedor = ProvedorSimulado(dados["falhasSimuladas"], dados["destinosInvalidos"])
notificacoes, taxas, portaria, esperas = [], [], [], []


def esperar(ms: int, quem: str) -> None:
    """Relógio simulado: anota a espera em vez de esperar de verdade."""
    esperas.append(f"{quem}: espera de {ms} ms")


fabrica = FabricaDeCanais(provedor, notificacoes, esperar)
eventos = Barramento()
eventos.assinar("ReservaConfirmada", LancarTaxaDeUso(taxas))
eventos.assinar("ReservaConfirmada", AvisarPortaria(portaria))
eventos.assinar("ReservaConfirmada", NotificarMorador(fabrica))
eventos.assinar("ReservaRecusada", NotificarMorador(fabrica))

servico = ServicoDeReservas(aprovacao, reservas, eventos)
decisoes = []
for p in dados["pedidos"]:
    pedido = Pedido(p["id"], unidades[p["unidade"]], espacos[p["espaco"]], p["data"])
    d = servico.solicitar(pedido)
    resultado = "aprovada" if d.aprovada else f"recusada;{d.motivo}"
    decisoes.append(f"{p['id']};{p['unidade']};{p['espaco']};{p['data']};{resultado}")

# State: cancelar depende do estado em que a reserva está
cancelamentos = []
for id in dados["cancelamentos"]:
    try:
        cancelamentos.append(f"{id};{servico.cancelar(id)}")
    except ValueError as erro:
        cancelamentos.append(f"{id};erro;{erro}")


# Agora a parte difícil: dois pedidos ao mesmo tempo para o mesmo espaço e data
def montar():
    novas = RepositorioEmMemoria()
    return montar_aprovacao(novas), novas


simultaneos = [
    Pedido(p["id"], unidades[p["unidade"]], espacos[p["espaco"]], p["data"])
    for p in dados["pedidosSimultaneos"]
]
concorrencia = corrida(simultaneos, montar)

arquivos = {
    "reservas": decisoes,
    "notificacoes": notificacoes,
    "enviados": provedor.entregues,
    "taxas": taxas,
    "portaria": portaria,
    "falhas": eventos.falhas,
    "esperas": esperas,
    "cancelamentos": cancelamentos,
    "concorrencia": concorrencia,
}
os.makedirs(saida, exist_ok=True)
for nome, linhas in arquivos.items():
    with open(os.path.join(saida, f"{nome}.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
print(f"{len(decisoes)} pedidos processados; saída em {saida}")
