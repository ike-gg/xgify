import fs from "fs/promises";
import { execa } from "execa";
import { rimraf } from "rimraf";
import { temporaryFile } from "tempy";

const rmP = async (path: string) => {
  try {
    rimraf(path);
  } catch {
    throw new Error(`failed to remove ${path}`);
  }
};

export const input = Symbol("inputPath");
export const output = Symbol("outputPath");

interface Options {
  inputs: Buffer[];
  bin: string;
  args: (string | number | Symbol)[];
  inputPath?: string;
  outputPath?: string;
}

export const execBuffer = async (opts: Options): Promise<Buffer> => {
  const { inputs, bin, args, inputPath, outputPath } = opts;

  if (!inputs.every(Buffer.isBuffer)) {
    throw new Error("Inputs are required and must be buffers");
  }

  const inputPaths: string[] = inputs.map(() => inputPath || temporaryFile());
  const outputFilePath: string = outputPath || temporaryFile();

  const modifiedArgs = args.flatMap((arg) => {
    if (arg === input) return inputPaths;
    if (arg === output) return outputFilePath;
    return String(arg);
  });

  const writePromises = inputs.map((inputBuffer, index) =>
    fs.writeFile(inputPaths[index], inputBuffer)
  );

  const promise: Promise<Buffer> = Promise.all(writePromises)
    .then(() => execa(bin, modifiedArgs))
    .then(() => fs.readFile(outputFilePath));

  return promise.finally(() =>
    Promise.all([...inputPaths.map((path) => rmP(path)), rmP(outputFilePath)])
  );
};
