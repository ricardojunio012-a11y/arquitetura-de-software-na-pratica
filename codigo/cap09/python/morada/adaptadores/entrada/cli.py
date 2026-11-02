# Adaptador de entrada de linha de comando: os mesmos casos de uso, acionados por
# argumentos e respondidos em texto para uma pessoa ler no terminal.
from morada.aplicacao.portas import CasosDeUsoDeReservas

USO_RESERVAR = "uso: reservar <reserva> <unidade> <espaco> <data> <inicio> <fim> <hoje>"


# Devolve o texto a mostrar e o código de saída do processo (0 = deu certo)
def executar(reservas: CasosDeUsoDeReservas, args: list[str]) -> tuple[str, int]:
    comando, resto = (args[0], args[1:]) if args else ("", [])
    try:
        if comando == "espacos":
            linhas = [
                f"{e['id']}: taxa {e['taxa']}, antecedência de "
                f"{e['antecedenciaMinimaDias']} dia(s)"
                for e in reservas.listar_espacos()
            ]
            return "\n".join(linhas), 0
        if comando == "reservar":
            if len(resto) != 7:
                return USO_RESERVAR, 2
            reserva, unidade, espaco, data, inicio, fim, em = resto
            c = reservas.reservar(
                {
                    "reserva": reserva,
                    "unidade": unidade,
                    "espaco": espaco,
                    "data": data,
                    "inicio": int(inicio),
                    "fim": int(fim),
                    "em": em,
                }
            )
            return f"{c['reserva']} confirmada, taxa {c['taxa']}", 0
        if comando == "cancelar":
            c = reservas.cancelar(resto[0], resto[1])
            return f"{c['reserva']} cancelada, multa {c['multa']}", 0
        if comando == "reservas":
            lista = reservas.reservas_do_espaco(resto[0])
            if not lista:
                return "nenhuma reserva", 0
            return (
                "\n".join(
                    f"{r['reserva']} {r['unidade']} {r['periodo']}" for r in lista
                ),
                0,
            )
        return "comandos: espacos, reservar, cancelar, reservas", 2
    except Exception as erro:
        return f"erro: {erro}", 1
