# Strategy (os canais), Decorator (retentativas e registro) e Factory (a fábrica).
from dataclasses import dataclass
from typing import Protocol

from morada.tipos import Morador


@dataclass(frozen=True)
class Mensagem:
    titulo: str
    texto: str


class Canal(Protocol):
    nome: str

    def enviar(self, morador: Morador, mensagem: Mensagem) -> None: ...


class ErroPassageiro(Exception):
    """Falha que pode passar numa nova tentativa (provedor fora do ar, limite)."""


class ErroDefinitivo(Exception):
    """Falha que se repete em toda tentativa (endereço inexistente)."""


class ProvedorSimulado:
    """Simula os provedores de e-mail, WhatsApp e SMS. Alguns destinos falham
    nas primeiras tentativas, como acontece com provedores de verdade, e
    outros são inválidos e falham sempre."""

    def __init__(self, falhas: dict[str, int], invalidos=()):
        self._falhas = dict(falhas)
        self._invalidos = set(invalidos)
        self.entregues: list[str] = []

    def entregar(self, canal: str, destino: str, texto: str) -> None:
        if destino in self._invalidos:
            raise ErroDefinitivo("destino inexistente")
        if self._falhas.get(destino, 0) > 0:
            self._falhas[destino] -= 1
            raise ErroPassageiro("provedor indisponível")
        self.entregues.append(f"{canal} {destino} | {texto}")


# Cada estratégia sabe o endereço e o formato do seu canal
class Email:
    nome = "email"

    def __init__(self, provedor: ProvedorSimulado):
        self._provedor = provedor

    def enviar(self, morador, m):
        self._provedor.entregar(self.nome, morador.email, f"{m.titulo}: {m.texto}")


class WhatsApp:
    nome = "whatsapp"

    def __init__(self, provedor: ProvedorSimulado):
        self._provedor = provedor

    def enviar(self, morador, m):
        self._provedor.entregar(self.nome, morador.telefone, f"*{m.titulo}* {m.texto}")


class Sms:
    nome = "sms"

    def __init__(self, provedor: ProvedorSimulado):
        self._provedor = provedor

    def enviar(self, morador, m):
        # SMS é curto: só o título, e o detalhe fica no aplicativo
        self._provedor.entregar(self.nome, morador.telefone, f"Morada: {m.titulo}")


class ComRegistro:
    """Decorator: registra cada tentativa sem que o canal saiba que é observado."""

    def __init__(self, canal: Canal, registro: list[str]):
        self._canal = canal
        self._registro = registro
        self.nome = canal.nome

    def enviar(self, morador, mensagem):
        quem = f"{self.nome} para {morador.nome}"
        try:
            self._canal.enviar(morador, mensagem)
            self._registro.append(f"{quem}: entregue ({mensagem.titulo})")
        except Exception as erro:
            self._registro.append(f"{quem}: falhou ({erro})")
            raise


class ComRetentativas:
    """Decorator: tenta de novo antes de desistir, só quando a falha é passageira,
    e espera cada vez mais entre as tentativas (100 ms, 200 ms, 400 ms...).
    Quem espera é a função esperar: em produção, um timer; no laboratório, um
    relógio simulado que só anota a espera, para a saída ser sempre a mesma."""

    def __init__(self, canal: Canal, tentativas: int, esperar, espera_ms: int = 100):
        self._canal = canal
        self._tentativas = tentativas
        self._esperar = esperar
        self._espera_inicial_ms = espera_ms
        self.nome = canal.nome

    def enviar(self, morador, mensagem):
        for tentativa in range(1, self._tentativas + 1):
            try:
                return self._canal.enviar(morador, mensagem)
            except ErroPassageiro:
                if tentativa == self._tentativas:
                    raise RuntimeError(
                        f"{self.nome} sem sucesso após {tentativa} tentativas"
                    )
                espera = self._espera_inicial_ms * 2 ** (tentativa - 1)
                self._esperar(espera, f"{self.nome} para {morador.nome}")
            except Exception as erro:
                # Repetir uma falha definitiva só gasta tempo e cota do provedor
                raise RuntimeError(f"{self.nome} falhou sem nova tentativa ({erro})")


class FabricaDeCanais:
    """Factory: escolhe a estratégia pela preferência do morador e a embrulha nos
    decoradores. Quem envia avisos não conhece nenhuma classe concreta."""

    def __init__(self, provedor: ProvedorSimulado, registro: list[str], esperar):
        canais = [Email(provedor), WhatsApp(provedor), Sms(provedor)]
        self._canais = {c.nome: c for c in canais}
        self._registro = registro
        self._esperar = esperar

    def para(self, morador: Morador) -> Canal:
        canal = self._canais.get(morador.canal, self._canais["email"])
        # A ordem importa: retentativas por fora, registro por dentro
        return ComRetentativas(ComRegistro(canal, self._registro), 3, self._esperar)
