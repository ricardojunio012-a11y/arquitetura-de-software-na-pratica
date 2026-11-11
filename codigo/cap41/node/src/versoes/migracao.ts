// Passo 3: migrar os dados do Acácias para o Morada e conferir. Primeiro a cópia
// ingênua, depois pela camada anticorrupção, e depois de novo, para ver que repetir
// a migração não duplica nada.
import { REGRAS_V1 } from "../acl/beta.ts";
import { Saida } from "../comum.ts";
import { ACACIAS, criarLegado } from "../legado/banco.ts";
import { conferir, migrar, migrarIngenuo, type Linha } from "../migracao.ts";
import { criarMorada } from "../morada/banco.ts";

function mostrar(saida: Saida, linhas: Linha[]): void {
  saida.escrever(
    "  item                                      legado   Morada  quarent.",
  );
  let erros = 0;
  for (const l of linhas) {
    const ok = l.legado === l.morada + l.quarentena;
    if (!ok) erros++;
    const n = (x: number) => String(x).padStart(9);
    saida.escrever(
      `  ${l.item.padEnd(40)}${n(l.legado)}${n(l.morada)}${n(l.quarentena)}` +
        `  ${ok ? "ok" : "DIFERENTE"}`,
    );
  }
  saida.escrever(
    `  conferência: ${erros === 0 ? "aprovada" : `${erros} itens com diferença`}`,
  );
}

export async function migracao(saida: Saida): Promise<void> {
  const legado = criarLegado();
  const ate = "2026-10";

  saida.escrever("1. cópia ingênua (parseFloat, new Date, vaga como unidade)");
  const ingenuo = await criarMorada();
  await migrarIngenuo(legado, ingenuo, ACACIAS, ate);
  mostrar(saida, await conferir(legado, ingenuo, ACACIAS, ate));
  await ingenuo.close();

  saida.escrever();
  saida.escrever("2. pela camada anticorrupção");
  const morada = await criarMorada();
  await migrar(legado, morada, ACACIAS, ate, REGRAS_V1);
  mostrar(saida, await conferir(legado, morada, ACACIAS, ate));

  saida.escrever();
  saida.escrever("3. a mesma migração de novo (idempotente)");
  await migrar(legado, morada, ACACIAS, ate, REGRAS_V1);
  mostrar(saida, await conferir(legado, morada, ACACIAS, ate));
  await morada.close();
}
