const encode = (value: Uint8Array) =>
  Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
const decode = (value: string) => {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value))
    throw new Error("Şifreli dosya biçimi geçersiz.");
  return Uint8Array.from(value.match(/../g)!, (pair) => parseInt(pair, 16));
};
const random = (length: number) =>
  crypto.getRandomValues(new Uint8Array(length));
async function key(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  usage: "encrypt" | "decrypt",
) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}
export async function protect(password: string, plaintext: string) {
  const salt = random(16),
    iv = random(12);
  const payload = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(password, salt, "encrypt"),
    new TextEncoder().encode(plaintext),
  );
  return JSON.stringify({
    encrypted: 1,
    salt: encode(salt),
    iv: encode(iv),
    payload: encode(new Uint8Array(payload)),
  });
}
export async function reveal(password: string, data: string) {
  try {
    const value = JSON.parse(data);
    if (
      value.encrypted !== 1 ||
      value.salt.length !== 32 ||
      value.iv.length !== 24
    )
      throw new Error();
    const salt = decode(value.salt),
      iv = decode(value.iv);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      await key(password, salt, "decrypt"),
      decode(value.payload),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Parola yanlış veya şifreli dosya bozuk.");
  }
}
