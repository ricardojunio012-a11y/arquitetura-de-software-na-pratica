// A API pública do Morada para administradoras. Os erros seguem a RFC 9457 (problem
// details), a listagem é paginada por cursor e o pagamento exige uma chave de
// idempotência no cabeçalho Idempotency-Key. Cada administradora só enxerga os
// condomínios que administra.
import http from "node:http";
import type pg from "pg";

const PROBLEMAS = "https://api.morada.example/problemas/";

class Problema extends Error {
  status: number;
  tipo: string;
  titulo: string;

  constructor(status: number, tipo: string, titulo: string, detalhe: string) {
    super(detalhe);
    this.status = status;
    this.tipo = tipo;
    this.titulo = titulo;
  }

  get corpo() {
    const { status, titulo, message } = this;
    return { type: PROBLEMAS + this.tipo, title: titulo, status, detail: message };
  }
}

interface Resposta {
  status: number;
  corpo: object;
}

// O cursor é opaco para o cliente: o último identificador da página, em base64url
const cursorDe = (id: string) => Buffer.from(id).toString("base64url");
const idDoCursor = (cursor: string) => Buffer.from(cursor, "base64url").toString();

async function listarCobrancas(
  banco: pg.Pool,
  administradora: string,
  condominio: string,
  consulta: URLSearchParams,
): Promise<Resposta> {
  const limite = Number(consulta.get("limite") ?? 20);
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    const recebido = consulta.get("limite");
    throw new Problema(
      400,
      "limite-invalido",
      "Limite inválido",
      `limite deve estar entre 1 e 100, recebido ${recebido}`,
    );
  }
  const situacao = consulta.get("situacao");
  if (situacao !== null && !["aberta", "paga"].includes(situacao)) {
    throw new Problema(
      400,
      "situacao-invalida",
      "Situação inválida",
      `situação deve ser aberta ou paga, recebido ${situacao}`,
    );
  }
  // Autorização por objeto: o condomínio de outra administradora responde como se
  // não existisse, para não revelar nem que ele existe
  const existe = await banco.query(
    "SELECT 1 FROM condominios WHERE id = $1 AND administradora = $2",
    [condominio, administradora],
  );
  if (existe.rows.length === 0) {
    throw new Problema(
      404,
      "condominio-inexistente",
      "Condomínio não encontrado",
      `não existe o condomínio ${condominio}`,
    );
  }
  const depoisDe = consulta.has("cursor") ? idDoCursor(consulta.get("cursor")!) : "";
  // Uma linha a mais que o limite diz se existe a próxima página
  const { rows } = await banco.query(
    `SELECT id, unidade, vencimento::text, valor_centavos, situacao FROM cobrancas
     WHERE condominio = $1 AND ($2::text IS NULL OR situacao = $2) AND id > $3
     ORDER BY id LIMIT $4`,
    [condominio, situacao, depoisDe, limite + 1],
  );
  const dados = rows.slice(0, limite).map((c) => ({
    id: c.id,
    unidade: c.unidade,
    vencimento: c.vencimento,
    valorCentavos: c.valor_centavos,
    situacao: c.situacao,
  }));
  const proximo = rows.length > limite ? cursorDe(dados.at(-1)!.id) : null;
  return { status: 200, corpo: { dados, proximo } };
}

interface NovoPagamento {
  cobranca: string;
  valorCentavos: number;
}

// As regras do pagamento, dentro da transação aberta por registrarPagamento
async function pagar(
  banco: pg.PoolClient,
  administradora: string,
  pedido: NovoPagamento,
): Promise<Resposta> {
  // A cobrança precisa ser de um condomínio da própria administradora
  const { rows } = await banco.query(
    `SELECT valor_centavos, situacao FROM cobrancas
     WHERE id = $1 AND condominio IN
       (SELECT id FROM condominios WHERE administradora = $2)
     FOR UPDATE`,
    [pedido.cobranca, administradora],
  );
  if (rows.length === 0) {
    throw new Problema(
      422,
      "cobranca-inexistente",
      "Cobrança não encontrada",
      `não existe a cobrança ${pedido.cobranca}`,
    );
  }
  const [cobranca] = rows;
  if (cobranca.situacao === "paga") {
    throw new Problema(
      409,
      "cobranca-paga",
      "Cobrança já paga",
      `a cobrança ${pedido.cobranca} já foi paga`,
    );
  }
  if (cobranca.valor_centavos !== pedido.valorCentavos) {
    throw new Problema(
      422,
      "valor-divergente",
      "Valor divergente",
      `a cobrança ${pedido.cobranca} vale ${cobranca.valor_centavos} centavos, ` +
        `e o pagamento informou ${pedido.valorCentavos}`,
    );
  }
  const {
    rows: [{ id }],
  } = await banco.query(
    "SELECT 'PG-' || lpad(nextval('pagamentos_seq')::text, 4, '0') AS id",
  );
  await banco.query("INSERT INTO pagamentos VALUES ($1, $2, $3)", [
    id,
    pedido.cobranca,
    pedido.valorCentavos,
  ]);
  await banco.query("UPDATE cobrancas SET situacao = 'paga' WHERE id = $1", [
    pedido.cobranca,
  ]);
  const corpo = { id, ...pedido, situacao: "confirmado" };
  return { status: 201, corpo };
}

