<?php
// Repositório de avisos no PostgreSQL. A chave primária garante, no banco, que o
// mesmo aviso não é gravado duas vezes.
namespace Morada\Comunicacao;

require_once __DIR__ . '/dominio.php';

use PDO;

final class AvisosNoPostgres implements RepositorioDeAvisos
{
    public function __construct(private readonly PDO $banco) {}

    public static function conectar(string $url, bool $recriar = true): self
    {
        $u = parse_url($url);
        $banco = new PDO(
            "pgsql:host={$u['host']};port={$u['port']};dbname=" .
                ltrim($u['path'], '/'),
            $u['user'],
            $u['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );
        if ($recriar) {
            $banco->exec('DROP TABLE IF EXISTS avisos');
            $banco->exec(
                'CREATE TABLE avisos (id text PRIMARY KEY, texto text NOT NULL)',
            );
        }
        return new self($banco);
    }

    public function jaEnviado(string $id): bool
    {
        $consulta = $this->banco->prepare('SELECT 1 FROM avisos WHERE id = ?');
        $consulta->execute([$id]);
        return $consulta->fetchColumn() !== false;
    }

    public function registrar(string $id, string $texto): void
    {
        $this->banco
            ->prepare('INSERT INTO avisos VALUES (?, ?)')
            ->execute([$id, $texto]);
    }
}
