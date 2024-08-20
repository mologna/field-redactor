import { BinaryToTextEncoding } from "crypto";

export const ENCODINGS: BinaryToTextEncoding[] = ['hex', 'base64', 'base64url', 'binary'];

export type CalculatedHash = {
  original: string;
  md5: {
    hex: string;
    base64: string;
    base64url: string;
    binary: string;
  };
};

export const foobarHashes: CalculatedHash = {
  original: 'foobar', 
  md5: {
    hex: '3858f62230ac3c915f300c664312c63f',
    base64: 'OFj2IjCsPJFfMAxmQxLGPw==',
    base64url: 'OFj2IjCsPJFfMAxmQxLGPw',
    binary: '8Xö"0¬<\x91_0\ffC\x12Æ?'
  }
};

export const helloWorldHashes: CalculatedHash = {
  original: 'Hello, World',
  md5: {
    hex: '82bb413746aee42f89dea2b59614f9ef',
    base64: 'grtBN0au5C+J3qK1lhT57w==',
    base64url: 'grtBN0au5C-J3qK1lhT57w',
    binary: '\x82»A7F®ä/\x89Þ¢µ\x96\x14ùï'
  }
};

export const stringifiedObjectHashes: CalculatedHash = {
  original: '{"foo":"bar","biz":["baz",1,"bop"]}',
  md5: {
    hex: 'ad23987c3042d261a27fc19cb9a3fcb7',
    base64: 'rSOYfDBC0mGif8GcuaP8tw==',
    base64url:'rSOYfDBC0mGif8GcuaP8tw',
    binary: '­#\x98|0BÒa¢\x7FÁ\x9C¹£ü·'
  }
}

export const calculatedHashes: CalculatedHash[] = [
  foobarHashes,
  helloWorldHashes,
  stringifiedObjectHashes
];

