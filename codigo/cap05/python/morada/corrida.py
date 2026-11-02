# "Agora a parte difícil": dois pedidos para o mesmo espaço e a mesma data
# chegam ao mesmo tempo. A intercalação é forçada, para a saída ser sempre igual:
# os dois passam pela cadeia antes de qualquer um gravar.
from morada.estado import Reserva
from morada.tipos import data_br


def corrida(pedidos, montar) -> list[str]:
    primeiro = pedidos[0]
    linhas = [
        f"Pedidos simultâneos: {primeiro.espaco.nome} em {data_br(primeiro.data)}"
    ]
    for protegido in (False, True):
        linhas.append(
            "gravar só se o espaço estiver livre, numa operação só:"
            if protegido
            else "verificar e depois gravar (check-then-act):"
        )
        cadeia, reservas = montar()
        # 1. Os dois verificam: o espaço está livre para ambos
        aprovados = []
        for p in pedidos:
            d = cadeia.avaliar(p)
            texto = "passou na cadeia" if d.aprovada else d.motivo
            linhas.append(f"  {p.id} {p.unidade.id}: {texto}")
            if d.aprovada:
                aprovados.append(p)
        # 2. Os dois gravam
        for p in aprovados:
            reserva = Reserva(p)
            gravou = reservas.salvar_se_livre(reserva) if protegido else True
            if not protegido:
                reservas.salvar(reserva)
            if gravou:
                reserva.aprovar()
            situacao = "gravada" if gravou else "recusada na gravação"
            linhas.append(f"  {p.id} {situacao}")
        n = 0
        for p in pedidos:
            r = reservas.buscar(p.id)
            if r is not None and r.estado == "aprovada":
                n += 1
        resultado = "1 reserva aprovada" if n == 1 else f"{n} reservas aprovadas"
        dupla = " (reserva dupla)" if n > 1 else ""
        linhas.append(f"  resultado: {resultado}{dupla}")
    return linhas
