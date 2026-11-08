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

document.getElementById('carve').addEventListener('click', () => {
    if (!img || img.width <= 1) return; // if no image is inputed or img width is less than 1, do nothing
    img = removeVerticalSeam(img, findVerticalSeam(img));
    draw(); // update the image
});

