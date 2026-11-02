# Repositório de avisos no PostgreSQL. A chave primária garante, no banco, que o
# mesmo aviso não é gravado duas vezes.
import psycopg


class AvisosNoPostgres:
    def __init__(self, banco: psycopg.Connection):
        self._banco = banco

    @staticmethod
    def conectar(url: str) -> "AvisosNoPostgres":
        banco = psycopg.connect(url, autocommit=True)
        banco.execute("DROP TABLE IF EXISTS avisos")
        banco.execute("CREATE TABLE avisos (id text PRIMARY KEY, texto text NOT NULL)")
        return AvisosNoPostgres(banco)

    def ja_enviado(self, id: str) -> bool:
        linha = self._banco.execute("SELECT 1 FROM avisos WHERE id = %s", (id,))
        return linha.fetchone() is not None

    def registrar(self, id: str, texto: str) -> None:
        self._banco.execute("INSERT INTO avisos VALUES (%s, %s)", (id, texto))

    def fechar(self) -> None:
        self._banco.close()
