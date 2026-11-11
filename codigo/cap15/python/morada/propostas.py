# A versão "compatibilidade": compara cada proposta de entrada/propostas com o
# contrato publicado e diz se ela pode ser publicada sem quebrar os clientes.
import sys
from pathlib import Path

from morada.contrato.compatibilidade import comparar_contratos
from morada.contrato.openapi import ler_contrato

dados = Path(sys.argv[1])
publicado = ler_contrato(str(dados / "openapi" / "publicado" / "v1.yaml"))
pasta = dados / "entrada" / "propostas"

relatorio = []
incompativeis = 0
propostas = sorted(p.name for p in pasta.iterdir())
for arquivo in propostas:
    mudancas = comparar_contratos(publicado, ler_contrato(str(pasta / arquivo)))
    quebra = any(not m.compativel for m in mudancas)
    incompativeis += quebra
    relatorio.append(f"{arquivo}: {'INCOMPATÍVEL' if quebra else 'compatível'}")
    relatorio += [f"  {'+' if m.compativel else '-'} {m.texto}" for m in mudancas]
relatorio += ["", f"propostas incompatíveis: {incompativeis} de {len(propostas)}"]

saida = dados / "saida" / "compatibilidade"
saida.mkdir(parents=True, exist_ok=True)
(saida / "relatorio.txt").write_text("\n".join(relatorio) + "\n", encoding="utf-8")
print(f"compatibilidade: {incompativeis} de {len(propostas)} incompatíveis")
