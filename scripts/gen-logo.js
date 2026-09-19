import fs from 'fs';

function generateSvg() {
  const numTicks = 42;
  const cx = 100;
  const cy = 100;
  const centerRadius = 24;
  
  // Radial rays
  let rays = '';
  for (let i = 0; i < numTicks; i++) {
    const angle = (i / numTicks) * 2 * Math.PI - Math.PI / 2;
    // Inner and outer radius
    // Subtle rhythmic variation in ray length
    const harmonic = Math.sin(angle * 4) * 2 + Math.cos(angle * 2) * 1.5;
    const r1 = 49;
    const r2 = 68 + harmonic;
    
    const x1 = (cx + r1 * Math.cos(angle)).toFixed(2);
    const y1 = (cy + r1 * Math.sin(angle)).toFixed(2);
    const x2 = (cx + r2 * Math.cos(angle)).toFixed(2);
    const y2 = (cy + r2 * Math.sin(angle)).toFixed(2);
    
    rays += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none">
  <defs>
    <linearGradient id="aiLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6B1D9F" />
      <stop offset="35%" stop-color="#7B22BC" />
      <stop offset="70%" stop-color="#9C44D4" />
      <stop offset="100%" stop-color="#BC6EEB" />
    </linearGradient>
  </defs>

  <!-- Outer Acoustic Iris / Sunburst Corona -->
  <g stroke="url(#aiLogoGrad)" stroke-width="4.2" stroke-linecap="round">
${rays}  </g>

  <!-- Center Core Dot -->
  <circle cx="100" cy="100" r="${centerRadius}" fill="#761EAF" />
</svg>`;
}

const svg = generateSvg();
fs.writeFileSync('./public/logo.svg', svg);
console.log('Saved ./public/logo.svg');
