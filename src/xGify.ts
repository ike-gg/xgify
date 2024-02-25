import prettyBytes from "pretty-bytes";
import sharp from "sharp";

import isGif from "is-gif";
import gifsiclePath from "gifsicle";
import { execBuffer, input, output } from "./execBuffer";

export type Arguments = (string | number | Symbol)[];
export type FrameDimensions = { width: number; height: number };
export type CroppingPoints = { x1: number; y1: number; x2: number; y2: number };
export type RotateDegrees = 90 | 180 | 270;

interface ProcessOptions {
  saveToBuffer?: boolean;
}

export class xGify {
  public fileBuffer: Buffer;
  private staticArgs: Arguments = [];

  /**
   * Get size of the gif buffer in bytes.
   * @returns {number} Size of the gif buffer in bytes.
   */
  get size() {
    return this.fileBuffer.byteLength;
  }

  /**
   * Get size of the gif buffer in pretty, human readable format.
   * @returns {number} Size of the gif buffer in pretty format.
   */
  get prettySize() {
    return prettyBytes(this.size);
  }

  /**
   * @param gifBuffer - Buffer of the gif file.
   */
  constructor(gifBuffer: Buffer) {
    if (!Buffer.isBuffer(gifBuffer) || !isGif(gifBuffer)) {
      throw new Error("Invalid gif buffer provided.");
    }
    this.fileBuffer = gifBuffer;
  }

  /**
   * Stretch the gif to square dimensions.
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async stretchToFit() {
    const { height } = await this.metadata();
    const args: Arguments = ["--resize", `${height}x${height}`];
    await this.process(args);
    return this;
  }

  /**
   * Center crop the gif to square dimensions.
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async centerSquareCrop() {
    await this.crop(({ height, width }) => {
      const size = Math.min(height, width);
      const x1 = Math.floor((width - size) / 2);
      const y1 = Math.floor((height - size) / 2);
      const x2 = x1 + size;
      const y2 = y1 + size;

      return {
        x1,
        y1,
        x2,
        y2,
      };
    });
  }

  /**
   * Lossy compression of the gif (0-200) where 0 is the best quality.
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async lossy(lossyFactor: number) {
    const args: Arguments = [`--lossy=${lossyFactor}`];
    await this.process(args);
    return this;
  }

  /**
   * Reduce the number of colors in the gif (2-256).
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async colors(colorsFactor: number) {
    const colors = Math.max(2, Math.min(256, colorsFactor));
    this.staticArgs = ["--colors", colors];
    await this.process([]);
    return this;
  }

  /**
   * Crop the gif using callback which provides frame dimensions.
   * @param croppingFn ({ width: number; height: number}) => { x1: number; y1: number; x2: number; y2: number }
   */
  async crop(
    croppingFn: (frameDimensions: FrameDimensions) => CroppingPoints
  ): Promise<xGify>;
  /**
   * Crop the gif using cropping points.
   * @param cropping: { x1: number; y1: number; x2: number; y2: number }
   */
  async crop(cropping: CroppingPoints): Promise<xGify>;
  async crop(
    croppingOrFn:
      | CroppingPoints
      | ((frameDimensions: FrameDimensions) => CroppingPoints)
  ): Promise<xGify> {
    let croppingString: string;

    if (typeof croppingOrFn === "function") {
      const { width, height } = await this.metadata();
      const { x1, x2, y1, y2 } = croppingOrFn({ width, height });
      croppingString = `${x1},${y1}-${x2},${y2}`;
    } else {
      const { x1, x2, y1, y2 } = croppingOrFn;
      croppingString = `${x1},${y1}-${x2},${y2}`;
    }

    const args: Arguments = ["--crop", croppingString];

    await this.process([], args);
    return this;
  }

