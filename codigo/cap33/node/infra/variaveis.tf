variable "ambiente" {
  description = "homologacao ou producao: o mesmo código cria os dois ambientes"
  type        = string
  default     = "homologacao"
}

variable "nuvem_url" {
  description = "Endereço da API da nuvem (aqui, o LocalStack)"
  type        = string
}

variable "banco_host" {
  type = string
}

# Valor de laboratório. Num ambiente real, a senha vem do cofre de segredos
# (capítulo 36) e nunca fica no repositório nem no estado em texto aberto.
variable "senha_relatorios" {
  type      = string
  sensitive = true
  default   = "relatorios-local"
}
