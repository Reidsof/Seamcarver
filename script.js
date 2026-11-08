const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let img;

document.getElementById('file').addEventListener('change', async (e) => {
    const bmp = await createImageBitmap(e.target.files[0]);
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height);
    img = { width: d.width, height: d.height, data: d.data};
});

function draw() { // updates the canvas as the seams of the image are removed
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
}

function energy(img, i, j) {
    const { width: w, height: h, data } = img;
    const at = (ii, jj) => (jj * w + ii) * 4;
    const left = at((i - 1 + w) % w, j), right = at((i+1) % w, j);
    const up = at(i, (j - 1 + h) % h), down = at(i, (j+1) % h);

    let deltaXSquared = 0 
    let deltaYSquared = 0;
    for (let c = 0; c < 3; c++) {
        deltaXSquared += (data[left + c] - data[right + c]) ** 2;
        deltaYSquared += (data[up + c] - data[down + c]) ** 2;
    }
    return Math.sqrt(deltaXSquared + deltaYSquared);
}

function transpose(img) {
    const { width: w, height: h, data } = img;
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const pixelFrom = (y * w + x) * 4;
            const pixelTo = (x * h + y) * 4;
            out[pixelTo] = data[pixelFrom];
            out[pixelTo + 1] = data[pixelFrom + 1];
            out[pixelTo + 2] = data[pixelFrom + 2];
            out[pixelTo + 3] = data[pixelFrom + 3];
        }
    }
    return { width: h, height: w, data: out };
}

function findVerticalSeam(img) {
    const { width: w, height: h } = img;
    const energyAmt = new Float64Array(w * h);
    const positionOfPixel = new Int32Array(w * h);

    for (let x = 0; x < w; x++) energyAmt[x] = energy(img, x, 0);

    for (let y = 1; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let bestPixel = x, bestEnergyAmt = energyAmt[(y-1) * w + x];
            if (x > 0 && energyAmt[(y - 1) * w + x - 1] < bestEnergyAmt) {
                bestPixel = x - 1; 
                bestEnergyAmt = energyAmt[(y - 1) * w + x - 1];
            }
            if (x < w - 1 && energyAmt[(y - 1) * w + x + 1] < bestEnergyAmt) {
                bestPixel = x + 1;
                bestEnergyAmt = energyAmt[(y - 1) * w + x + 1];
            }
            energyAmt[y * w + x] = energy(img, x, y) + bestEnergyAmt;
            positionOfPixel[y * w + x] = bestPixel;
        }
    }

    let x = 0;
    for (let i = 1; i < w; i++) { if (energyAmt[(h - 1) * w + i] < energyAmt[(h - 1) * w + x]) x = i; }

    const seam = new Array(h);
    for ( let y = h - 1; y >= 0; y-- ) {
        seam[y] = x;
        x = positionOfPixel[y * w + x];
    }
    return seam; 
}

function findHorizontalSeam(img) {
    return findVerticalSeam(transpose(img));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function drawWithSeam(img, seam) {
    const copy = new Uint8ClampedArray(img.data);
    for (let y = 0; y < img.height; y++) {
        const i = (y * img.width + seam[y]) * 4;
        copy[i] = 160;
        copy[i+1] = 32;
        copy[i+2] = 240;
    }
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.putImageData(new ImageData(copy, img.width, img.height), 0, 0);
}

function removeVerticalSeam(img, seam) {
    const {width: w, height: h, data} = img;
    const out = new Uint8ClampedArray((w - 1) * h * 4);

    for (let y = 0; y < h; y++) {
        let o = y * (w - 1) * 4;
        for (let x = 0; x < w; x++) {
            if (x === seam[y]) continue;
            const i = (y * w + x) * 4;
            out[o++] = data[i];
            out[o++] = data[i + 1];
            out[o++] = data[i + 2];
            out[o++] = data[i + 3];

        }
    }
    return { width: w - 1, height: h, data: out };
}

function removeHorizontalSeam(img, seam) {
    return transpose(removeVerticalSeam(transpose(img), seam));
}

let busy = false;

async function carveVerticalSeams(num, delay = 60) {
    if (busy) return; // to stop overlapping clicks running
    busy = true;
    try {
        for (let n = 0; n < num && img.width > 1; n++) {
            const seam = findVerticalSeam(img);
            drawWithSeam(img, seam);
            await sleep(delay);
            img = removeVerticalSeam(img, seam);
            draw();
            await sleep(delay);
        }
    } finally {
        busy = false;
    }
}

function drawWithHorizontalSeam(img, seam) {
    const copy = new Uint8ClampedArray(img.data);
    for(let x = 0; x < img.width; x++) {
        const i = (seam[x] * img.width + x) * 4;
        copy[i] = 160;
        copy[i + 1] = 32;
        copy[i + 2] = 240;
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.putImageData(new ImageData(copy, img.width, img.height), 0, 0);
}

async function carveHorizontalSeams(num, delay=60) {
    if (busy) return;
    busy = true;
    try {
        for (let n = 0; n < num && img.height > 1; n++) {
            const seam = findHorizontalSeam(img);
            drawWithHorizontalSeam(img, seam);
            await sleep(delay);
            img = removeHorizontalSeam(img, seam);
            draw();
            await sleep(delay);
        }
    } finally {
        busy = false;
    }
}

document.getElementById('carveOneVertSeam').addEventListener('click', () => {
    if (!img || img.width <= 1) return; // if no image is inputed or img width is less than 1, do nothing
    carveVerticalSeams(1, 400);
});

document.getElementById('vertCarveXTimes').addEventListener('click', () => {
    if (!img || img.width <= 1) return;
    const num = parseInt(document.getElementById('numberVertSeams').value, 10);
    if (!(num > 0)) return;
    carveVerticalSeams(num);
});

document.getElementById('carveOneHorizontalSeam').addEventListener('click', () => {
    if (!img || img.width <= 1) return; // if no image is inputed or img width is less than 1, do nothing
    img = removeHorizontalSeam(img, findHorizontalSeam(img));
    draw(); // update the image
});

document.getElementById('horizontalCarveXTimes').addEventListener('click', () => {
    if (!img || img.width <= 1) return;
    const num = parseInt(document.getElementById('numberHorizontalSeams').value, 10);
    if (!(num > 0)) return;
    carveHorizontalSeams(num);
});

document.getElementById('imgDownload').addEventListener('click', () => {
    if (!img || busy) return;

    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'carved.png';
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
});
