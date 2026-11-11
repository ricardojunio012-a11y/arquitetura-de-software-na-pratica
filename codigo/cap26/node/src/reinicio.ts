// A versão "reinicio" (agora a parte difícil): o dispositivo da portaria está sem rede,
// registra três acessos e reinicia (falta de energia) antes de a rede voltar. Um
// processo filho faz o papel do dispositivo e é morto com SIGKILL, sem chance de
// salvar nada. Depois, um dispositivo novo abre a mesma fila e a esvazia. Com a fila
// em memória, os acessos somem; com a fila num arquivo SQLite, chegam todos.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import mqtt from "mqtt";
import { type Acesso, FilaLocal, Recebedor } from "./dispositivo.ts";

const [dados, papel, arquivo] = process.argv.slice(2);
const TOPICO = "portaria/12/acessos-reinicio";
const acesso = (n: number): Acesso => ({
  id: `porteiro-2:${n}`,
  placa: `XYZ${String(n).padStart(4, "0")}`,
  momento: `2026-11-05T09:${String(n).padStart(2, "0")}:00`,
});

if (papel === "dispositivo") {
  // Sem rede: só grava na fila local, e o processo morre sem fechar nada
  const fila = new FilaLocal(arquivo);
  for (let n = 21; n <= 23; n++) fila.registrar(acesso(n));
  process.kill(process.pid, "SIGKILL");
  await new Promise(() => {}); // não segue adiante enquanto o sinal chega
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const recebedor = new Recebedor();
const opcoes = { protocolVersion: 5 as const };
const servidor = await mqtt.connectAsync(process.env.MQTT_URL!, {
  ...opcoes,
  clientId: "morada-servidor-reinicio",
});
servidor.on("message", (_t, m) => recebedor.receber(JSON.parse(m.toString())));
await servidor.subscribeAsync(TOPICO, { qos: 1 });

const linhas: string[] = [];
const modos = [
  ["memória", ":memory:"],
  ["arquivo SQLite", "/tmp/portaria-reinicio.db"],
];
for (const [nome, local] of modos) {
  fs.rmSync(local, { force: true });
  recebedor.recebidos.length = 0;
  const filho = spawnSync(
    process.execPath,
    [
      "--disable-warning=ExperimentalWarning",
      process.argv[1],
      dados,
      "dispositivo",
      local,
    ],
    { stdio: "inherit" },
  );
  // O dispositivo religa, abre a mesma fila e a esvazia quando a rede volta
  const fila = new FilaLocal(local);
  const sobreviveram = fila.tamanho;
  const dispositivo = await mqtt.connectAsync(process.env.MQTT_URL!, {
    ...opcoes,
    clientId: "porteiro-2",
  });
  await fila.esvaziar(dispositivo, TOPICO);
  for (let i = 0; i < 20 && recebedor.recebidos.length < sobreviveram; i++)
    await esperar(100);
  await dispositivo.endAsync();
  fila.fechar();
  const ids = recebedor.recebidos.map((a) => a.id.split(":")[1]);
  linhas.push(
    `== fila em ${nome}`,
    `o dispositivo registrou 3 acessos sem rede e morreu (${filho.signal})`,
    `acessos na fila depois de religar: ${sobreviveram}`,
    `o servidor recebeu: ${ids.length ? ids.join(", ") : "nenhum"}`,
    "",
  );
}

await servidor.endAsync();
const saida = path.join(dados, "saida", "reinicio");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n"));
console.log(linhas.join("\n"));
