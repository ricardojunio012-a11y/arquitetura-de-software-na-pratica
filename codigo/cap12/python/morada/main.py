# Uso: python -m morada.main monolito|servico <pasta-de-saída>
# Envia um aviso por pagamento confirmado: pelo módulo, no mesmo processo, ou pelo
# serviço extraído, pela rede. Conta o que aconteceu e mede o tempo de cada aviso.
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from morada.comunicacao import Comunicacao

versao, saida = sys.argv[1], Path(sys.argv[2])
avisos = json.loads(Path("/dados/entrada/carga.json").read_text("utf-8"))["avisos"]
url = os.environ.get("COMUNICACAO_URL")
conta = dict(enviados=0, chamadas=0, erros=0, novas=0, repetidos=0, perdidos=0)


def post(endereco: str, corpo: dict) -> tuple[int, dict]:
    pedido = urllib.request.Request(
        endereco,
        data=json.dumps(corpo).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(pedido, timeout=2) as resposta:
            return resposta.status, json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        return erro.code, {}
    except OSError:
        return 0, {}


# Pela rede, cada chamada pode falhar: tenta até 3 vezes, sempre com o mesmo id
def enviar_pela_rede(id: str, texto: str) -> None:
    for tentativa in range(1, 4):
        if tentativa > 1:
            conta["novas"] += 1
            # Espera crescente (de 5 a 10 ms, depois de 10 a 20 ms), com variação,
            # para que clientes que falharam juntos não voltem todos no mesmo instante
            teto = 10 * 2 ** (tentativa - 2)
            time.sleep((teto / 2 + random.random() * teto / 2) / 1000)
        conta["chamadas"] += 1
        status, corpo = post(f"{url}/avisos", {"id": id, "texto": texto})
        if status == 200:
            if corpo["situacao"] == "repetido":
                conta["repetidos"] += 1
            conta["enviados"] += 1
            return
        conta["erros"] += 1
    conta["perdidos"] += 1


modulo = Comunicacao()
if versao == "servico":
    post(f"{url}/reiniciar", {})
tempos = []
inicio = time.perf_counter()
for i in range(1, avisos + 1):
    id = f"E-P-{i:03d}"
    texto = f"pagamento {id[2:]} recebido"
    t0 = time.perf_counter()
    if versao == "servico":
        enviar_pela_rede(id, texto)
    elif modulo.avisar(id, texto):
        conta["enviados"] += 1
    tempos.append((time.perf_counter() - t0) * 1000)
total = (time.perf_counter() - inicio) * 1000

ordenados = sorted(tempos)
(saida / versao).mkdir(parents=True, exist_ok=True)
(saida / versao / "resultado.txt").write_text(
    f"avisos enviados: {conta['enviados']}\n"
    f"chamadas pela rede: {conta['chamadas']}\n"
    f"respostas com erro: {conta['erros']}\n"
    f"novas tentativas: {conta['novas']}\n"
    f"avisos repetidos ignorados: {conta['repetidos']}\n"
    f"avisos perdidos: {conta['perdidos']}\n",
    encoding="utf-8",
)
# Os tempos variam de máquina para máquina: ficam fora da pasta verificada
(saida / f"tempos-{versao}.txt").write_text(
    f"tempo médio por aviso: {sum(tempos) / len(tempos):.3f} ms\n"
    f"p95 por aviso: {ordenados[int(len(ordenados) * 0.95)]:.3f} ms\n"
    f"pior aviso: {ordenados[-1]:.3f} ms\n"
    f"tempo total: {total:.3f} ms\n",
    encoding="utf-8",
)
print(f"{versao}: {conta['enviados']} avisos; saída em {saida / versao}")
