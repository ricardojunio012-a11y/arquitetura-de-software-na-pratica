<?php
// Migrações versionadas: cada arquivo de migracoes/ roda uma única vez, em ordem, e
// fica registrado na tabela migracoes_aplicadas. Um arquivo que começa com
// "-- sem transação" roda fora de transação (CREATE INDEX CONCURRENTLY exige isso).
namespace Morada;

use PDO;

function aplicarMigracoes(PDO $banco, string $pasta, float $ate = INF): array
{
    $banco->exec(
        <<<SQL
        CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
          versao text PRIMARY KEY,
          aplicada_em timestamptz NOT NULL DEFAULT now()
        )
        SQL
        ,
    );
    $feitas = $banco
        ->query('SELECT versao FROM migracoes_aplicadas')
        ->fetchAll(PDO::FETCH_COLUMN);
    $registrar = $banco->prepare('INSERT INTO migracoes_aplicadas (versao) VALUES (?)');
    $arquivos = array_map('basename', glob("$pasta/*.sql"));
    sort($arquivos);
    $aplicadas = [];
    foreach ($arquivos as $arquivo) {
        if ((int) $arquivo > $ate) {
            break;
        }
        if (in_array($arquivo, $feitas, true)) {
            continue;
        }
        $sql = file_get_contents("$pasta/$arquivo");
        if (str_starts_with($sql, '-- sem transação')) {
            $banco->exec($sql);
            $registrar->execute([$arquivo]);
        } else {
            // A migração e o seu registro entram juntos, ou nenhum dos dois
            $banco->beginTransaction();
            try {
                $banco->exec($sql);
                $registrar->execute([$arquivo]);
                $banco->commit();
            } catch (\Throwable $erro) {
                $banco->rollBack();
                throw $erro;
            }
        }
        $aplicadas[] = $arquivo;
    }
    return $aplicadas;
}
