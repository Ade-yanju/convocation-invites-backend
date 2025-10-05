import { customAlphabet } from "nanoid";
const nano = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 12);
export function nanoToken() {
  return nano();
}
