# Etapa 7: a figueira estranguladora. Uma fachada recebe todos os pedidos e decide,
# espaço por espaço, quem responde: o código velho (etapa 6) ou o novo (novo.py).
# Uso: python -m morada.etapa7.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
import json
import os
import sys
import tempfile
from datetime import date

from morada.etapa5.reservas import avisos, relatorio
from morada.etapa6.main import processar_reservas
from morada.etapa7.novo import decidir

# A rota de cada espaço. "experimento": o velho responde e o novo roda junto, só
# para comparar. A cada fatia validada, um espaço muda de rota; no fim, o velho sai.
ROTAS = {"salao": "novo", "churrasqueira": "experimento"}


def rota_de(pedido):
    return ROTAS.get(pedido["espaco"], "velho")


class CorreioQueGuarda:
    def __init__(self):
        self.enviados = []

    def enviar(self, para, texto):
        self.enviados.append(f"para {para}: {texto}")


# O velho não foi feito para ser chamado assim: recebe um arquivo e grava outro.
# A fachada se adapta a ele, pelas costuras da etapa 2, sem mudar uma linha dele.
def velho(dados, hoje):
    pasta = tempfile.mkdtemp(prefix="velho-")
    arquivo = os.path.join(pasta, "pedidos.json")
    with open(arquivo, "w", encoding="utf-8") as f:
        json.dump(dados, f)
    correio = CorreioQueGuarda()
    processar_reservas(arquivo, pasta, hoje, correio)
    with open(os.path.join(pasta, "reservas.txt"), encoding="utf-8") as f:
        linhas = f.read().splitlines()
    return {
        p["id"]: (linha, email)
        for p, linha, email in zip(dados["pedidos"], linhas, correio.enviados)
    }


def novo(dados, hoje):
    decisoes = decidir(dados, hoje)
    emails = [f"para {para}: {texto}" for para, texto in avisos(decisoes)]
    return {
        d.pedido["id"]: (linha, email)
        for d, linha, email in zip(decisoes, relatorio(decisoes), emails)
    }


entrada, saida, *opcoes = sys.argv[1:]
hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
with open(entrada, encoding="utf-8") as f:
    dados = json.load(f)


def so(*rotas):
    return {**dados, "pedidos": [p for p in dados["pedidos"] if rota_de(p) in rotas]}


do_velho = velho(so("velho", "experimento"), hoje)
do_novo = novo(so("novo", "experimento"), hoje)

# O experimento compara as duas respostas, mas quem responde ao morador é o velho
comparados = [p["id"] for p in dados["pedidos"] if rota_de(p) == "experimento"]
divergentes = [i for i in comparados if do_velho[i] != do_novo[i]]
print(
    f"experimento: {len(comparados)} pedidos comparados, {len(divergentes)} com divergência"
)
for i in divergentes:
    print(f"  {i}: velho {do_velho[i][0]} | novo {do_novo[i][0]}")

respostas = [
    (do_novo if rota_de(p) == "novo" else do_velho)[p["id"]] for p in dados["pedidos"]
]
os.makedirs(saida, exist_ok=True)
for nome, coluna in (("reservas", 0), ("emails", 1)):
    with open(os.path.join(saida, f"{nome}.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(r[coluna] for r in respostas) + "\n")
