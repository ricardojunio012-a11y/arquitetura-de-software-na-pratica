// Cifragem por titular e trilha encadeada, sem banco.
import { describe, expect, it } from "vitest";
import { cifrar, decifrar, novaChave } from "../src/cripto.ts";
import { encadear, type Registro, verificar } from "../src/trilha.ts";

describe("crypto-shredding", () => {
  it("decifra com a chave do titular", () => {
    const chave = novaChave();
    expect(decifrar(chave, cifrar(chave, "Carlos Menezes"))).toBe("Carlos Menezes");
  });

  it("o mesmo texto cifrado duas vezes dá resultados diferentes", () => {
    const chave = novaChave();
    expect(cifrar(chave, "302")).not.toBe(cifrar(chave, "302"));
  });

  it("sem a chave certa, o dado é ilegível", () => {
    const cifrado = cifrar(novaChave(), "161.803.398-05");
    expect(() => decifrar(novaChave(), cifrado)).toThrow();
  });
});

describe("trilha encadeada", () => {
  const montar = (n: number) => {
    const trilha: Registro[] = [];
    for (let i = 1; i <= n; i++)
      trilha.push(
        encadear(trilha.at(-1), {
          momento: `2026-10-20T0${i}:00`,
          ator: "sindica.ana",
          acao: "consultou",
          alvo: `titular:${i}`,
        }),
      );
    return trilha;
  };

  it("uma trilha sem mudanças é íntegra", () => {
    const trilha = montar(5);
    expect(verificar(trilha, { seq: 5, hash: trilha[4].hash })).toEqual([]);
  });

  it("acusa um registro alterado", () => {
    const trilha = montar(5);
    trilha[2] = { ...trilha[2], ator: "sistema" };
    expect(verificar(trilha)).toEqual([
      "registro 3: conteúdo alterado depois de gravado",
    ]);
  });

  it("acusa um registro apagado no meio", () => {
    const trilha = montar(5);
    trilha.splice(1, 1);
    expect(verificar(trilha)).toEqual([
      "registro 3: elo quebrado, o anterior não confere",
    ]);
  });

  it("só a âncora acusa o fim cortado", () => {
    const trilha = montar(5);
    const ancora = { seq: 5, hash: trilha[4].hash };
    const cortada = trilha.slice(0, 3);
    expect(verificar(cortada)).toEqual([]);
    expect(verificar(cortada, ancora)).toEqual([
      "âncora no registro 5: ausente (a trilha termina no 3)",
    ]);
  });
});
