![banner](https://i.imgur.com/JNkuNye.png)

Gifsicle promise-buffer-based wrapper for Node.js

```ts
import { xGify } from "xgify";

const gifBuffer = fs.readFileSync("input.gif");

const gif = new xGify(gifBuffer);

gif.prettySize; // 692 kB

await gif.scale(0.75);
await gif.colors(128);

gif.prettySize; // 406 kB

fs.writeFileSync("output.gif", gif.fileBuffer);
```

## Instalation

```sh
npm install xgify
```

## Features

xGify allows you to manipulate gifs in a simple way, with a promise-based API. It uses the `gifsicle` binary to perform the operations.

Available methods:

- `stretchToFit`: Stretches the gif to square dimensions
  ```ts
  await xGify.stretchToFit();
  ```
- `centerSquareCrop`: Crops the gif to the center with square dimensions
  ```ts
  await xGify.centerSquareCrop();
  ```
- `lossy`: Uses lossy compression to reduce file size with cost of quality (0-200)
  ```ts
  await xGify.lossy(120);
  ```
- `colors`: Reduce the numbr of colors in the gif
  ```ts
  await xGify.colors(64);
  ```
- `crop`: Crops the gif to the specified dimensions with provided cropping points or **callback**.

  ```ts
  await xGify.crop({ x1: 0, y1: 0, x2: 100, y2: 75 });

  // or use a callback which provide you current dimensions of the gif as arguemnt

  await xGify.crop((frameDimensions) => {
    // frameDimensions: {width: number, height: number}
    const newWidth = Math.floor(frameDimensions.width / 2);
    const newHeight = Math.floor(frameDimensions.height / 2);
    return { x1: 0, y1: 0, x2: newWidth, y2: newHeight };
  });
  ```

- `scale`: Scale the gif by the percentage
  ```ts
  await xGify.scale(0.5); // 50%
  await xGify.scale(0.23); // 23%
  ```
- `cut`: Cut the gif to the specified dimensions with provided start-end frames or **callback**.

  ```ts
  await xGify.cut([0, 200]);

  // or use a callback which provide you the number of frames in the gif as arguemnt

  await xGify.cut((totalFrames) => {
    const halfFrames = Math.floor(totalFrames / 2);
    return [0, halfFrames];
  });
  ```

- `frameRate`: reduce the frame rate of the gif, providing the value 2 will remove every second frame in the gif and also multiply the delay of each frame by 2.

  ```ts
  await xGify.metadata(); // frames: 250, delay: 10ms
  await xGify.frameRate(2); // frames: 125, delay: 20ms
  ```

- `rotate`: rotate the gif by 90, 180 or 270 degrees
  ```ts
  await xGify.rotate(90);
  ```
- `metadata`: get the metadata of the gif
  ```ts
  await xGify.metadata();
  // {
  //   delay: 7,
  //   frames: 60,
  //   height: 128,
  //   width: 228,
  //   duration: 420,
  //   fps: 14,
  //   size: 691708,
  //   prettySize: '692 kB'
  // }
  ```

## Contributing

Feel free to open an issue or a pull request if you have any ideas or suggestions.

## License

MIT
