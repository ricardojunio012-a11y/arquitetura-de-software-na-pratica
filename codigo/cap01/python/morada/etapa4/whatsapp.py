# Novo canal de aviso: entra sem mexer no e-mail.
from morada.etapa4.dinheiro import reais
from morada.etapa4.notificacao import Aviso


def formatar_whatsapp(aviso: Aviso) -> str:
    c = aviso.cobranca
    u = c.unidade
    texto = (
        f"{aviso.condominio}: taxa {aviso.competencia.rotulo} da unidade {u['id']}: "
        f"R$ {reais(c.total)}, vence {aviso.competencia.vencimento}."
    )
    if c.total_ate_05 is not None:
        texto += (
            f" Até {aviso.competencia.limite_desconto}: R$ {reais(c.total_ate_05)}."
        )
    texto += f" {aviso.nome_do_pagamento}: {aviso.codigo_de_pagamento}"
    return f"Para: {u['morador']['telefone']}\n{texto}\n----\n"


# Simula o envio gravando as mensagens num arquivo
class WhatsAppEmArquivo:
    def __init__(self, arquivo: str):
        self._arquivo = arquivo
        open(arquivo, "w", encoding="utf-8").close()

    def notificar(self, aviso: Aviso) -> None:
        with open(self._arquivo, "a", encoding="utf-8", newline="\n") as f:
            f.write(formatar_whatsapp(aviso))
