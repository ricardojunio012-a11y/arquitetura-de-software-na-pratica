# Simulação da fila de registro em lote no banco emissor (o "agora a parte difícil").
# Relógio simulado e sorteio com semente fixa: a mesma saída em qualquer máquina.
# Os números do arquivo registro.json são premissas do laboratório, não de um banco real.
import math
from dataclasses import dataclass, field


@dataclass
class Resultado:
    arquivos: int = 0
    tentativas: int = 0
    disponivel_em: dict[int, int] = field(default_factory=dict)  # segundo -> boletos
    sem_registro: int = 0  # nunca ficaram disponíveis
    via_pix: int = 0  # receberam o Pix no lugar do boleto


def sorteador(semente: int):
    """Gerador congruente de Park e Miller: só inteiros, igual nas quatro linguagens."""
    x = semente

    def sortear() -> int:
        nonlocal x
        x = x * 48271 % 2147483647
        return x

    return sortear


def simular(p: dict, ajustada: bool) -> Resultado:
    """ingênua: reenvia toda recusa e só avisa o morador com o boleto registrado.
    ajustada: recusa definitiva não volta para a fila, e o boleto que não daria
    tempo de confirmar vira Pix (a alternativa do ADR-002)."""
    sortear = sorteador(p["semente"])
    fila = []  # (envio, ordem, boletos, tentativa)
    for i in range(0, p["boletos"], p["boletosPorArquivo"]):
        fim = min(p["boletos"], i + p["boletosPorArquivo"])
        fila.append((0, len(fila), list(range(i, fim)), 1))
    r = Resultado()

    def disponivel(t: int) -> None:
        r.disponivel_em[t] = r.disponivel_em.get(t, 0) + 1

    ordem = len(fila)
    banco_livre = 0
    while fila:
        # O banco processa um arquivo por vez, na ordem de chegada
        envio, _, boletos, tentativa = fila.pop(fila.index(min(fila)))
        r.arquivos += 1
        r.tentativas += len(boletos)
        inicio = max(envio, banco_livre)
        banco_livre = inicio + math.ceil(len(boletos) / p["registrosPorSegundo"])
        retorno = banco_livre + p["retornoSegundos"]
        reenviar = []
        for b in boletos:
            definitiva = b % p["recusaDefinitivaACada"] == 0
            recusado = definitiva or sortear() % 100 < p["falhaPassageiraPorCento"]
            if not recusado:
                disponivel(retorno)
            elif not ajustada:
                if tentativa < p["maxTentativas"]:
                    reenviar.append(b)
                else:
                    r.sem_registro += 1
            elif (
                definitiva
                or tentativa >= p["maxTentativas"]
                or retorno + p["retornoSegundos"] > p["limiteSegundos"]
            ):
                disponivel(retorno)  # o aviso sai com o Pix, sem esperar outro ciclo
                r.via_pix += 1
            else:
                reenviar.append(b)
        if reenviar:
            fila.append((retorno, ordem, reenviar, tentativa + 1))
            ordem += 1
    return r


def percentil(r: Resultado, total: int, milesimos: int) -> int | None:
    """Percentil pela posição mais próxima, em milésimos (990 = p99, 999 = p99,9).
    Devolve None quando ele cai nos boletos que nunca ficaram disponíveis."""
    posicao = -(-milesimos * total // 1000)
    acumulado = 0
    for t in sorted(r.disponivel_em):
        acumulado += r.disponivel_em[t]
        if acumulado >= posicao:
            return t
    return None


def disponiveis_ate(r: Resultado, limite: int) -> int:
    return sum(n for t, n in r.disponivel_em.items() if t <= limite)
