# Como o morador fica sabendo da cobrança.
from dataclasses import dataclass
from typing import Protocol

from morada.etapa3.calculo import Cobranca
from morada.etapa3.competencia import Competencia
from morada.etapa3.dinheiro import reais


@dataclass(frozen=True)
class Aviso:
    condominio: str
    competencia: Competencia
    cobranca: Cobranca
    nome_do_pagamento: str
    codigo_de_pagamento: str


class Notificador(Protocol):
    def notificar(self, aviso: Aviso) -> None: ...


def formatar_email(aviso: Aviso) -> str:
    c = aviso.cobranca
    u = c.unidade
    linhas = [
        f"Para: {u['morador']['email']}",
        f"Assunto: Taxa condominial {aviso.competencia.rotulo} - {aviso.condominio} "
        f"- Unidade {u['id']}",
        "",
        f"Olá, {u['morador']['nome']}.",
        "",
        f"A taxa condominial de {aviso.competencia.rotulo} da unidade {u['id']} "
        "está disponível.",
        f"Valor: R$ {reais(c.total)}",
        f"Vencimento: {aviso.competencia.vencimento}",
    ]
    if c.debito > 0:
        linhas.append(
            f"Inclui débito anterior de R$ {reais(c.debito)}, "
            f"com multa de R$ {reais(c.multa)} "
            f"e juros de R$ {reais(c.juros)}."
        )
    linhas += [
        f"{aviso.nome_do_pagamento}: {aviso.codigo_de_pagamento}",
        "",
        f"Administração do {aviso.condominio}",
        "----",
    ]
    return "\n".join(linhas) + "\n"


# Simula o envio gravando as mensagens num arquivo
class EmailEmArquivo:
    def __init__(self, arquivo: str):
        self._arquivo = arquivo
        open(arquivo, "w", encoding="utf-8").close()

    def notificar(self, aviso: Aviso) -> None:
        with open(self._arquivo, "a", encoding="utf-8", newline="\n") as f:
            f.write(formatar_email(aviso))
