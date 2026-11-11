// Cifragem autenticada (AES-256-GCM) com uma chave por titular.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const novaChave = (): Buffer => randomBytes(32);

export function cifrar(chave: Buffer, texto: string): string {
  const iv = randomBytes(12); // um vetor novo a cada cifragem
  const c = createCipheriv("aes-256-gcm", chave, iv);
  const corpo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), corpo].map((b) => b.toString("base64")).join(".");
}

export function decifrar(chave: Buffer, cifrado: string): string {
  const [iv, tag, corpo] = cifrado.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave, iv);
  d.setAuthTag(tag); // chave errada ou dado alterado: final() lança erro
  return Buffer.concat([d.update(corpo), d.final()]).toString("utf8");
}

// Envelope: a chave do titular é guardada cifrada com a chave mestra.
export const envelopar = (mestra: Buffer, chave: Buffer): string =>
  cifrar(mestra, chave.toString("base64"));

export const abrirEnvelope = (mestra: Buffer, envelope: string): Buffer =>
  Buffer.from(decifrar(mestra, envelope), "base64");
