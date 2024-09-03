export const binaryToTextEncoding = ["base64", "base64url", "hex", "binary"] as const;
export type BinaryToTextEncoding = typeof binaryToTextEncoding[number];

