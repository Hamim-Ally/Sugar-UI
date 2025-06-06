import { Container } from '../../../Sugar/index.js';
import { numberToPixels, setElementDisplayVisibility } from '../../Utils/utils.js';

export class DropTargetIndicator extends Container {
    constructor() {
        super();
        this.class.add("lm_dropTargetIndicator");
        document.body.appendChild(this.dom);
    }

    destroy() { this.dom.remove(); }

    highlightArea(area, margin) {
        this.style.left = numberToPixels(area.x1 + margin);
        this.style.top = numberToPixels(area.y1 + margin);
        this.width = area.x2 - area.x1 - margin;
        this.height = area.y2 - area.y1 - margin;
        this.style.display = 'block';
    }

    hide() { setElementDisplayVisibility(this.dom, false); }
}