// Módulo de reservas original, escrito às pressas para a primeira assembleia.
// NAO MEXER sem falar com o Jorge!!! (calcula fim de semana)
// Etapa 2: só os pontos de costura. A data de hoje e o envio de e-mails entram por
// parâmetro, com o comportamento antigo como padrão. Nada mais mudou.
import fs from "node:fs";

var aprovadas: any[] = [];
var log: string[] = [];

var smtp = {
  enviar(para: string, txt: string) {
    log.push("para " + para + ": " + txt);
  },
};

export function processarReservas(
  arq: string,
  pasta: string,
  hj: Date = new Date(),
  correio = smtp,
) {
  var d = JSON.parse(fs.readFileSync(arq, "utf8"));
  var out: string[] = [];
  for (var p of d.pedidos) {
    var u = d.unidades.find((x: any) => x.id == p.unidade);
    var e = d.espacos.find((x: any) => x.id == p.espaco);
    var ok = true;
    var msg = "";
    if (u.emDebito) {
      ok = false;
      msg = "débito";
    } else {
      var dt = new Date(p.data + "T00:00:00Z");
      var h = Date.UTC(hj.getUTCFullYear(), hj.getUTCMonth(), hj.getUTCDate());
      var n = Math.round((dt.getTime() - h) / 86400000);
      if (n < 2) {
        ok = false;
        msg = "antecedência";
      } else {
        for (var a of aprovadas) {
          if (a.espaco == p.espaco && a.data == p.data) {
            ok = false;
            msg = "conflito";
          }
        }
      }
    }
    if (ok) {
      // calcula o valor
      var v = e.taxa;
      var dt2 = new Date(p.data + "T00:00:00Z");
      if (dt2.getUTCDay() == 6) v = v + (v * 20) / 100; // fim de semana
      if (p.convidados > 50) v = v + 5000;
      aprovadas.push(p);
      var vv = Math.floor(v / 100) + "," + String(v % 100).padStart(2, "0");
      out.push(`${p.id};${p.unidade};${p.espaco};${p.data};aprovada;${vv}`);
      correio.enviar(u.email, "Reserva " + p.id + " confirmada. Valor: R$ " + vv);
    } else {
      out.push(`${p.id};${p.unidade};${p.espaco};${p.data};recusada;${msg}`);
      correio.enviar(u.email, "Reserva " + p.id + " recusada (" + msg + ")");
    }
  }
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(pasta + "/reservas.txt", out.join("\n") + "\n");
  fs.writeFileSync(pasta + "/emails.txt", log.join("\n") + "\n");
}

// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Só roda quando o arquivo é o programa, e não quando um teste o importa
if (process.argv[1] === import.meta.filename) {
  const [entrada, saida, opcao, data] = process.argv.slice(2);
  const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
  processarReservas(entrada, saida, hoje);
}
