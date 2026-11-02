// O núcleo (microkernel): sabe emitir a remessa de cobranças, mas não conhece nenhum
// banco. Cada banco é um plugin que cumpre o contrato abaixo, descoberto numa pasta.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface Cobranca {
  unidade: string;
  valorCentavos: number;
  banco: string;
}

// O contrato: tudo o que o núcleo sabe sobre um plugin
export interface PluginDeBanco {
  nome: string;
  registrar(cobranca: Cobranca): string;
}

export function reais(centavos: number): string {
  const inteiro = String(Math.floor(centavos / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return `R$ ${inteiro},${String(centavos % 100).padStart(2, "0")}`;
}

export class Nucleo {
  readonly #plugins = new Map<string, PluginDeBanco>();

  instalar(plugin: PluginDeBanco) {
    if (typeof plugin?.nome !== "string" || typeof plugin.registrar !== "function") {
      throw new Error("plugin não cumpre o contrato");
    }
    this.#plugins.set(plugin.nome, plugin);
  }

  // Descoberta: cada arquivo da pasta é um plugin; nenhuma lista fixa no código
  async carregar(pasta: string) {
    const arquivos = fs.readdirSync(pasta).filter((a) => a.endsWith(".ts"));
    for (const arquivo of arquivos.sort()) {
      const modulo = await import(pathToFileURL(path.join(pasta, arquivo)).href);
      this.instalar(modulo.default);
    }
  }

  nomes(): string[] {
    return [...this.#plugins.keys()].sort();
  }

  // Um plugin ausente ou com defeito não derruba a remessa inteira
  emitir(cobranca: Cobranca): string {
    const plugin = this.#plugins.get(cobranca.banco);
    let resultado: string;
    if (!plugin) {
      resultado = `sem plugin para o banco ${cobranca.banco}`;
    } else {
      try {
        resultado = plugin.registrar(cobranca);
      } catch (erro) {
        resultado = `falha no plugin ${plugin.nome}: ${(erro as Error).message}`;
      }
    }
    const valor = reais(cobranca.valorCentavos);
    return `${cobranca.unidade};${valor};${cobranca.banco};${resultado}`;
  }
}