  /**
   * Scale the gif by percentage- 100% - 1, 50% - 0.5, 25% - 0.25, etc.
   * @param scaleFactor - Factor to scale the gif by.
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async scale(scaleFactor: number) {
    const args: Arguments = ["--scale", scaleFactor];
    await this.process(args);
    return this;
  }

  /**
   * Cut the gif using callback which provides total frames.
   * @param cutFn (totalFrames: number) => [number, number]
   */
  async cut(cut: [number, number]): Promise<xGify>;
  /**
   * Cut the gif using cut points.
   * @param cutArray: [number, number]
   */
  async cut(cutFn: (totalFrames: number) => [number, number]): Promise<xGify>;
  async cut(
    cutArrayOrFn: [number, number] | ((totalFrames: number) => [number, number])
  ): Promise<xGify> {
    let cutString: string;

    if (typeof cutArrayOrFn === "function") {
      const { frames } = await this.metadata();
      const timestamps = cutArrayOrFn(frames);
      const safeTimestamps = timestamps.map((number) => Math.floor(number));
      cutString = `#${safeTimestamps[0]}-${safeTimestamps[1]}`;
    } else {
      const safeTimestamps = cutArrayOrFn.map((number) => Math.floor(number));
      cutString = `#${safeTimestamps[0]}-${safeTimestamps[1]}`;
    }

    const args: Arguments = ["--delete", cutString, "--done"];

    await this.process(args, ["-U"]);
    return this;
  }

  /**
   * Change the frame rate of the gif
   * @param delayFactor - Factor to change the frame rate by - f.e. providing 2 will delete every second frame and multiply delay of every frame by 2.
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async frameRate(delayFactor: number) {
    const { frames, delay } = await this.metadata();

    const args: Arguments = [];

    const newDelay = Math.round(delay * delayFactor);
    for (let x = 0; x <= frames; x += delayFactor) {
      args.push(`--delay`);
      args.push(newDelay);
      args.push(`#${Math.round(x)}`);
    }

    await this.process(args, ["-U"]);
    return this;
  }

  /**
   * Rotate the gif
   * @param degrees - Degrees to rotate the gif by - 90, 180, 270.
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async rotate(degrees: RotateDegrees) {
    const args: Arguments = [`--rotate-${degrees}`];
    await this.process([], args);
    return this;
  }

  /**
   * Get metadata of the gif.
   * @returns {Promise<xGify>} Returns the instance of xGify.
   */
  async metadata() {
    const metadata = await sharp(this.fileBuffer, {
      animated: true,
    }).metadata();

    const delay = metadata.delay![0] / 10;
    const frames = metadata.pages!;
    const height = metadata.height! / frames;
    const width = metadata.width!;
    const duration = frames * delay;
    const fps = Math.round(1 / (delay / 100));
    const { size, prettySize } = this;

    return {
      delay,
      frames,
      height,
      width,
      duration,
      fps,
      size,
      prettySize,
    };
  }

  async combine(...gifBuffers: Buffer[]) {
    try {
      const buferek = await execBuffer({
        args: ["--no-warnings", "--merge", input, "-O3", "-o", output],
        bin: gifsiclePath,
        inputs: [this.fileBuffer, ...gifBuffers],
      });
      this.fileBuffer = buferek;
    } catch (error) {
      console.log("combining failed:", error);
    }
  }

  protected async process(
    _args: Arguments,
    _argsBeforeInput: Arguments = [],
    options: ProcessOptions = { saveToBuffer: true }
  ): Promise<Buffer> {
    const args: Arguments = [
      "--no-warnings",
      ..._argsBeforeInput,
      input,
      ..._args,
      ...this.staticArgs,
      "-O3",
      "-o",
      output,
    ];

    try {
      const newBuffer = await execBuffer({
        inputs: [this.fileBuffer],
        bin: gifsiclePath,
        args,
      });
      if (options.saveToBuffer) {
        this.fileBuffer = newBuffer;
      }
      return newBuffer;
    } catch (err: any) {
      err.message =
        err.stderr ||
        err.message ||
        "An error occurred while processing the gif.";
      throw new Error(err);
    }
  }
}
