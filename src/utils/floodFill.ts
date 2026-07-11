export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: 255
  } : { r: 0, g: 0, b: 0, a: 255 };
}

export function floodFill(
  colorCtx: CanvasRenderingContext2D,
  outlineCtx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  canvasWidth: number,
  canvasHeight: number,
  bgMask: Uint8Array | null
) {
  startX = Math.floor(startX);
  startY = Math.floor(startY);
  
  const startPixelIdx = startY * canvasWidth + startX;
  if (bgMask && bgMask[startPixelIdx] === 1) {
    return false; // Prevent filling the background
  }

  const colorImgData = colorCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  const colorData = colorImgData.data;

  const outlineImgData = outlineCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  const outlineData = outlineImgData.data;

  const startPos = (startY * canvasWidth + startX) * 4;

  // 1. Ignore if clicking directly on a black line
  if (outlineData[startPos + 3] > 50) {
    return false; 
  }

  const startR = colorData[startPos];
  const startG = colorData[startPos + 1];
  const startB = colorData[startPos + 2];
  const startA = colorData[startPos + 3];

  const fillColor = hexToRgb(fillColorHex);

  if (Math.abs(startR - fillColor.r) < 5 && 
      Math.abs(startG - fillColor.g) < 5 && 
      Math.abs(startB - fillColor.b) < 5) {
    return false; // Already the target color
  }

  // Strict tolerance to prevent bridging between colors
  const matchTargetColor = (pos: number) => {
    const rDiff = Math.abs(colorData[pos] - startR);
    const gDiff = Math.abs(colorData[pos + 1] - startG);
    const bDiff = Math.abs(colorData[pos + 2] - startB);
    const aDiff = Math.abs(colorData[pos + 3] - startA);
    return (rDiff + gDiff + bDiff + aDiff) < 40;
  };

  const isOutline = (pos: number) => {
    return outlineData[pos + 3] > 20; // Check if it's an outline pixel
  };

  const colorPixel = (pos: number) => {
    colorData[pos] = fillColor.r;
    colorData[pos + 1] = fillColor.g;
    colorData[pos + 2] = fillColor.b;
    colorData[pos + 3] = fillColor.a;
  };

  const stack = [startPos];
  const visited = new Uint8Array(canvasWidth * canvasHeight);
  visited[startPos / 4] = 1;

  while (stack.length > 0) {
    const pos = stack.pop()!;
    const pixelIdx = pos / 4;

    if (isOutline(pos)) {
      colorPixel(pos);
      // We color the outline pixel on the bottom layer to bleed under it
      // but we DO NOT push its neighbors. This acts as a boundary wall.
      continue;
    }
    
    colorPixel(pos);

    const x = pixelIdx % canvasWidth;
    const y = Math.floor(pixelIdx / canvasWidth);

    // Push neighbors
    // Up
    if (y > 0) {
      const upPos = pos - canvasWidth * 4;
      if (!visited[upPos / 4] && (isOutline(upPos) || matchTargetColor(upPos))) {
        visited[upPos / 4] = 1;
        stack.push(upPos);
      }
    }
    // Down
    if (y < canvasHeight - 1) {
      const downPos = pos + canvasWidth * 4;
      if (!visited[downPos / 4] && (isOutline(downPos) || matchTargetColor(downPos))) {
        visited[downPos / 4] = 1;
        stack.push(downPos);
      }
    }
    // Left
    if (x > 0) {
      const leftPos = pos - 4;
      if (!visited[leftPos / 4] && (isOutline(leftPos) || matchTargetColor(leftPos))) {
        visited[leftPos / 4] = 1;
        stack.push(leftPos);
      }
    }
    // Right
    if (x < canvasWidth - 1) {
      const rightPos = pos + 4;
      if (!visited[rightPos / 4] && (isOutline(rightPos) || matchTargetColor(rightPos))) {
        visited[rightPos / 4] = 1;
        stack.push(rightPos);
      }
    }
  }

  colorCtx.putImageData(colorImgData, 0, 0);
  return true;
}
