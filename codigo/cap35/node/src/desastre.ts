// Cenário "desastre": o servidor do banco é perdido. Sobra o que estava fora
// dele: o backup base e os segmentos de WAL já arquivados.
import { Relato, conectar } from "./comum.ts";
import * as b from "./backup.ts";
import * as d from "./dados.ts";

const raiz = process.argv[2];
const relato = new Relato(raiz, "desastre");
const db = await conectar(process.env.BANCO_URL!);

relato.dizer("Morada: o servidor do banco é perdido");
relato.dizer();
await d.preparar(db);
b.backupBase("/copias/base");
relato.dizer(`1. Backup base: ${await d.assinatura(db)}`);

await d.pagar(db, 300);
await b.fecharSegmento(db);
relato.dizer("2. 300 pagamentos; o segmento de WAL fecha e vai para o arquivo");

await d.pagar(db, 40);
const noPrimario = await d.contarPagas(db);
relato.dizer("3. Mais 40 pagamentos, no segmento ainda aberto no servidor");
relato.dizer(`   cobranças pagas no primário: ${noPrimario}`);

// O primário não é usado daqui em diante: é como se o disco tivesse queimado
relato.zerarRelogio();
relato.dizer("4. O servidor é perdido; restauração do backup base com todo o WAL");
relato.dizer("   arquivado, sem alvo: a recuperação vai até o último segmento");
const restaurado = await b.restaurar("/copias/base", "/tmp/restauracao");
relato.marcar("instância restaurada e promovida");
const recuperadas = await d.contarPagas(restaurado);
relato.dizer(`   cobranças pagas no banco restaurado: ${recuperadas}`);
relato.dizer(
  `   pagamentos perdidos (RPO): ${noPrimario - recuperadas}, os do segmento que ` +
    "não chegou ao arquivo",
);
await restaurado.end();
b.pararRestaurado("/tmp/restauracao");
relato.dizer();
relato.dizer(
  "Com archive_timeout = 60, o segmento fecharia a cada minuto: o RPO ficaria",
);
relato.dizer(
  'limitado a cerca de um minuto de transações, em vez de "até encher 16 MB".',
);
relato.gravar();
await db.end();
