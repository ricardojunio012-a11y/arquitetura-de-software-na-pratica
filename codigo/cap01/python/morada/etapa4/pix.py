# Novo meio de pagamento: entra sem mexer no cálculo nem no boleto.
from morada.etapa4.calculo import Cobranca
from morada.etapa4.competencia import Competencia


# Código fictício: num sistema real, viria do provedor de Pix
class Pix:
    nome = "Pix copia e cola"

    def gerar_codigo(
        self, condominio_id: str, competencia: Competencia, cobranca: Cobranca
    ) -> str:
        unidade = cobranca.unidade["id"]
        return f"PIX-{condominio_id}-{competencia.codigo}-{unidade}-{cobranca.total}"
