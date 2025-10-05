// Very light normalizer; tweak as you like.
const CC = { NG: "234" };

export function toE164(raw, country = "NG") {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("+")) return `+${digits.slice(1)}`;
  if (digits.startsWith("234")) return `+${digits}`;
  if (country === "NG") {
    if (digits.startsWith("0")) return `+${CC.NG}${digits.slice(1)}`;
    return `+${CC.NG}${digits}`;
  }
  return `+${digits}`;
}

// wa.me requires no plus
export function waManualLink(phoneE164, text) {
  const num = phoneE164.replace(/^\+/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
