import { Element } from '../Element/index.js';

const CLASS_ROOT = 'pcui-canvas';
/**
 * Represents a Canvas.
 */
class Canvas extends Element {
    /**
     * Creates a new Canvas.
     *
     * @param args - The arguments.
     */
    constructor(args = {}) {
        super(Object.assign({ dom: 'canvas' }, args));
        this._width = 300;
        this._height = 150;
        this._ratio = 1;
        this.class.add(CLASS_ROOT);
        const { useDevicePixelRatio = false } = args;
        this._ratio = useDevicePixelRatio ? window.devicePixelRatio : 1;
        // Disable I-bar cursor on click+drag
        this.dom.onselectstart = (evt) => {
            return false;
        };
    }
    /**
     * Resize the canvas using the given width and height parameters.
     *
     * @param width - The new width of the canvas.
     * @param height - The new height of the canvas.
     */
    resize(width, height) {
        if (this._width === width && this._height === height) {
            return;
        }
        this._width = width;
        this._height = height;
        const canvas = this._dom;
        canvas.width = this.pixelWidth;
        canvas.height = this.pixelHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        this.emit('resize', width, height);
    }
    /**
     * Sets the width of the canvas.
     */
    set width(value) {
        if (this._width === value) {
            return;
        }
        this._width = value;
        const canvas = this._dom;
        canvas.width = this.pixelWidth;
        canvas.style.width = `${value}px`;
        this.emit('resize', this._width, this._height);
    }
    /**
     * Gets the width of the canvas.
     */
    get width() {
        return this._width;
    }
    /**
     * Sets the height of the canvas.
     */
    set height(value) {
        if (this._height === value) {
            return;
        }
        this._height = value;
        const canvas = this._dom;
        canvas.height = this.pixelHeight;
        canvas.style.height = `${value}px`;
        this.emit('resize', this._width, this._height);
    }
    /**
     * Gets the height of the canvas.
     */
    get height() {
        return this._height;
    }
    /**
     * Gets the pixel height of the canvas.
     */
    get pixelWidth() {
        return Math.floor(this._width * this._ratio);
    }
    /**
     * Gets the pixel height of the canvas.
     */
    get pixelHeight() {
        return Math.floor(this._height * this._ratio);
    }
    /**
     * Gets the pixel ratio of the canvas.
     */
    get pixelRatio() {
        return this._ratio;
    }
}
Element.register('canvas', Canvas);

export { Canvas };
//# sourceMappingURL=index.js.map
