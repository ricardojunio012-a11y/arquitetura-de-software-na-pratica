// Três formas de reservar a churrasqueira, do jeito que muitos sistemas começam até a
// garantia no banco.
import type pg from "pg";

export interface Pedido {
  morador: string;
  inicio: string;
  fim: string;
}

const periodo = (p: Pedido) => `[${p.inicio}, ${p.fim})`;

// Confere e insere: entre o SELECT e o INSERT, outro pedido pode fazer o mesmo
export async function reservarIngenuo(banco: pg.Client, p: Pedido): Promise<boolean> {
  const { rows } = await banco.query(
    "SELECT 1 FROM reservas_ingenuas WHERE espaco = 'churrasqueira' AND periodo && $1",
    [periodo(p)],
  );
  if (rows.length > 0) return false;
  await banco.query(
    "INSERT INTO reservas_ingenuas (espaco, morador, periodo) " +
      "VALUES ('churrasqueira', $1, $2)",
    [p.morador, periodo(p)],
  );
  return true;
}

// Bloqueio otimista: lê a versão da agenda, confere e grava; a gravação só vale se a
// versão ainda for a lida. Se outro gravou antes, desfaz e recusa (ou tenta de novo)
export async function reservarOtimista(banco: pg.Client, p: Pedido): Promise<boolean> {
  await banco.query("BEGIN");
  try {
    const { rows: agenda } = await banco.query(
      "SELECT versao FROM agendas WHERE espaco = 'churrasqueira'",
    );
    const { rows: conflitos } = await banco.query(
      "SELECT 1 FROM reservas_otimistas " +
        "WHERE espaco = 'churrasqueira' AND periodo && $1",
      [periodo(p)],
    );
    if (conflitos.length > 0) {
      await banco.query("ROLLBACK");
      return false;
    }
    await banco.query(
      "INSERT INTO reservas_otimistas (espaco, morador, periodo) " +
        "VALUES ('churrasqueira', $1, $2)",
      [p.morador, periodo(p)],
    );
    const { rowCount } = await banco.query(
      "UPDATE agendas SET versao = versao + 1 " +
        "WHERE espaco = 'churrasqueira' AND versao = $1",
      [agenda[0].versao],
    );
    if (rowCount === 0) {
      await banco.query("ROLLBACK"); // outra reserva mudou a agenda depois da leitura
      return false;
    }
    await banco.query("COMMIT");
    return true;
  } catch (erro) {
    await banco.query("ROLLBACK");
    throw erro;
  }
}

// Restrição de exclusão: só insere; o banco recusa a sobreposição com o erro 23P01.
// Inserções simultâneas que se conferem uma à outra podem cair em impasse (40P01):
// o banco desfaz uma delas, e ela tenta de novo
export async function reservarComRestricao(
  banco: pg.Client,
  p: Pedido,
): Promise<boolean> {
  for (;;) {
    try {
      await banco.query(
        "INSERT INTO reservas (espaco, morador, periodo) " +
          "VALUES ('churrasqueira', $1, $2)",
        [p.morador, periodo(p)],
      );
      return true;
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === "23P01") return false;
      if (codigo !== "40P01") throw erro;
    }
  }
}
