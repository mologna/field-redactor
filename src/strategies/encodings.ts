import { BinaryToTextEncoding } from "crypto";

export const binaryToTextEncoding = ["base64", "base64url", "hex", "binary"];
export const isBinaryToTextEncoding = (val: any): val is BinaryToTextEncoding => {
  return binaryToTextEncoding.includes(val);
}
