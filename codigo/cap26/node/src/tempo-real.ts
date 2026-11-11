// A versão "tempo-real": o morador da A-101 está conectado à api1 e o da B-202 à
// api2. O porteiro registra os dois visitantes pela api1, primeiro sem e depois com o
// pub/sub do Redis entre as réplicas.
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

// As réplicas podem ainda estar subindo: tenta de novo até responderem
async function pedir(url: string, metodo = "GET") {
  for (;;) {
    try {
      return await fetch(url, { method: metodo });
    } catch {
      await esperar(300);
    }
  }
}

async function conectar(replica: string, unidade: string, recebidos: string[]) {
  for (;;) {
    try {
      const ws = new WebSocket(`ws://${replica}:3000/?unidade=${unidade}`);
      await new Promise((ok, falha) => {
        ws.on("message", (m) => {
          if (m.toString() === "conectado") ok(null);
          else recebidos.push(m.toString());
        });
        ws.on("error", falha);
      });
      return ws;
    } catch {
      await esperar(300); // a réplica ainda está subindo
    }
  }
}

const linhas: string[] = [];
for (const comRedis of [false, true]) {
  for (const r of ["api1", "api2"]) {
    await pedir(`http://${r}:3000/modo?redis=${comRedis ? "sim" : "nao"}`);
  }
  const doA: string[] = [];
  const doB: string[] = [];
  const a = await conectar("api1", "A-101", doA);
  const b = await conectar("api2", "B-202", doB);
  for (const [unidade, nome] of [
    ["A-101", "Carla"],
    ["B-202", "Davi"],
  ]) {
    await pedir(`http://api1:3000/visitantes?unidade=${unidade}&nome=${nome}`, "POST");
  }
  await esperar(500);
  linhas.push(
    `== ${comRedis ? "com" : "sem"} pub/sub entre as réplicas`,
    `morador da A-101 (conectado à api1): ${doA.join("; ") || "nada"}`,
    `morador da B-202 (conectado à api2): ${doB.join("; ") || "nada"}`,
    "",
  );
  a.close();
  b.close();
}

const saida = path.join(process.argv[2], "saida", "tempo-real");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n"));
console.log(linhas.join("\n"));
