// Leitura do contrato OpenAPI: resolve referências e encontra a operação de um
// pedido.
import fs from "node:fs";
import { parse } from "yaml";

// O contrato e os esquemas são objetos genéricos, lidos do YAML
export type No = any;

export const lerContrato = (arquivo: string): No =>
  parse(fs.readFileSync(arquivo, "utf8"));

// Troca {"$ref": "#/components/schemas/X"} pelo objeto apontado
export function resolver(contrato: No, no: No): No {
  while (no?.$ref) {
    const partes = no.$ref.slice(2).split("/");
    no = partes.reduce((atual: No, parte: string) => atual[parte], contrato);
  }
  return no;
}

// O modelo de caminho do contrato que casa com um caminho concreto
export function encontrarCaminho(contrato: No, caminho: string): string | undefined {
  const partes = caminho.split("/");
  return Object.keys(contrato.paths).find((modelo) => {
    const pedacos = modelo.split("/");
    return (
      pedacos.length === partes.length &&
      pedacos.every((p, i) => p.startsWith("{") || p === partes[i])
    );
  });
}
