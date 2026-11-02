# Uso: python -m morada.main.http memoria|postgres <pasta-de-saída>
# Sobe o adaptador HTTP com o repositório escolhido, envia as requisições
# em memória e grava as respostas e o estado final das agendas.
import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from morada.adaptadores.entrada.http import criar_api
from morada.main.montar import montar

repositorio, saida = sys.argv[1], Path(sys.argv[2])
servico, agendas = montar(repositorio, preparar=True)
api = TestClient(criar_api(servico))
dados = json.loads(Path("/dados/entrada/requisicoes.json").read_text("utf-8"))

linhas = []
for r in dados["requisicoes"]:
    resposta = api.request(r["metodo"], r["caminho"], json=r.get("corpo"))
    corpo = json.dumps(resposta.json(), ensure_ascii=False, separators=(",", ":"))
    linhas.append(f"{r['metodo']} {r['caminho']} -> {resposta.status_code} {corpo}")
estado = [
    f"{a.espaco.id};{r.id};{r.unidade};{r.data} {r.inicio}h-{r.fim}h"
    for a in agendas.todas()
    for r in a.reservas()
]

saida.mkdir(parents=True, exist_ok=True)
(saida / "respostas.txt").write_text("\n".join(linhas) + "\n", encoding="utf-8")
(saida / "agendas.txt").write_text("\n".join(estado) + "\n", encoding="utf-8")
print(f"{len(linhas)} requisições ({repositorio}); saída em {saida}")
