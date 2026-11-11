// Testes de contrato das portas: a mesma bateria roda contra os adaptadores em
// memória e contra os da AWS (no LocalStack). Se um adaptador promete o que o
// outro não cumpre, é aqui que aparece.
import { beforeAll, describe, expect, it } from "vitest";
import { nuvemAws } from "../src/aws.ts";
import { criarClientes } from "../src/clientes.ts";
import { destruir, nomes, provisionar } from "../src/infra.ts";
import { nuvemEmMemoria } from "../src/memoria.ts";
import type { Nuvem } from "../src/portas.ts";

const fabricas: [string, () => Promise<Nuvem>][] = [
  ["em memória", async () => nuvemEmMemoria()],
  [
    "AWS no LocalStack",
    async () => {
      const c = criarClientes();
      const n = nomes("contrato");
      await destruir(c, n);
      await provisionar(c, n);
      return nuvemAws(c, n);
    },
  ],
];

describe.each(fabricas)("as portas, %s", (_, fabrica) => {
  let nuvem: Nuvem;
  beforeAll(async () => {
    nuvem = await fabrica();
  }, 60_000);

  it("guarda e lê um arquivo; caminho inexistente devolve undefined", async () => {
    const conteudo = new TextEncoder().encode("%PDF-1.7 teste");
    await nuvem.arquivos.guardar("t/1.pdf", conteudo, "application/pdf");
    expect(await nuvem.arquivos.ler("t/1.pdf")).toEqual(conteudo);
    expect(await nuvem.arquivos.ler("t/nao-existe.pdf")).toBeUndefined();
  });

  it("registra um documento só uma vez e o lê logo depois", async () => {
    const d = { condominio: "201", mes: "2026-10", caminho: "x", bytes: 10 };
    expect(await nuvem.documentos.registrarSeNovo(d)).toBe(true);
    expect(await nuvem.documentos.registrarSeNovo({ ...d, bytes: 99 })).toBe(false);
    expect(await nuvem.documentos.doCondominio("201")).toEqual([d]);
  });

  it("entrega a tarefa e não a repete depois de confirmada", async () => {
    const tarefa = { tipo: "avisar-moradores" as const, condominio: "301", mes: "x" };
    await nuvem.tarefas.publicar(tarefa);
    const [recebida] = await nuvem.tarefas.receber(10);
    expect(recebida.tarefa).toEqual(tarefa);
    await nuvem.tarefas.confirmar(recebida);
    expect(await nuvem.tarefas.receber(10)).toEqual([]);
  });
});
