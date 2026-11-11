// A versão "abandono": o worker recebe a tarefa e cai antes de confirmar.
// A porta promete entrega "pelo menos uma vez": na AWS, passado o prazo de
// visibilidade, a tarefa volta; o adaptador em memória não cumpre a promessa.
import { setTimeout as esperar } from "node:timers/promises";
import { nuvemAws } from "./aws.ts";
import { criarClientes } from "./clientes.ts";
import { destruir, nomes, provisionar } from "./infra.ts";
import { nuvemEmMemoria } from "./memoria.ts";
import type { Nuvem } from "./portas.ts";
import { gravar } from "./saida.ts";

async function abandonar(nuvem: Nuvem) {
  await nuvem.tarefas.publicar({
    tipo: "avisar-moradores",
    condominio: "104",
    mes: "2026-10",
  });
  const primeira = await nuvem.tarefas.receber(10); // e o worker cai aqui
  await esperar(3000); // passa o prazo de visibilidade, de 2 s
  const segunda = await nuvem.tarefas.receber(10); // outro worker tenta
  return [primeira.length, segunda.length];
}

const c = criarClientes();
const n = nomes("abandono");
await destruir(c, n);
await provisionar(c, n, 2);
const [m1, m2] = await abandonar(nuvemEmMemoria());
const [a1, a2] = await abandonar(await nuvemAws(c, n));
const coluna = (a: unknown, b: unknown) => String(a).padEnd(12) + String(b);
gravar("abandono", [
  "o worker recebe a tarefa e cai antes de confirmar; 3 s depois, outro tenta",
  `${"".padEnd(32)}${coluna("em memória", "na AWS (LocalStack)")}`,
  "tarefas na primeira entrega".padEnd(32) + coluna(m1, a1),
  "tarefas depois do prazo".padEnd(32) + coluna(m2, a2),
  "a tarefa se perdeu".padEnd(32) + coluna(m2 ? "não" : "sim", a2 ? "não" : "sim"),
]);
