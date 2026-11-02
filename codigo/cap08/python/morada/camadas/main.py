# Uso: python -m morada.camadas.main <requisicoes.json> <pasta-de-saída>
# Monta as camadas de baixo para cima e envia as requisições à API, em memória
# (sem abrir porta), gravando cada resposta.
import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from morada.camadas.aplicacao import ServicoDeReservas
from morada.camadas.apresentacao import criar_api
from morada.camadas.dados import RepositorioDeAgendas
from morada.camadas.dominio import Espaco

entrada, saida = sys.argv[1], Path(sys.argv[2])
dados = json.loads(Path(entrada).read_text(encoding="utf-8"))
espacos = [
    Espaco(e["id"], e["taxaCentavos"], e["antecedenciaMinimaDias"])
    for e in dados["espacos"]
]
api = TestClient(criar_api(ServicoDeReservas(RepositorioDeAgendas(espacos))))

linhas = []
for r in dados["requisicoes"]:
    resposta = api.request(r["metodo"], r["caminho"], json=r.get("corpo"))
    corpo = json.dumps(resposta.json(), ensure_ascii=False, separators=(",", ":"))
    linhas.append(f"{r['metodo']} {r['caminho']} -> {resposta.status_code} {corpo}")

saida.mkdir(parents=True, exist_ok=True)
(saida / "respostas.txt").write_text("\n".join(linhas) + "\n", encoding="utf-8")
print(f"{len(linhas)} requisições; saída em {saida}")
