# O núcleo (microkernel): sabe emitir a remessa de cobranças, mas não conhece nenhum
# banco. Cada banco é um plugin que cumpre o contrato abaixo, descoberto numa pasta.
import importlib.util
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True)
class Cobranca:
    unidade: str
    valor_centavos: int
    banco: str


# O contrato: tudo o que o núcleo sabe sobre um plugin
class PluginDeBanco(Protocol):
    nome: str

    def registrar(self, cobranca: Cobranca) -> str: ...


def reais(centavos: int) -> str:
    inteiro = f"{centavos // 100:,}".replace(",", ".")
    return f"R$ {inteiro},{centavos % 100:02d}"


class Nucleo:
    def __init__(self):
        self._plugins: dict[str, PluginDeBanco] = {}

    def instalar(self, plugin) -> None:
        nome = getattr(plugin, "nome", None)
        if not isinstance(nome, str) or not callable(
            getattr(plugin, "registrar", None)
        ):
            raise TypeError("plugin não cumpre o contrato")
        self._plugins[nome] = plugin

    # Descoberta: cada arquivo da pasta é um plugin; nenhuma lista fixa no código
    def carregar(self, pasta: str) -> None:
        for arquivo in sorted(Path(pasta).glob("*.py")):
            spec = importlib.util.spec_from_file_location(arquivo.stem, arquivo)
            modulo = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(modulo)
            self.instalar(modulo.plugin)

    def nomes(self) -> list[str]:
        return sorted(self._plugins)

    # Um plugin ausente ou com defeito não derruba a remessa inteira
    def emitir(self, c: Cobranca) -> str:
        plugin = self._plugins.get(c.banco)
        if plugin is None:
            resultado = f"sem plugin para o banco {c.banco}"
        else:
            try:
                resultado = plugin.registrar(c)
            except Exception as erro:
                resultado = f"falha no plugin {plugin.nome}: {erro}"
        return f"{c.unidade};{reais(c.valor_centavos)};{c.banco};{resultado}"
