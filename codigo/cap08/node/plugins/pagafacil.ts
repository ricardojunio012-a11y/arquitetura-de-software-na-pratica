// Plugin da PagaFácil: gera uma cobrança Pix identificada pela unidade.
import type { Cobranca, PluginDeBanco } from "../src/plugins/nucleo.ts";

const pagafacil: PluginDeBanco = {
  nome: "pagafacil",
  registrar(cobranca: Cobranca) {
    return `PIX-${cobranca.unidade.replace("-", "")}`;
  },
};

export default pagafacil;
