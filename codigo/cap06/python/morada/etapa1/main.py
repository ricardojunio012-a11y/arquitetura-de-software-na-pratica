# Módulo de reservas original, escrito às pressas para a primeira assembleia.
# NAO MEXER sem falar com o Jorge!!! (calcula fim de semana)
import json
import os
import sys
from datetime import date

aprovadas = []
log = []


class Smtp:
    def enviar(self, para, txt):
        log.append("para " + para + ": " + txt)


smtp = Smtp()


def processar_reservas(arq, pasta):
    d = json.load(open(arq, encoding="utf-8"))
    out = []
    hj = date.today()
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
            smtp.enviar(
                u["email"], "Reserva " + p["id"] + " confirmada. Valor: R$ " + vv
            )
        else:
            out.append(
                f"{p['id']};{p['unidade']};{p['espaco']};{p['data']};recusada;{msg}"
            )
            smtp.enviar(u["email"], "Reserva " + p["id"] + " recusada (" + msg + ")")
    os.makedirs(pasta, exist_ok=True)
    open(pasta + "/reservas.txt", "w", encoding="utf-8").write("\n".join(out) + "\n")
    open(pasta + "/emails.txt", "w", encoding="utf-8").write("\n".join(log) + "\n")


processar_reservas(sys.argv[1], sys.argv[2])
