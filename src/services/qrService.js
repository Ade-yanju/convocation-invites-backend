import QRCode from "qrcode";

export async function qrDataUrlFromToken(token) {
  const payload = JSON.stringify({ t: token });
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", width: 512 });
}

export default { qrDataUrlFromToken };
