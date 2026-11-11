// A versão "offline": o dispositivo da portaria registra 10 acessos. Do 4º ao 7º, ele
// está sem rede, e os acessos esperam na fila local. Quando volta, reenvia por engano o
// último acesso já confirmado (como se a confirmação tivesse se perdido). O servidor
// também fica fora do ar por um tempo, e o broker guarda as mensagens da sua sessão.
import fs from "node:fs";
import path from "node:path";
import mqtt from "mqtt";
import { type Acesso, FilaLocal, Recebedor } from "./dispositivo.ts";

const URL = process.env.MQTT_URL!;
const TOPICO = "portaria/12/acessos";
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const acesso = (n: number): Acesso => ({
  id: `porteiro-1:${n}`,
  placa: `ABC${String(n).padStart(4, "0")}`,
  momento: `2026-11-05T08:${String(n).padStart(2, "0")}:00`,
});

// O servidor, em MQTT 5: Clean Start desligado (clean: false) retoma a sessão que
// existir, e o Session Expiry Interval diz por quanto tempo o broker a guarda depois
// que a conexão cai. Sem ele (ou com 0), a sessão termina junto com a conexão, e o
// que chegar enquanto o servidor estiver fora do ar se perde.
const recebedor = new Recebedor();
const opcoesDoServidor = {
  clientId: "morada-servidor",
  protocolVersion: 5 as const,
  clean: false,
  properties: { sessionExpiryInterval: 3600 }, // uma hora, em segundos
};
// O tratador entra antes da conexão: o broker entrega o que guardou logo ao reconectar
async function ligarServidor() {
  const servidor = mqtt.connect(URL, opcoesDoServidor);
  servidor.on("message", (_t, m) => recebedor.receber(JSON.parse(m.toString())));
  await new Promise((ok) => servidor.once("connect", ok));
  await servidor.subscribeAsync(TOPICO, { qos: 1 });
  return servidor;
}

let servidor = await ligarServidor();
fs.rmSync("/tmp/portaria.db", { force: true });
const fila = new FilaLocal("/tmp/portaria.db");
const opcoesDoDispositivo = { clientId: "porteiro-1", protocolVersion: 5 as const };
let dispositivo = await mqtt.connectAsync(URL, opcoesDoDispositivo);
const linhas: string[] = [];

for (let n = 1; n <= 3; n++) fila.registrar(acesso(n));
await fila.esvaziar(dispositivo, TOPICO);

await dispositivo.endAsync(); // a rede da portaria caiu
for (let n = 4; n <= 7; n++) fila.registrar(acesso(n));
linhas.push(`sem rede: acessos 4 a 7 na fila local (${fila.tamanho} pendentes)`);

await esperar(500); // o servidor confirma ao broker o que já recebeu
await servidor.endAsync(); // e o servidor do Morada reinicia
dispositivo = await mqtt.connectAsync(URL, opcoesDoDispositivo);
await fila.esvaziar(dispositivo, TOPICO);
linhas.push(`a rede voltou: fila local esvaziada (${fila.tamanho} pendentes)`);

// A confirmação do acesso 7 "se perdeu", e o dispositivo o envia de novo
await dispositivo.publishAsync(TOPICO, JSON.stringify(acesso(7)), { qos: 1 });
for (let n = 8; n <= 10; n++) fila.registrar(acesso(n));
await fila.esvaziar(dispositivo, TOPICO);

servidor = await ligarServidor(); // o servidor volta e recebe o que o broker guardou
await esperar(1000);
linhas.push(
  `o servidor recebeu ${recebedor.recebidos.length} acessos, na ordem: ` +
    recebedor.recebidos.map((a) => a.id.split(":")[1]).join(", "),
  `repetições ignoradas: ${recebedor.repetidos}`,
);

await Promise.all([dispositivo.endAsync(), servidor.endAsync()]);
fila.fechar();
const saida = path.join(process.argv[2], "saida", "offline");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
