// Requires: npm install canvas
// Run with: node generate-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generate(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(0, 0, size, size);

  // Gold rounded square
  const pad = size * 0.12;
  const r = size * 0.18;
  const x = pad, y = pad, w = size - pad * 2, h = size - pad * 2;
  ctx.fillStyle = '#c8a84b';
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // € symbol
  ctx.fillStyle = '#0e0e0e';
  ctx.font = `bold ${Math.floor(size * 0.44)}px Georgia`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('€', size / 2, size / 2 + size * 0.02);

  return canvas.toBuffer('image/png');
}

const iconsDir = path.join(__dirname, 'budget-app', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generate(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generate(512));

console.log('Icons generated:');
console.log('  budget-app/icons/icon-192.png');
console.log('  budget-app/icons/icon-512.png');
