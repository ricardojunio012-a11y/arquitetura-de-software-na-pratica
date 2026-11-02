// Plugin do Banco Beta: outro formato de número, mesmo contrato.
import type { Cobranca, PluginDeBanco } from "../src/plugins/nucleo.ts";

let ultimo = 0;

const beta: PluginDeBanco = {
  nome: "beta",
  registrar(_cobranca: Cobranca) {
    ultimo += 1;
    return `BETA/${String(ultimo).padStart(4, "0")}`;
  },
};

export default beta;
