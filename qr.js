'use strict';

// A tiny QR encoder for transfer codes: version 1 (21×21), error correction M, alphanumeric mode.
// That holds up to 20 of 0-9 A-Z and " $%*+-./:", which is all an 8-character code needs.
(() => {
  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  const SIZE = 21, DATA_CODEWORDS = 16, EC_CODEWORDS = 10;

  // Multiplication in GF(2^8) modulo x^8 + x^4 + x^3 + x^2 + 1.
  function gfMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function reedSolomon(data, degree) {
    const divisor = new Array(degree).fill(0);
    divisor[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        divisor[j] = gfMultiply(divisor[j], root);
        if (j + 1 < degree) divisor[j] ^= divisor[j + 1];
      }
      root = gfMultiply(root, 0x02);
    }
    const result = new Array(degree).fill(0);
    for (const byte of data) {
      const factor = byte ^ result.shift();
      result.push(0);
      divisor.forEach((coefficient, i) => { result[i] ^= gfMultiply(coefficient, factor); });
    }
    return result;
  }

  function codewords(text) {
    const bits = [];
    const put = (value, length) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
    put(0b0010, 4);
    put(text.length, 9);
    for (let i = 0; i < text.length; i += 2) {
      const first = ALNUM.indexOf(text[i]);
      if (i + 1 < text.length) put(first * 45 + ALNUM.indexOf(text[i + 1]), 11);
      else put(first, 6);
    }
    const capacity = DATA_CODEWORDS * 8;
    put(0, Math.min(4, capacity - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let pad = 0xec; data.length < DATA_CODEWORDS; pad ^= 0xec ^ 0x11) data.push(pad);
    return [...data, ...reedSolomon(data, EC_CODEWORDS)];
  }

  /** Rows of booleans (true = dark), without the quiet zone. */
  function matrix(text) {
    const value = String(text).toUpperCase();
    if (!value || value.length > 20 || [...value].some(c => !ALNUM.includes(c))) throw Error('This text cannot be shown as a QR code.');
    const modules = Array.from({length: SIZE}, () => new Array(SIZE).fill(false));
    const reserved = Array.from({length: SIZE}, () => new Array(SIZE).fill(false));
    const set = (x, y, dark) => { modules[y][x] = dark; reserved[y][x] = true; };

    for (let i = 0; i < SIZE; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [SIZE - 4, 3], [3, SIZE - 4]]) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) set(x, y, distance !== 2 && distance !== 4);
      }
    }

    // Format: error correction M (00) with mask 0, BCH-protected and XOR-masked.
    const format = (0b00 << 3) | 0;
    let remainder = format;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const formatBits = ((format << 10) | remainder) ^ 0x5412;
    const bit = i => ((formatBits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(SIZE - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, SIZE - 15 + i, bit(i));
    set(8, SIZE - 8, true);

    // Data in two-column zigzags from the bottom right, skipping the vertical timing column.
    const data = codewords(value);
    let index = 0;
    for (let right = SIZE - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < SIZE; vertical++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? SIZE - 1 - vertical : vertical;
          if (reserved[y][x]) continue;
          const dark = index < data.length * 8 && ((data[index >>> 3] >>> (7 - (index & 7))) & 1) === 1;
          index++;
          modules[y][x] = dark !== ((x + y) % 2 === 0);
        }
      }
    }
    return modules;
  }

  /** An SVG string with a 4-module quiet zone; colors follow currentColor on a white field. */
  function svg(text, label = 'QR code') {
    const rows = matrix(text), border = 4, size = SIZE + border * 2;
    let path = '';
    rows.forEach((row, y) => row.forEach((dark, x) => { if (dark) path += `M${x + border} ${y + border}h1v1h-1z`; }));
    return `<svg class="qr-code" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label.replace(/"/g, '&quot;')}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  }

  window.CampusQR = {matrix, svg};
})();
