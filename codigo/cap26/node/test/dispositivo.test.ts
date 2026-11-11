// O recebedor ignora repetições pelo identificador do acesso, e mantém a ordem.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FilaLocal, Recebedor } from "../src/dispositivo.ts";

describe("recebedor de acessos", () => {
  it("ignora um acesso repetido", () => {
    const r = new Recebedor();
    const a = { id: "p:1", placa: "ABC0001", momento: "2026-11-05T08:01:00" };
    const b = { id: "p:2", placa: "ABC0002", momento: "2026-11-05T08:02:00" };
    r.receber(a);
    r.receber(b);
    r.receber(a);
    expect(r.recebidos.map((x) => x.id)).toEqual(["p:1", "p:2"]);
    expect(r.repetidos).toBe(1);
  });
});

describe("fila local", () => {
  it("num arquivo, sobrevive a fechar e abrir de novo, na mesma ordem", () => {
    const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "f")), "fila.db");
    const antes = new FilaLocal(arquivo);
    antes.registrar({ id: "p:1", placa: "ABC0001", momento: "2026-11-05T08:01:00" });
    antes.registrar({ id: "p:2", placa: "ABC0002", momento: "2026-11-05T08:02:00" });
    antes.fechar();
    const depois = new FilaLocal(arquivo);
    expect(depois.tamanho).toBe(2);
    depois.fechar();
  });
});
