"""Mede as dependências entre os módulos de uma versão do código.

Para cada módulo (pasta logo abaixo de antes/ ou depois/; arquivos soltos contam como "main"):
  Ca  acoplamento aferente: quantos módulos dependem dele
  Ce  acoplamento eferente: de quantos módulos ele depende
  I   instabilidade = Ce / (Ca + Ce): 0 = estável, 1 = instável
e lista os ciclos de dependência. As métricas são as de Robert C. Martin.

Uso: python3 dependencias.py <node|php|python|java|todas>
"""
import re
import sys
from pathlib import Path

LINGUAGENS = {
    "node": ("Node/TypeScript", "node/src", ".ts"),
    "php": ("PHP", "php/src", ".php"),
    "python": ("Python", "python/morada", ".py"),
    "java": ("Java", "java/src/main/java/morada", ".java"),
}

# Padrões de import de cada linguagem
TS = re.compile(r'from\s+"(\.{1,2}/[^"]+)"')
PHP = re.compile(r"require_once\s+__DIR__\s*\.\s*'([^']+)'")
PY = re.compile(r"^\s*(?:from|import)\s+morada\.(?:antes|depois)\.(\w+)", re.M)
JAVA = re.compile(r"^\s*import\s+morada\.(?:antes|depois)\.(\w+)\.", re.M)


def modulo_do_arquivo(raiz: Path, arquivo: Path) -> str:
    partes = arquivo.relative_to(raiz).parts
    return partes[0] if len(partes) > 1 else "main"


def dependencias(lingua: str, raiz: Path, arquivo: Path) -> set[str]:
    texto = arquivo.read_text(encoding="utf-8")
    if lingua in ("node", "php"):
        padrao = TS if lingua == "node" else PHP
        alvos = set()
        for caminho in padrao.findall(texto):
            destino = (arquivo.parent / caminho.lstrip("/")).resolve()
            alvos.add(modulo_do_arquivo(raiz.resolve(), destino))
        return alvos
    return set((PY if lingua == "python" else JAVA).findall(texto))


def ciclos(grafo: dict[str, set[str]]) -> list[list[str]]:
    """Componentes fortemente conexos com mais de um módulo (Tarjan)."""
    indice, menor, pilha, na_pilha, resultado = {}, {}, [], set(), []

    def visitar(v):
        indice[v] = menor[v] = len(indice)
        pilha.append(v)
        na_pilha.add(v)
        for w in sorted(grafo.get(v, ())):
            if w not in indice:
                visitar(w)
                menor[v] = min(menor[v], menor[w])
            elif w in na_pilha:
                menor[v] = min(menor[v], indice[w])
        if menor[v] == indice[v]:
            componente = []
            while True:
                w = pilha.pop()
                na_pilha.discard(w)
                componente.append(w)
                if w == v:
                    break
            if len(componente) > 1:
                resultado.append(sorted(componente))

    for v in sorted(grafo):
        if v not in indice:
            visitar(v)
    return resultado


def medir(lingua: str, versao: str) -> None:
    nome, pasta, extensao = LINGUAGENS[lingua]
    raiz = Path(pasta) / versao
    grafo: dict[str, set[str]] = {}
    for arquivo in sorted(raiz.rglob(f"*{extensao}")):
        modulo = modulo_do_arquivo(raiz, arquivo)
        destinos = dependencias(lingua, raiz, arquivo) - {modulo}
        grafo.setdefault(modulo, set()).update(destinos)
    for destinos in list(grafo.values()):
        for d in destinos:
            grafo.setdefault(d, set())
    print(f"{nome}, {versao}")
    print(f"  {'módulo':<16}{'Ca':>4}{'Ce':>4}{'I':>7}  depende de")
    for modulo in sorted(grafo, key=lambda m: (m == "main", m)):
        ca = sum(modulo in destinos for destinos in grafo.values())
        ce = len(grafo[modulo])
        instabilidade = f"{ce / (ca + ce):.2f}".replace(".", ",") if ca + ce else "-"
        print(f"  {modulo:<16}{ca:>4}{ce:>4}{instabilidade:>7}  {', '.join(sorted(grafo[modulo])) or '-'}")
    encontrados = ciclos(grafo)
    texto = "; ".join(" <-> ".join(c) for c in encontrados) if encontrados else "nenhum"
    print(f"  ciclos: {texto}")


if __name__ == "__main__":
    alvo = sys.argv[1] if len(sys.argv) > 1 else "node"
    for lingua in (LINGUAGENS if alvo == "todas" else [alvo]):
        for versao in ("antes", "depois"):
            medir(lingua, versao)
