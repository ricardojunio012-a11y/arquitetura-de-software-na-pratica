// Módulo de reservas original, escrito às pressas para a primeira assembleia.
// NAO MEXER sem falar com o Jorge!!! (calcula fim de semana)
import fs from "node:fs";

var aprovadas: any[] = [];
var log: string[] = [];

var smtp = {
  enviar(para: string, txt: string) {
    log.push("para " + para + ": " + txt);
  },
};

export function processarReservas(arq: string, pasta: string) {
  var d = JSON.parse(fs.readFileSync(arq, "utf8"));
  var out: string[] = [];
  var hj = new Date();
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
      smtp.enviar(u.email, "Reserva " + p.id + " confirmada. Valor: R$ " + vv);
    } else {
      out.push(`${p.id};${p.unidade};${p.espaco};${p.data};recusada;${msg}`);
      smtp.enviar(u.email, "Reserva " + p.id + " recusada (" + msg + ")");
    }
  }
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(pasta + "/reservas.txt", out.join("\n") + "\n");
  fs.writeFileSync(pasta + "/emails.txt", log.join("\n") + "\n");
}

processarReservas(process.argv[2], process.argv[3]);
