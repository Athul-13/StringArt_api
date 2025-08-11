/*
----- Coding Tutorial by Patt Vira ----- 
Name: String Art
Video Tutorial: https://youtu.be/qH7ZgQghKUU

Connect with Patt: @pattvira
https://www.pattvira.com/
----------------------------------------
*/

let img; let canvasSize = 300; let margin = 10;
let imgPixels = [];

let nails = []; let nailCount = 200; let nailSize = 2;
let lineIndex = []; let maxLines = 10000;

function preload() {
  img = loadImage("einstein.png");
}

function setup() {
  createCanvas(canvasSize * 2, canvasSize);
  img.resize(canvasSize, canvasSize);
  img.filter(GRAY);
  img.loadPixels();
  imgPixels = img.pixels.slice();
  
  for (let i=0; i<nailCount; i++) {
    let angle = TWO_PI/nailCount * i;
    let r = canvasSize / 2 - margin;
    let x = canvasSize / 2 + r * cos(angle);
    let y = canvasSize / 2 + r * sin(angle);
    nails.push(createVector(x, y));
  }
  
  let startingIndex = floor(random(nailCount));
  lineIndex.push(startingIndex);
}

function draw() {
  background(255);
  image(img, canvasSize, 0);
  
  noFill();
  stroke(0, 30);
  strokeWeight(0.5);
  for (let i=0; i<nailCount; i++) {
    ellipse(nails[i].x, nails[i].y, nailSize, nailSize);
  }
  
  for (let i=1; i<lineIndex.length; i++) {
    let nail1 = nails[lineIndex[i-1]];
    let nail2 = nails[lineIndex[i]];
    line(nail1.x, nail1.y, nail2.x, nail2.y);
  }
  
  if (lineIndex.length < maxLines) {
    let currentNailIndex = lineIndex[lineIndex.length - 1];
    let nextNailIndex = findNextNailIndex(currentNailIndex);
    
    if (nextNailIndex !== null) {
      lineIndex.push(nextNailIndex);
      updateImage(currentNailIndex, nextNailIndex);
    } else {
      print("No valid nail found. Stopping");
      save(lineIndex, "threadPath.txt");
      noLoop();
    }
    
  } else {
    print("Max Lines Reached");
    save(lineIndex, "threadPath.txt");
    noLoop();
  }
  
}

function findNextNailIndex(currentIndex) {
  let nextIndex = null;
  let highestContrast = -1;
  
  for (let i=0; i<nails.length; i++) {
    if (i != currentIndex) {
      let contrast = evaluateContrast(currentIndex, i);
      if (contrast > highestContrast) {
        highestContrast = contrast;
        nextIndex = i;
      }
    }
  }
  
  if (nextIndex === null) {
    nextIndex = floor(random(nailCount));
    print("Finding random next index");
  }
  
  return nextIndex;
  
}

function evaluateContrast(i1, i2) {
  let totalContrast = 0;
  let nail1 = nails[i1];
  let nail2 = nails[i2];
  let steps = 100;

  for (let i=0; i<steps; i++) {
    let x = floor(lerp(nail1.x, nail2.x, i/steps));
    let y = floor(lerp(nail1.y, nail2.y, i/steps));
    
    if (x >= 0 && x < canvasSize && y >= 0 && y < canvasSize) {
      let pixelIndex = 4 * (y * canvasSize + x);
      let brightness = imgPixels[pixelIndex];
      totalContrast += (255 - brightness);
    }
  }
  
  return totalContrast / steps;
  
}

function updateImage(i1, i2) {
  let nail1 = nails[i1];
  let nail2 = nails[i2];
  let steps = 100; 
  let bright = 10;
  
  for (let i=0; i<steps; i++) {
    let x = floor(lerp(nail1.x, nail2.x, i/steps));
    let y = floor(lerp(nail1.y, nail2.y, i/steps));
    let pixelIndex = 4 * (y * canvasSize + x);
    
    if (pixelIndex >= 0 && pixelIndex < imgPixels.length - 3) {
      if (imgPixels[pixelIndex] < 255 - bright) {
        imgPixels[pixelIndex + 0] = imgPixels[pixelIndex] + bright;
        imgPixels[pixelIndex + 1] = imgPixels[pixelIndex] + bright;
        imgPixels[pixelIndex + 2] = imgPixels[pixelIndex] + bright;
      }
    }
  }
  
  img.pixels.set(imgPixels);
  img.updatePixels();
}



