function _rgb2hsv(rgb) {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    let h, s;
    const v = Math.max(r, g, b);
    const diff = v - Math.min(r, g, b);
    const diffc = (c) => (v - c) / 6 / diff + 1 / 2;
    if (diff === 0) {
        h = s = 0;
        return [h, s, v];
    }
    s = diff / v;
    const rr = diffc(r);
    const gg = diffc(g);
    const bb = diffc(b);
    if (r === v) {
        h = bb - gg;
    }
    else if (g === v) {
        h = (1 / 3) + rr - bb;
    }
    else if (b === v) {
        h = (2 / 3) + gg - rr;
    }
    if (h < 0) {
        h += 1;
    }
    else if (h > 1) {
        h -= 1;
    }
    return [h, s, v];
}
function _hsv2rgb(hsv) {
    const h = hsv[0];
    const s = hsv[1];
    const v = hsv[2];
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export { _hsv2rgb, _rgb2hsv };
//# sourceMappingURL=color-value.js.map
