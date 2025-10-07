import QRCode from "qrcode";

export async function qrDataUrlFromToken(token) {
  if (!token) return null;
  // small PNG for audit records
  return await QRCode.toDataURL(JSON.stringify({ t: String(token) }), {
    width: 200,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
