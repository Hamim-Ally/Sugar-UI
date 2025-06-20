import { CLASS_MULTIPLE_VALUES } from '../../class.js';
import { Element } from '../Element/index.js';
import { NumericInput } from '../NumericInput/index.js';

var _a;
const CLASS_SLIDER = 'pcui-slider';
const CLASS_SLIDER_CONTAINER = `${CLASS_SLIDER}-container`;
const CLASS_SLIDER_BAR = `${CLASS_SLIDER}-bar`;
const CLASS_SLIDER_HANDLE = `${CLASS_SLIDER}-handle`;
const CLASS_SLIDER_ACTIVE = `${CLASS_SLIDER}-active`;
const IS_CHROME = /Chrome\//.test((_a = globalThis.navigator) === null || _a === void 0 ? void 0 : _a.userAgent);
/**
 * The SliderInput shows a NumericInput and a slider widget next to it. It acts as a proxy of the
 * NumericInput.
 */
class SliderInput extends Element {
    /**
     * Creates a new SliderInput.
     *
     * @param args - The arguments.
     */
    constructor(args = {}) {
        var _a, _b, _c, _d, _e;
        super(args);
        this._historyCombine = false;
        this._historyPostfix = null;
        this._cursorHandleOffset = 0;
        this._pointerId = null;
        this._onPointerDown = (evt) => {
            if ((evt.pointerType === 'mouse' && evt.button !== 0) || !this.enabled || this.readOnly || this._pointerId !== null)
                return;
            evt.stopPropagation();
            this._domSlider.setPointerCapture(evt.pointerId);
            this._pointerId = evt.pointerId;
            this._onSlideStart(evt.pageX);
        };
        this._onPointerMove = (evt) => {
            if (evt.pointerId !== this._pointerId)
                return;
            evt.stopPropagation();
            evt.preventDefault();
            this._onSlideMove(evt.pageX);
        };
        this._onPointerUp = (evt) => {
            if (evt.pointerId !== this._pointerId || this._pointerId === null)
                return;
            evt.stopPropagation();
            this._domSlider.releasePointerCapture(evt.pointerId);
            this._onSlideEnd(evt.pageX);
            this._pointerId = null;
        };
        this._onKeyDown = (evt) => {
            if (evt.key === 'Escape') {
                this.blur();
                return;
            }
            if (!this.enabled || this.readOnly)
                return;
            // move slider with left / right arrow keys
            if (evt.key !== 'ArrowLeft' && evt.key !== 'ArrowRight')
                return;
            evt.stopPropagation();
            evt.preventDefault();
            let x = evt.key === 'ArrowLeft' ? -1 : 1;
            if (evt.shiftKey) {
                x *= 10;
            }
            this.value += x * this.step;
        };
        this.class.add(CLASS_SLIDER);
        const numericInput = new NumericInput({
            allowNull: args.allowNull,
            hideSlider: true,
            min: args.min,
            max: args.max,
            keyChange: args.keyChange,
            placeholder: args.placeholder,
            precision: (_a = args.precision) !== null && _a !== void 0 ? _a : 2,
            renderChanges: args.renderChanges,
            step: args.step
        });
        // propagate change event
        numericInput.on('change', (value) => {
            this._onValueChange(value);
        });
        // propagate focus / blur events
        numericInput.on('focus', () => {
            this.emit('focus');
        });
        numericInput.on('blur', () => {
            this.emit('blur');
        });
        numericInput.parent = this;
        this.dom.appendChild(numericInput.dom);
        this._numericInput = numericInput;
        this._sliderMin = (_c = (_b = args.sliderMin) !== null && _b !== void 0 ? _b : args.min) !== null && _c !== void 0 ? _c : 0;
        this._sliderMax = (_e = (_d = args.sliderMax) !== null && _d !== void 0 ? _d : args.max) !== null && _e !== void 0 ? _e : 1;
        this._domSlider = document.createElement('div');
        this._domSlider.classList.add(CLASS_SLIDER_CONTAINER);
        this.dom.appendChild(this._domSlider);
        this._domBar = document.createElement('div');
        this._domBar.classList.add(CLASS_SLIDER_BAR);
        this._domBar.ui = this;
        this._domSlider.appendChild(this._domBar);
        this._domHandle = document.createElement('div');
        this._domHandle.ui = this;
        this._domHandle.tabIndex = 0;
        this._domHandle.classList.add(CLASS_SLIDER_HANDLE);
        this._domBar.appendChild(this._domHandle);
        this._domSlider.addEventListener('pointerdown', this._onPointerDown);
        this._domHandle.addEventListener('keydown', this._onKeyDown);
        if (args.value !== undefined) {
            this.value = args.value;
        }
        if (args.values !== undefined) {
            this.values = args.values;
        }
        // update the handle in case a 0 value has been
        // passed through the constructor
        if (this.value === 0) {
            this._updateHandle(0);
        }
    }
    destroy() {
        if (this._destroyed)
            return;
        this._domSlider.removeEventListener('pointerdown', this._onPointerDown);
        this._domHandle.removeEventListener('keydown', this._onKeyDown);
        super.destroy();
    }
    _updateHandle(value) {
        const left = Math.max(0, Math.min(1, ((value || 0) - this._sliderMin) / (this._sliderMax - this._sliderMin))) * 100;
        const handleWidth = this._domHandle.getBoundingClientRect().width;
        this._domHandle.style.left = `calc(${left}% + ${handleWidth / 2}px)`;
    }
    _onValueChange(value) {
        this._updateHandle(value);
        if (!this._suppressChange) {
            this.emit('change', value);
        }
        if (this._binding) {
            this._binding.setValue(value);
        }
    }
    // Calculates the distance in pixels between
    // the cursor x and the middle of the handle.
    // If the cursor is not on the handle sets the offset to 0
    _calculateCursorHandleOffset(pageX) {
        // not sure why but the left side needs a margin of a couple of pixels
        // to properly determine if the cursor is on the handle (in Chrome)
        const margin = IS_CHROME ? 2 : 0;
        const rect = this._domHandle.getBoundingClientRect();
        const left = rect.left - margin;
        const right = rect.right;
        if (pageX >= left && pageX <= right) {
            this._cursorHandleOffset = pageX - (left + (right - left) / 2);
        }
        else {
            this._cursorHandleOffset = 0;
        }
        return this._cursorHandleOffset;
    }
    _onSlideStart(pageX) {
        this._domHandle.focus();
        this._domSlider.addEventListener('pointermove', this._onPointerMove);
        this._domSlider.addEventListener('pointerup', this._onPointerUp);
        this.class.add(CLASS_SLIDER_ACTIVE);
        // calculate the cursor - handle offset. If there is
        // an offset that means the cursor is on the handle so
        // do not move the handle until the cursor moves.
        if (!this._calculateCursorHandleOffset(pageX)) {
            this._onSlideMove(pageX);
        }
        if (this.binding) {
            this._historyCombine = this.binding.historyCombine;
            this._historyPostfix = this.binding.historyPostfix;
            this.binding.historyCombine = true;
            this.binding.historyPostfix = `(${Date.now()})`;
        }
    }
    _onSlideMove(pageX) {
        const rect = this._domBar.getBoundingClientRect();
        // reduce pageX by the initial cursor - handle offset
        pageX -= this._cursorHandleOffset;
        const x = Math.max(0, Math.min(1, (pageX - rect.left) / rect.width));
        const range = this._sliderMax - this._sliderMin;
        let value = (x * range) + this._sliderMin;
        value = parseFloat(value.toFixed(this.precision));
        this.value = value;
    }
    _onSlideEnd(pageX) {
        // when slide ends only move the handle if the cursor is no longer
        // on the handle
        if (!this._calculateCursorHandleOffset(pageX)) {
            this._onSlideMove(pageX);
        }
        this.class.remove(CLASS_SLIDER_ACTIVE);
        this._domSlider.removeEventListener('pointermove', this._onPointerMove);
        this._domSlider.removeEventListener('pointerup', this._onPointerUp);
        if (this.binding) {
            this.binding.historyCombine = this._historyCombine;
            this.binding.historyPostfix = this._historyPostfix;
            this._historyCombine = false;
            this._historyPostfix = null;
        }
    }
    focus() {
        this._numericInput.focus();
    }
    blur() {
        this._domHandle.blur();
        this._numericInput.blur();
    }
    /**
     * Sets the minimum value that the slider field can take.
     */
    set sliderMin(value) {
        if (this._sliderMin === value)
            return;
        this._sliderMin = value;
        this._updateHandle(this.value);
    }
    /**
     * Gets the minimum value that the slider field can take.
     */
    get sliderMin() {
        return this._sliderMin;
    }
    /**
     * Sets the maximum value that the slider field can take.
     */
    set sliderMax(value) {
        if (this._sliderMax === value)
            return;
        this._sliderMax = value;
        this._updateHandle(this.value);
    }
    /**
     * Gets the maximum value that the slider field can take.
     */
    get sliderMax() {
        return this._sliderMax;
    }
    set value(value) {
        this._numericInput.value = value;
        if (this._numericInput.class.contains(CLASS_MULTIPLE_VALUES)) {
            this.class.add(CLASS_MULTIPLE_VALUES);
        }
        else {
            this.class.remove(CLASS_MULTIPLE_VALUES);
        }
    }
    get value() {
        return this._numericInput.value;
    }
    /* eslint accessor-pairs: 0 */
    set values(values) {
        this._numericInput.values = values;
        if (this._numericInput.class.contains(CLASS_MULTIPLE_VALUES)) {
            this.class.add(CLASS_MULTIPLE_VALUES);
        }
        else {
            this.class.remove(CLASS_MULTIPLE_VALUES);
        }
    }
    set renderChanges(value) {
        this._numericInput.renderChanges = value;
    }
    get renderChanges() {
        return this._numericInput.renderChanges;
    }
    /**
     * Sets the minimum value that the numeric input field can take.
     */
    set min(value) {
        this._numericInput.min = value;
    }
    /**
     * Gets the minimum value that the numeric input field can take.
     */
    get min() {
        return this._numericInput.min;
    }
    /**
     * Sets the maximum value that the numeric input field can take.
     */
    set max(value) {
        this._numericInput.max = value;
    }
    /**
     * Gets the maximum value that the numeric input field can take.
     */
    get max() {
        return this._numericInput.max;
    }
    /**
     * Sets the amount that the value will be increased or decreased when using the arrow keys. Holding Shift will use 10x the step.
     */
    set step(value) {
        this._numericInput.step = value;
    }
    /**
     * Gets the amount that the value will be increased or decreased when using the arrow keys.
     */
    get step() {
        return this._numericInput.step;
    }
    /**
     * Sets the maximum number of decimals a value can take.
     */
    set precision(value) {
        this._numericInput.precision = value;
    }
    /**
     * Gets the maximum number of decimals a value can take.
     */
    get precision() {
        return this._numericInput.precision;
    }
    set keyChange(value) {
        this._numericInput.keyChange = value;
    }
    get keyChange() {
        return this._numericInput.keyChange;
    }
    set placeholder(value) {
        this._numericInput.placeholder = value;
    }
    get placeholder() {
        return this._numericInput.placeholder;
    }
}
Element.register('slider', SliderInput, { renderChanges: true });

export { SliderInput };
//# sourceMappingURL=index.js.map
