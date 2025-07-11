import { Element } from '../Element/index.js';

const CLASS_BUTTON = 'button';
/**
 * User input with click interaction.
 */
class Button extends Element {
    /**
     * Creates a new Button.
     *
     * @param args - The arguments.
     */
    constructor(args = {}) {
        super(Object.assign({ dom: 'button' }, args));
        this._onKeyDown = (evt) => {
            if (evt.key === 'Escape') {
                this.blur();
            }
            else if (evt.key === 'Enter') {
                this._onClick(evt);
            }
        };
        this.class.add(CLASS_BUTTON);
        this._unsafe = args.unsafe;
        this.text = args.text;
        this.size = args.size;
        this.icon = args.icon;
        this.dom.addEventListener('keydown', this._onKeyDown);
    }
    destroy() {
        if (this._destroyed)
            return;
        this.dom.removeEventListener('keydown', this._onKeyDown);
        super.destroy();
    }
    _onClick(evt) {
        this.blur();
        if (this.readOnly)
            return;
        super._onClick(evt);
    }
    focus() {
        this.dom.focus();
    }
    blur() {
        this.dom.blur();
    }
    /**
     * Sets the text of the button.
     */
    set text(value) {
        if (this._text === value)
            return;
        this._text = value;
        if (this._unsafe) {
            this.dom.innerHTML = value;
        }
        else {
            this.dom.textContent = value;
        }
    }
    /**
     * Gets the text of the button.
     */
    get text() {
        return this._text;
    }
    /**
     * Sets the CSS code for an icon for the button. e.g. 'E401' (notice we omit the '\\' character).
     */
    set icon(value) {
        if (this._icon === value || !value.match(/^E\d{0,4}$/))
            return;
        this._icon = value;
        if (value) {
            // set data-icon attribute but first convert the value to a code point
            this.dom.setAttribute('data-icon', String.fromCodePoint(parseInt(value, 16)));
        }
        else {
            this.dom.removeAttribute('data-icon');
        }
    }
    /**
     * Gets the CSS code for an icon for the button.
     */
    get icon() {
        return this._icon;
    }
    /**
     * Sets the 'size' type of the button. Can be null or 'small'.
     */
    set size(value) {
        if (this._size === value)
            return;
        if (this._size) {
            this.class.remove(`pcui-${this._size}`);
            this._size = null;
        }
        this._size = value;
        if (this._size) {
            this.class.add(`pcui-${this._size}`);
        }
    }
    /**
     * Gets the 'size' type of the button.
     */
    get size() {
        return this._size;
    }
}
Element.register('button', Button);

export { Button };
//# sourceMappingURL=index.js.map
