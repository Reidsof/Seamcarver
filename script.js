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