const fs = require('fs');
const path = require('path');

const files = [
  { url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js', dest: 'src/overlay/assets/face-api.min.js' },
  { url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/tiny_face_detector_model-weights_manifest.json', dest: 'src/overlay/assets/models/tiny_face_detector_model-weights_manifest.json' },
  { url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/tiny_face_detector_model.bin', dest: 'src/overlay/assets/models/tiny_face_detector_model.bin' }
];

async function download() {
  for (const f of files) {
    const destPath = path.resolve(__dirname, f.dest);
    console.log(`Downloading ${f.url}...`);
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    console.log(`Saved ${destPath}`);
  }
}

download().catch(console.error);
