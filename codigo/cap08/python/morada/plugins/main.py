# Uso: python -m morada.plugins.main <cobrancas.json> <plugins> <pasta-de-saída>
import json
import sys
from pathlib import Path

from morada.plugins.nucleo import Cobranca, Nucleo

entrada, pasta_de_plugins, saida = sys.argv[1], sys.argv[2], Path(sys.argv[3])
nucleo = Nucleo()
nucleo.carregar(pasta_de_plugins)

cobrancas = json.loads(Path(entrada).read_text(encoding="utf-8"))["cobrancas"]
linhas = [f"plugins carregados: {', '.join(nucleo.nomes())}"]
for c in cobrancas:
    linhas.append(nucleo.emitir(Cobranca(c["unidade"], c["valorCentavos"], c["banco"])))

saida.mkdir(parents=True, exist_ok=True)
(saida / "remessa.txt").write_text("\n".join(linhas) + "\n", encoding="utf-8")
print(f"{len(cobrancas)} cobranças; saída em {saida}")
