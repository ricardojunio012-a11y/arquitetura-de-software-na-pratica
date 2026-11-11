// Versão "manifestos": confere se os manifestos de k8s/ combinam entre si
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { conferir, configuracao, lerManifestos } from "./manifestos.ts";

const dados = process.argv[2] ?? "/dados";
const m = lerManifestos(join(dados, "k8s"));
const regras = conferir(m);
const cfg = configuracao(m);
const saida = [
  `${m.size} objetos lidos de k8s/:`,
  "  " + [...m.keys()].map((k) => k.split("/")[0]).join(", "),
  "",
  ...regras.map((r) => `${r.ok ? "ok    " : "FALHOU"} ${r.regra} (${r.detalhe})`),
  "",
  `para a simulação: ${cfg.cpuPorPod}m por réplica, de ${cfg.minimo} a ${cfg.maximo} ` +
    `réplicas, alvo de ${cfg.alvo}%,`,
  `janela de descida de ${cfg.janelaReducao} s`,
];
const pasta = join(dados, "saida", "manifestos");
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "resultado.txt"), saida.join("\n") + "\n");
console.log(saida.join("\n"));
if (regras.some((r) => !r.ok)) process.exitCode = 1;
