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

export const execBuffer = (opts: Options): Promise<Buffer> => {
  const { inputs, bin, args, inputPath, outputPath } = { ...opts };

  if (!Array.isArray(inputs) || !inputs.every(Buffer.isBuffer)) {
    return Promise.reject(new Error("Inputs are required and must be buffers"));
  }

  if (typeof bin !== "string") {
    return Promise.reject(new Error("Binary is required"));
  }

  if (!Array.isArray(args)) {
    return Promise.reject(new Error("Arguments are required"));
  }

  const inputPaths: string[] = inputs.map(() => inputPath || temporaryFile());
  const outputFilePath: string = outputPath || temporaryFile();

  const modifiedArgs = args
    .flatMap((arg) => {
      console.log(arg);
      return arg === input
        ? inputPaths.length === 1
          ? inputPaths[0]
          : inputPaths
        : arg === output
        ? outputFilePath
        : arg;
    })
    .map(String);

  console.log(modifiedArgs);

  const writePromises: Promise<void>[] = inputs.map((inputBuffer, index) =>
    fs.writeFile(inputPaths[index], inputBuffer)
  );

  const promise: Promise<Buffer> = Promise.all(writePromises)
    .then(() => execa(bin, modifiedArgs))
    .then(() => fs.readFile(outputFilePath));

  return promise.finally(() =>
    Promise.all([...inputPaths.map((path) => rmP(path)), rmP(outputFilePath)])
  );
};