// Chave de idempotência: a chave e a resposta são gravadas na mesma transação do
// pagamento. Repetir o pedido devolve a resposta guardada, sem pagar de novo. A chave
// vale dentro de uma administradora: duas administradoras podem gerar a mesma.
async function registrarPagamento(
  banco: pg.Pool,
  administradora: string,
  chave: string | undefined,
  corpo: Partial<NovoPagamento>,
): Promise<Resposta> {
  if (!chave) {
    throw new Problema(
      400,
      "chave-ausente",
      "Chave de idempotência ausente",
      "envie o cabeçalho Idempotency-Key com um identificador único do pedido",
    );
  }
  if (typeof corpo.cobranca !== "string" || !Number.isInteger(corpo.valorCentavos)) {
    throw new Problema(
      400,
      "pedido-invalido",
      "Pedido inválido",
      "informe cobranca (texto) e valorCentavos (inteiro)",
    );
  }
  // A forma canônica do pedido: só os campos que a operação usa, sempre na mesma
  // ordem. A ordem dos campos no JSON do cliente não muda a comparação.
  const pedido = { cobranca: corpo.cobranca, valorCentavos: corpo.valorCentavos! };
  const conexao = await banco.connect();
  try {
    await conexao.query("BEGIN");
    // Quem grava a chave primeiro processa o pedido. Um pedido simultâneo com a mesma
    // chave espera aqui o primeiro terminar e depois encontra a resposta pronta.
    const nova = await conexao.query(
      "INSERT INTO chaves_idempotencia (administradora, chave, pedido) " +
        "VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [administradora, chave, JSON.stringify(pedido)],
    );
    if (nova.rowCount === 0) {
      const {
        rows: [anterior],
      } = await conexao.query(
        "SELECT pedido, status, resposta FROM chaves_idempotencia " +
          "WHERE administradora = $1 AND chave = $2",
        [administradora, chave],
      );
      await conexao.query("COMMIT");
      if (anterior.pedido !== JSON.stringify(pedido)) {
        throw new Problema(
          422,
          "chave-reutilizada",
          "Chave de idempotência reutilizada",
          `a chave ${chave} já foi usada com outro pedido`,
        );
      }
      return { status: anterior.status, corpo: JSON.parse(anterior.resposta) };
    }
    let resposta: Resposta;
    try {
      resposta = await pagar(conexao, administradora, pedido);
    } catch (erro) {
      if (!(erro instanceof Problema)) throw erro;
      resposta = { status: erro.status, corpo: erro.corpo };
    }
    await conexao.query(
      "UPDATE chaves_idempotencia SET status = $3, resposta = $4 " +
        "WHERE administradora = $1 AND chave = $2",
      [administradora, chave, resposta.status, JSON.stringify(resposta.corpo)],
    );
    await conexao.query("COMMIT");
    return resposta;
  } catch (erro) {
    await conexao.query("ROLLBACK");
    throw erro;
  } finally {
    conexao.release();
  }
}

export function criarApi(banco: pg.Pool) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url!, "http://api");
    let resposta: Resposta;
    try {
      // Em produção, o gateway valida o token OAuth 2.0 e repassa a administradora
      // dona do token. No laboratório, o cabeçalho Morada-Administradora faz esse
      // papel, e quem o envia é tratado como autenticado.
      const administradora = req.headers["morada-administradora"] as string;
      if (!administradora) {
        throw new Problema(
          401,
          "nao-autenticado",
          "Cliente não identificado",
          "envie o token de acesso (aqui, o cabeçalho Morada-Administradora)",
        );
      }
      const cobrancas = url.pathname.match(/^\/v1\/condominios\/([^/]+)\/cobrancas$/);
      if (req.method === "GET" && cobrancas) {
        const consulta = url.searchParams;
        resposta = await listarCobrancas(banco, administradora, cobrancas[1], consulta);
      } else if (req.method === "POST" && url.pathname === "/v1/pagamentos") {
        let texto = "";
        for await (const parte of req) texto += parte;
        const chave = req.headers["idempotency-key"] as string | undefined;
        const corpo = JSON.parse(texto);
        resposta = await registrarPagamento(banco, administradora, chave, corpo);
      } else {
        throw new Problema(
          404,
          "rota-inexistente",
          "Rota não encontrada",
          `não existe ${req.method} ${url.pathname}`,
        );
      }
    } catch (erro) {
      if (!(erro instanceof Problema)) throw erro;
      resposta = { status: erro.status, corpo: erro.corpo };
    }
    const tipo =
      resposta.status >= 400 ? "application/problem+json" : "application/json";
    const cabecalhos: Record<string, string> = { "Content-Type": tipo };
    // O 401 diz ao cliente como se autenticar (RFC 9110)
    if (resposta.status === 401) cabecalhos["WWW-Authenticate"] = "Bearer";
    res.writeHead(resposta.status, cabecalhos);
    res.end(JSON.stringify(resposta.corpo));
  });
}

// Sobe a API numa porta livre e devolve o endereço
export async function subir(servidor: http.Server): Promise<string> {
  await new Promise<void>((pronto) => servidor.listen(0, "127.0.0.1", pronto));
  const { port } = servidor.address() as { port: number };
  return `http://127.0.0.1:${port}`;
}
