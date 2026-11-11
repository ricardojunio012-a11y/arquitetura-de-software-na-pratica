<?php
// O relatório de inadimplentes do síndico, com o defeito que o capítulo usa para
// mostrar o vazamento: a consulta esqueceu o filtro de condomínio.
namespace Morada;

use PDO;

function inadimplentes(PDO $banco): array
{
    return $banco
        ->query(
            <<<SQL
            SELECT condominio_id, unidade, morador, valor_centavos
            FROM cobrancas
            WHERE situacao = 'aberta' -- falta: AND condominio_id = ?
            ORDER BY condominio_id, unidade
            SQL
            ,
        )
        ->fetchAll(PDO::FETCH_ASSOC);
}
