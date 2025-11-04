const Vibrant = require('node-vibrant');
const path = require('path');

const imgPath = path.join(__dirname, '..', 'public', 'boomerang.png');

Vibrant.from(imgPath).getPalette()
  .then((palette) => {
    console.log('Extracted palette from', imgPath);
    for (const key of Object.keys(palette)) {
      const swatch = palette[key];
      if (swatch) {
        console.log(`${key}: ${swatch.getHex()}`);
      }
    }
  })
  .catch((err) => {
    console.error('Failed to extract palette:', err);
    process.exit(1);
  });
