import { Container } from '../Container/index.js';
import { Element } from '../Element/index.js';

const CLASS_OVERLAY = 'pcui-overlay';
const CLASS_OVERLAY_INNER = `${CLASS_OVERLAY}-inner`;
const CLASS_OVERLAY_CLICKABLE = `${CLASS_OVERLAY}-clickable`;
const CLASS_OVERLAY_TRANSPARENT = `${CLASS_OVERLAY}-transparent`;
const CLASS_OVERLAY_CONTENT = `${CLASS_OVERLAY}-content`;
/**
 * An overlay element.
 */
class Overlay extends Container {
    /**
     * Creates a new Overlay.
     *
     * @param args - The arguments.
     */
    constructor(args = {}) {
        var _a, _b;
        super(args);
        this._onPointerDown = (evt) => {
            if (!this.clickable || this.domContent.contains(evt.target)) {
                return;
            }
            // some field might be in focus
            document.body.blur();
            // wait till blur is done
            requestAnimationFrame(() => {
                this.hidden = true;
            });
            evt.preventDefault();
            evt.stopPropagation();
        };
        this.class.add(CLASS_OVERLAY);
        this._domClickableOverlay = document.createElement('div');
        this._domClickableOverlay.ui = this;
        this._domClickableOverlay.classList.add(CLASS_OVERLAY_INNER);
        this.dom.appendChild(this._domClickableOverlay);
        this.on('show', () => {
            document.body.addEventListener('pointerdown', this._onPointerDown, true);
        });
        this.on('hide', () => {
            document.body.removeEventListener('pointerdown', this._onPointerDown, true);
        });
        this.domContent = document.createElement('div');
        this.domContent.ui = this;
        this.domContent.classList.add(CLASS_OVERLAY_CONTENT);
        this.dom.appendChild(this.domContent);
        this.clickable = (_a = args.clickable) !== null && _a !== void 0 ? _a : false;
        this.transparent = (_b = args.transparent) !== null && _b !== void 0 ? _b : false;
    }
    destroy() {
        if (this._destroyed)
            return;
        super.destroy();
    }
    /**
     * Position the overlay at specific x, y coordinates.
     *
     * @param x - The x coordinate.
     * @param y - The y coordinate.
     */
    position(x, y) {
        const area = this._domClickableOverlay.getBoundingClientRect();
        const rect = this.domContent.getBoundingClientRect();
        x = Math.max(0, Math.min(area.width - rect.width, x));
        y = Math.max(0, Math.min(area.height - rect.height, y));
        this.domContent.style.position = 'absolute';
        this.domContent.style.left = `${x}px`;
        this.domContent.style.top = `${y}px`;
    }
    /**
     * Sets whether the overlay can be hidden by clicking on it.
     */
    set clickable(value) {
        if (value) {
            this.class.add(CLASS_OVERLAY_CLICKABLE);
        }
        else {
            this.class.remove(CLASS_OVERLAY_CLICKABLE);
        }
    }
    /**
     * Gets whether the overlay can be hidden by clicking on it.
     */
    get clickable() {
        return this.class.contains(CLASS_OVERLAY_CLICKABLE);
    }
    /**
     * Sets whether the overlay is transparent or not.
     */
    set transparent(value) {
        if (value) {
            this.class.add(CLASS_OVERLAY_TRANSPARENT);
        }
        else {
            this.class.remove(CLASS_OVERLAY_TRANSPARENT);
        }
    }
    /**
     * Gets whether the overlay is transparent or not.
     */
    get transparent() {
        return this.class.contains(CLASS_OVERLAY_TRANSPARENT);
    }
}
Element.register('overlay', Overlay);

export { Overlay };
//# sourceMappingURL=index.js.map
