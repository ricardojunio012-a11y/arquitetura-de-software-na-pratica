// O dia 5: os boletos vencem, e os síndicos abrem o painel de inadimplência ao mesmo
// tempo. A taxa de chegada é fixa e independe da velocidade da API: se a API ficar
// lenta, os pedidos se acumulam, como no mundo real.
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    dia5: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 40, duration: "5s" },
        { target: 40, duration: "15s" },
        { target: 0, duration: "5s" },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const condominio = 1 + Math.floor(Math.random() * 20);
  const r = http.get(`${__ENV.BASE_URL}/condominios/${condominio}/inadimplentes`);
  check(r, { "status 200": (res) => res.status === 200 });
}
