// Teste de ponta a ponta: o cliente do monólito, a API real e o PostgreSQL juntos.
// Poucos, lentos e valiosos: provam que as peças foram ligadas corretamente.
import { describe, expect, it } from "vitest";
import { criarApi, subir } from "../src/comunicacao/api.ts";
import { Comunicacao } from "../src/comunicacao/dominio.ts";
import { AvisosNoPostgres } from "../src/comunicacao/postgres.ts";
import { ClienteComunicacao } from "../src/monolito/cliente.ts";

describe.skipIf(!process.env.BANCO_URL)(
  "ponta a ponta: monólito, serviço e banco",
  () => {
    it("envia o aviso uma vez e reconhece o reenvio", async () => {
      const { avisos, fechar } = await AvisosNoPostgres.conectar(
        process.env.BANCO_URL!,
      );
      const api = criarApi(new Comunicacao(avisos));
      const cliente = new ClienteComunicacao(await subir(api));
      expect(await cliente.avisar("E-1", "pagamento recebido")).toEqual({
        ok: true,
        repetido: false,
      });
      expect(await cliente.avisar("E-1", "pagamento recebido")).toEqual({
        ok: true,
        repetido: true,
      });
      api.close();
      await fechar();
    });
  },
);
