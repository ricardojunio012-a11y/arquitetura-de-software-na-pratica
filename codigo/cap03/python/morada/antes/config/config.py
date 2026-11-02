# Configuração global: qualquer módulo lê e altera (acoplamento comum).
from datetime import date
from types import SimpleNamespace

config = SimpleNamespace(
    fundo_porcento=10,
    multa_porcento=2,
    hoje=date.today(),
    dados=None,  # o condomínio inteiro, preenchido pelo main
)
