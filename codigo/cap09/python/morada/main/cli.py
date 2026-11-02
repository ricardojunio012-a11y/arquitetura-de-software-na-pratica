# Uso: python -m morada.main.cli <comando> [argumentos]   (repositório no PostgreSQL)
#      python -m morada.main.cli preparar-banco            (apaga e recria a tabela)
# Cada execução é um processo novo: o estado fica no banco, entre uma e outra.
import sys

from morada.adaptadores.entrada.cli import executar
from morada.main.montar import montar

args = sys.argv[1:]
preparar = args[:1] == ["preparar-banco"]
servico, _ = montar("postgres", preparar)
texto, codigo = ("banco preparado", 0) if preparar else executar(servico, args)
print(texto)
sys.exit(codigo)
