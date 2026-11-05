export function maskEmail(value: string): string {
  const email = value.trim();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "***";

  const localPart = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!localPart || !domain || /\s/.test(email)) return "***";

  let maskedLocal: string;
  if (localPart.length === 1) maskedLocal = "*";
  else if (localPart.length === 2) maskedLocal = `${localPart[0]}*`;
  else maskedLocal = `${localPart[0]}***${localPart.at(-1)}`;

  return `${maskedLocal}@${domain}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "****";
  if (digits.length <= 4) return "*".repeat(Math.max(4, digits.length));

  const visibleTail = digits.slice(-4);
  const maskedLength = Math.max(4, digits.length - visibleTail.length);
  return `${"*".repeat(maskedLength)}${visibleTail}`;
}
