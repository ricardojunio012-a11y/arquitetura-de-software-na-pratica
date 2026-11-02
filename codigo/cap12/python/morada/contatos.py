# Uso: python -m morada.contatos <pasta-de-saída>
# A parte difícil da extração. Para avisar, a Comunicação precisa do e-mail do
# morador, que pertence ao Cadastro e, no monólito, vinha de uma junção com a
# tabela dele. Fora do monólito, sem tabela compartilhada, há dois caminhos:
# consultar o Cadastro por API a cada aviso ou manter uma réplica dos contatos,
# alimentada pelos eventos ContatoAlterado. Um relógio simulado, em minutos,
# deixa a saída igual em qualquer máquina.
import json
import sys
from pathlib import Path

cenario = json.loads(Path("/dados/entrada/contatos.json").read_text("utf-8"))
mudancas = cenario["mudancas"]
de, ate = cenario["cadastroFora"]["de"], cenario["cadastroFora"]["ate"]
atraso = cenario["atrasoDaReplica"]
saida = Path(sys.argv[1])


def unidade_do(aviso: int) -> str:
    return f"U-{(aviso - 1) % cenario['unidades'] + 1:02d}"


def cadastro_no_ar(minuto: int) -> bool:
    return minuto < de or minuto > ate


# O e-mail de uma unidade num minuto, contando as mudanças que já valiam
def email_em(unidade: str, minuto: int, atraso_da_copia: int = 0) -> str:
    email = f"morador.{unidade.lower().replace('-', '')}@exemplo.com"
    for m in mudancas:
        if m["unidade"] == unidade and m["minuto"] + atraso_da_copia <= minuto:
            email = m["email"]
    return email


# Caminho 1: a cada aviso, pergunta o e-mail ao Cadastro. Se ele não responde, o
# aviso espera numa fila local e sai quando o Cadastro voltar.
def por_consulta() -> list[str]:
    chamadas = erros = na_hora = maior_atraso = 0
    adiados: list[int] = []
    for aviso in range(1, cenario["avisos"] + 1):
        minuto = aviso
        if cadastro_no_ar(minuto):
            for antigo in adiados:
                chamadas += 1
                maior_atraso = max(maior_atraso, minuto - antigo)
            adiados = []
        chamadas += 1
        if not cadastro_no_ar(minuto):
            erros += 1
            adiados.append(minuto)
            continue
        na_hora += 1
    return [
        "Consulta ao Cadastro por API, a cada aviso",
        f"  chamadas ao Cadastro: {chamadas} ({erros} com erro)",
        f"  avisos enviados na hora: {na_hora}",
        f"  avisos adiados até o Cadastro voltar: {erros} "
        f"(o maior atraso: {maior_atraso} min)",
        # Cada consulta lê o e-mail atual: nenhum aviso sai para um endereço antigo
        "  avisos para e-mail desatualizado: 0",
    ]


# Caminho 2: a Comunicação guarda uma cópia dos contatos, carregada uma vez e
# atualizada pelos eventos, que chegam alguns minutos depois da mudança
def por_replica() -> list[str]:
    desatualizados = []
    for aviso in range(1, cenario["avisos"] + 1):
        unidade = unidade_do(aviso)
        if email_em(unidade, aviso, atraso) == email_em(unidade, aviso):
            continue
        m = [x for x in mudancas if x["unidade"] == unidade and x["minuto"] <= aviso][
            -1
        ]
        desatualizados.append(
            f"    E-P-{aviso:03d} para {unidade}: e-mail antigo "
            f"(mudou no minuto {m['minuto']}; a réplica, no {m['minuto'] + atraso})"
        )
    aplicados = [m for m in mudancas if m["minuto"] + atraso <= cenario["avisos"]]
    return [
        f"Réplica dos contatos, alimentada por eventos (atraso de {atraso} min)",
        f"  carga inicial: {cenario['unidades']} contatos",
        f"  eventos ContatoAlterado aplicados: {len(aplicados)}",
        "  chamadas ao Cadastro: 0",
        f"  avisos enviados na hora: {cenario['avisos']}",
        "  avisos adiados até o Cadastro voltar: 0",
        f"  avisos para e-mail desatualizado: {len(desatualizados)}",
        *desatualizados,
    ]


(saida / "contatos").mkdir(parents=True, exist_ok=True)
linhas = [*por_consulta(), "", *por_replica()]
(saida / "contatos" / "resultado.txt").write_text("\n".join(linhas) + "\n", "utf-8")
print(f"contatos: saída em {saida / 'contatos'}")
