// Os IDs com o shard dentro e o roteador com shards lógicos.
import { describe, expect, it } from "vitest";
import { gerarId, lerId } from "../src/ids.ts";
import { Roteador } from "../src/roteador.ts";

describe("sharding", () => {
  it("o ID guarda o momento, o shard lógico e a sequência", () => {
    const agora = Date.UTC(2026, 9, 25, 12, 0, 0);
    const id = gerarId(agora, 7, 1500);
    expect(lerId(id)).toEqual({
      criadoEm: "2026-10-25T12:00:00.000Z",
      shardLogico: 7,
      sequencia: 1500 % 1024,
    });
    // IDs criados depois são maiores: a ordem do ID é a ordem de criação
    expect(gerarId(agora + 1, 0, 0) > id).toBe(true);
  });

  it("mover um shard lógico muda o destino só dos seus condomínios", () => {
    const roteador = new Roteador({
      0: "a",
      1: "a",
      2: "b",
      3: "b",
      4: "c",
      5: "c",
      6: "a",
      7: "a",
      8: "b",
      9: "b",
      10: "c",
      11: "c",
    });
    roteador.mover(7, "c");
    expect(roteador.fisico(7)).toBe("c");
    expect(roteador.fisico(19)).toBe("c"); // 19 % 12 = 7
    expect(roteador.fisico(6)).toBe("a");
  });
});
