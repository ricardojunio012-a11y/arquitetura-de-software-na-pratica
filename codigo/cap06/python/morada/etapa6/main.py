# Módulo de reservas original, escrito às pressas para a primeira assembleia.
# NAO MEXER sem falar com o Jorge!!! (calcula fim de semana)
# Etapa 6: a regra nova entra no legado sem refatorá-lo. Parte da etapa 2 (só as
# costuras) e muda o mínimo: um broto (limite.py) e um invólucro (registrar_execucao).
import json
import os
import sys
from datetime import date

from morada.etapa6.limite import LimitePorMes

aprovadas = []
log = []


class Smtp:
    def enviar(self, para, txt):
        log.append("para " + para + ": " + txt)


smtp = Smtp()


def processar_reservas_sem_registro(arq, pasta, hj=None, correio=smtp):
    hj = hj or date.today()
    d = json.load(open(arq, encoding="utf-8"))
    out = []
    for p in d["pedidos"]:
        u = [x for x in d["unidades"] if x["id"] == p["unidade"]][0]
        e = [x for x in d["espacos"] if x["id"] == p["espaco"]][0]
        ok = True
        msg = ""
        if u["emDebito"]:
            ok = False
            msg = "débito"
        else:
            n = (date.fromisoformat(p["data"]) - hj).days
            if n < 2:
                ok = False
                msg = "antecedência"
            else:
                for a in aprovadas:
                    if a["espaco"] == p["espaco"] and a["data"] == p["data"]:
                        ok = False
                        msg = "conflito"
                # Broto: a regra nova é só esta chamada; o resto está em limite.py
                if ok and LimitePorMes().atingido(p, aprovadas):
                    ok = False
                    msg = "limite de reservas do mês atingido"
        if ok:
            # calcula o valor
            v = e["taxa"]
            if date.fromisoformat(p["data"]).weekday() == 5:
                v = v + v * 20 // 100  # fim de semana
            if p["convidados"] > 50:
                v = v + 5000
            aprovadas.append(p)
            vv = str(v // 100) + "," + str(v % 100).zfill(2)
            out.append(
                f"{p['id']};{p['unidade']};{p['espaco']};{p['data']};aprovada;{vv}"
            )
            correio.enviar(
                u["email"], "Reserva " + p["id"] + " confirmada. Valor: R$ " + vv
            )
        else:
            out.append(
                f"{p['id']};{p['unidade']};{p['espaco']};{p['data']};recusada;{msg}"
            )
            correio.enviar(u["email"], "Reserva " + p["id"] + " recusada (" + msg + ")")
    os.makedirs(pasta, exist_ok=True)
    open(pasta + "/reservas.txt", "w", encoding="utf-8").write("\n".join(out) + "\n")
    open(pasta + "/emails.txt", "w", encoding="utf-8").write("\n".join(log) + "\n")


# Invólucro (wrap method): o nome antigo passa a chamar o código antigo, intocado, e
# depois o comportamento novo. Quem chamava processar_reservas não percebe a troca.
def processar_reservas(arq, pasta, hj=None, correio=smtp):
    hj = hj or date.today()
    processar_reservas_sem_registro(arq, pasta, hj, correio)
    registrar_execucao(pasta, hj)


# O síndico pediu um registro de cada execução, para a prestação de contas
def registrar_execucao(pasta, hj):
    linhas = open(pasta + "/reservas.txt", encoding="utf-8").read().strip().splitlines()
    aprovadas = len([linha for linha in linhas if ";aprovada;" in linha])
    print(f"registro {hj.isoformat()}: {len(linhas)} pedidos, {aprovadas} aprovados")


# Uso: python -m morada.etapa6.main <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
# Só roda quando o arquivo é o programa, e não quando outro módulo o importa
if __name__ == "__main__":
    entrada, saida, *opcoes = sys.argv[1:]
    hoje = date.fromisoformat(opcoes[1]) if opcoes[:1] == ["--hoje"] else date.today()
    processar_reservas(entrada, saida, hoje)
