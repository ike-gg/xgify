import sharp from "sharp";
import { expect, test, describe } from "vitest";
import { xGify } from "../src/index";
import path from "path";
import fs from "fs";

const inputGif = path.join(__dirname, "input.gif");
const initialGifBuffer = fs.readFileSync(inputGif);

describe("crop method", () => {
  test("should crop to 10x10", async () => {
    const gif = new xGify(initialGifBuffer);

    await gif.crop({ x1: 0, x2: 10, y1: 0, y2: 10 });

    const { width, height } = await sharp(gif.fileBuffer).gif().metadata();

    expect(width).toEqual(10);
    expect(height).toEqual(10);
  });

  test("based on callback should crop the width x height by half", async () => {
    const initialMetadata = await sharp(initialGifBuffer).gif().metadata();

    const gif = new xGify(initialGifBuffer);
    await gif.crop((dimensions) => {
      return {
        x1: 0,
        y1: 0,
        x2: Math.round(dimensions.width / 2),
        y2: Math.round(dimensions.height / 2),
      };
    });

    const finalMetadata = await sharp(gif.fileBuffer).gif().metadata();

    expect(finalMetadata.width).toEqual(Math.round(initialMetadata.width! / 2));
    expect(finalMetadata.height).toEqual(
      Math.round(initialMetadata.height! / 2)
    );
  });
});

describe("frameRate method", () => {
  test("should double the delays for each frame", async () => {
    const initialMetadata = await sharp(initialGifBuffer).gif().metadata();

    const frameRateFactor = 1.5;

    const gif = new xGify(initialGifBuffer);
    await gif.frameRate(frameRateFactor);

    const finalMetadata = await sharp(gif.fileBuffer).gif().metadata();

    expect(finalMetadata.delay!.at(0)).toEqual(
      initialMetadata!.delay!.at(0)! * frameRateFactor
    );

    expect(finalMetadata.pages).toEqual(
      Math.round(initialMetadata.pages! / frameRateFactor)
    );
  });
});

describe("scale method", () => {
  test("should scale by 50%", async () => {
    const initialMetadata = await sharp(initialGifBuffer).gif().metadata();

    const scaleFactor = 0.5;

    const gif = new xGify(initialGifBuffer);
    await gif.scale(scaleFactor);

    const finalMetadata = await sharp(gif.fileBuffer).gif().metadata();

    expect(finalMetadata.width).toEqual(
      Math.round(initialMetadata.width! * scaleFactor)
    );
  });

  test("should scale by 123%", async () => {
    const initialMetadata = await sharp(initialGifBuffer).gif().metadata();

    const scaleFactor = 1.23;

    const gif = new xGify(initialGifBuffer);
    await gif.scale(scaleFactor);

    const finalMetadata = await sharp(gif.fileBuffer).gif().metadata();

    expect(finalMetadata.width).toEqual(
      Math.round(initialMetadata.width! * scaleFactor)
    );

    expect(finalMetadata.height).toEqual(
      Math.round(initialMetadata.height! * scaleFactor)
    );
  });
});
