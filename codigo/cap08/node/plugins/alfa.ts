// Plugin do Banco Alfa: numera os boletos em sequência, com cinco dígitos.
import type { Cobranca, PluginDeBanco } from "../src/plugins/nucleo.ts";

let ultimo = 0;

const alfa: PluginDeBanco = {
  nome: "alfa",
  registrar(_cobranca: Cobranca) {
    ultimo += 1;
    return `ALFA-${String(ultimo).padStart(5, "0")}`;
  },
};

export default alfa;
