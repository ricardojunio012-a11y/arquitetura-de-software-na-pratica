// Cenário "pitr": uma tabela apagada por engano e recuperada até o instante
// anterior ao acidente, numa instância à parte, sem perder o que veio depois.
import { Relato, conectar } from "./comum.ts";
import * as b from "./backup.ts";
import * as d from "./dados.ts";

const raiz = process.argv[2];
const relato = new Relato(raiz, "pitr");
const url = process.env.BANCO_URL!;
const db = await conectar(url);

relato.dizer("Morada: recuperação a um ponto no tempo (PITR)");
relato.dizer();
await d.preparar(db);
relato.dizer("1. Antes do backup");
relato.dizer(`   cobranças: ${await d.assinatura(db)}`);

b.backupBase("/copias/base");
relato.dizer("2. Backup base com pg_basebackup; daqui em diante, só o WAL é copiado");

await d.pagar(db, 400);
await d.publicarAvisos(db, 20);
const antes = await d.assinatura(db);
relato.dizer("3. O dia continua: 400 pagamentos e 20 avisos depois do backup");
relato.dizer(`   cobranças: ${antes}`);

// O acidente. O instante vem do relógio do servidor, como viria do log
// de auditoria ou do pg_waldump numa investigação real
const { rows } = await db.query(
  "SELECT to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS.US') AS t",
);
const instante = `${rows[0].t}+00`;
await db.query("DROP TABLE financeiro.cobrancas");
relato.dizer("4. Por engano, DROP TABLE financeiro.cobrancas na produção");
await d.publicarAvisos(db, 15);
relato.dizer("   o resto do Morada continua no ar: 15 avisos publicados depois");
try {
  await d.contarPagas(db);
} catch (erro) {
  const codigo = (erro as { code?: string }).code;
  relato.dizer(`   a tela de cobranças falha: erro ${codigo} (a tabela não existe)`);
}

relato.zerarRelogio(); // o RTO conta a partir da descoberta
await b.fecharSegmento(db);
relato.dizer("5. Restauração numa instância à parte, até o instante anterior ao DROP");
relato.dizer("   o segmento de WAL aberto é fechado e arquivado");
relato.marcar("segmento de WAL arquivado");
const restaurado = await b.restaurar("/copias/base", "/tmp/restauracao", instante);
relato.marcar("instância restaurada e promovida");
const recuperada = await d.assinatura(restaurado);
relato.dizer(`   cobranças restauradas: ${recuperada}`);
relato.dizer(
  `   iguais às de antes do acidente: ${recuperada === antes ? "sim" : "NÃO"}`,
);
const avisosRestaurados = await d.contarAvisos(restaurado);
const avisosProducao = await d.contarAvisos(db);
relato.dizer(
  `   avisos na instância restaurada: ${avisosRestaurados}; na produção: ` +
    `${avisosProducao}`,
);
relato.dizer(
  `   voltar o banco inteiro ao passado perderia ` +
    `${avisosProducao - avisosRestaurados} avisos`,
);
await restaurado.end();

b.copiarTabela("financeiro.cobrancas", url);
relato.marcar("tabela copiada de volta para a produção");
b.pararRestaurado("/tmp/restauracao");
const depois = await d.assinatura(db);
relato.dizer("6. Só a tabela volta para a produção, com pg_dump e psql");
relato.dizer(`   cobranças na produção: ${depois}`);
relato.dizer(`   avisos na produção: ${await d.contarAvisos(db)}`);
const perdidos = 400 - (await d.contarPagas(db));
relato.dizer(`   pagamentos perdidos (RPO): ${perdidos}`);
relato.dizer();
relato.dizer("O tempo de cada etapa (o RTO medido) fica em saida/tempos/pitr.txt.");
relato.gravar();
await db.end();
