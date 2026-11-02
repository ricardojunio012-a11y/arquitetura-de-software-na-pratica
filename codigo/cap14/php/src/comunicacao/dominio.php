<?php
// O serviço de Comunicação do capítulo 12, agora com um repositório de avisos: o
// mesmo aviso pedido duas vezes é enviado uma vez só.
namespace Morada\Comunicacao;

class DadosInvalidosErro extends \RuntimeException {}

interface RepositorioDeAvisos
{
    public function jaEnviado(string $id): bool;

    public function registrar(string $id, string $texto): void;
}

final class Comunicacao
{
    public function __construct(private readonly RepositorioDeAvisos $avisos) {}

    public function avisar(string $id, string $texto): string
    {
        if ($texto === '') {
            throw new DadosInvalidosErro('texto obrigatório');
        }
        if ($this->avisos->jaEnviado($id)) {
            return 'repetido';
        }
        $this->avisos->registrar($id, $texto);
        return 'enviado';
    }
}

final class AvisosEmMemoria implements RepositorioDeAvisos
{
    private array $avisos = [];

    public function jaEnviado(string $id): bool
    {
        return isset($this->avisos[$id]);
    }

    public function registrar(string $id, string $texto): void
    {
        $this->avisos[$id] = $texto;
    }
}
