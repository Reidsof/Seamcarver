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