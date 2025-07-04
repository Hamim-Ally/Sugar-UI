import { CLASS_FONT_BOLD, CLASS_COLLAPSED, CLASS_COLLAPSIBLE } from '../../class.js';
import { Button } from '../Button/index.js';
import { Container } from '../Container/index.js';
import { Element } from '../Element/index.js';
import { Label } from '../Label/index.js';

const CLASS_PANEL = 'pcui-panel';
const CLASS_PANEL_HEADER = `${CLASS_PANEL}-header`;
const CLASS_PANEL_HEADER_TITLE = `${CLASS_PANEL_HEADER}-title`;
const CLASS_PANEL_CONTENT = `${CLASS_PANEL}-content`;
const CLASS_PANEL_HORIZONTAL = `${CLASS_PANEL}-horizontal`;
const CLASS_PANEL_SORTABLE_ICON = `${CLASS_PANEL}-sortable-icon`;
const CLASS_PANEL_REMOVE = `${CLASS_PANEL}-remove`;
/**
 * The Panel is a {@link Container} that itself contains a header container and a content
 * container. The respective Container functions work using the content container. One can also
 * append elements to the header of the Panel.
 */
class Panel extends Container {
    /**
     * Creates a new Panel.
     *
     * @param args - The arguments. Extends the Container constructor arguments. All settable
     * properties can also be set through the constructor.
     */
    constructor(args = {}) {
        var _a, _b, _c, _d, _e;
        const containerArgs = Object.assign(Object.assign({}, args), { flex: true });
        delete containerArgs.grid;
        delete containerArgs.flexDirection;
        delete containerArgs.scrollable;
        super(containerArgs);
        this._reflowTimeout = null;
        this._widthBeforeCollapse = null;
        this._heightBeforeCollapse = null;
        this._iconSort = null;
        this._btnRemove = null;
        this._onHeaderClick = (evt) => {
            if (!this._collapsible)
                return;
            if (evt.target !== this.header.dom && evt.target !== this._labelTitle.dom)
                return;
            // toggle collapsed
            this.collapsed = !this.collapsed;
        };
        this._onDragStart = (evt) => {
            if (!this.enabled || this.readOnly)
                return;
            evt.stopPropagation();
            evt.preventDefault();
            window.addEventListener('mouseup', this._onDragEndEvt);
            window.addEventListener('mouseleave', this._onDragEndEvt);
            window.addEventListener('mousemove', this._onDragMove);
            this.emit('dragstart');
            // @ts-ignore accessing protected methods
            if (this.parent && this.parent._onChildDragStart) {
                // @ts-ignore accessing protected methods
                this.parent._onChildDragStart(evt, this);
            }
        };
        this._onDragMove = (evt) => {
            this.emit('dragmove');
            // @ts-ignore accessing protected methods
            if (this.parent && this.parent._onChildDragStart) {
                // @ts-ignore accessing protected methods
                this.parent._onChildDragMove(evt, this);
            }
        };
        this.class.add(CLASS_PANEL);
        if (args.panelType) {
            this.class.add(`${CLASS_PANEL}-${args.panelType}`);
        }
        // do not call reflow on every update while
        // we are initializing
        this._suspendReflow = true;
        // initialize header container
        this._initializeHeader(args);
        // initialize content container
        this._initializeContent(args);
        // header size
        this.headerSize = (_a = args.headerSize) !== null && _a !== void 0 ? _a : 32;
        // collapse related
        this.collapsible = (_b = args.collapsible) !== null && _b !== void 0 ? _b : false;
        this.collapsed = (_c = args.collapsed) !== null && _c !== void 0 ? _c : false;
        this.collapseHorizontally = (_d = args.collapseHorizontally) !== null && _d !== void 0 ? _d : false;
        this.sortable = (_e = args.sortable) !== null && _e !== void 0 ? _e : false;
        this.removable = args.removable || !!args.onRemove || false;
        // Set the contents container to be the content DOM element. From now on, calling append
        // functions on the panel will append the elements to the contents container.
        this.domContent = this._containerContent.dom;
        // execute reflow now after all fields have been initialized
        this._suspendReflow = false;
        this._reflow();
        this._onDragEndEvt = this._onDragEnd.bind(this);
    }
    destroy() {
        if (this._destroyed)
            return;
        if (this._reflowTimeout) {
            cancelAnimationFrame(this._reflowTimeout);
            this._reflowTimeout = null;
        }
        window.removeEventListener('mouseup', this._onDragEndEvt);
        window.removeEventListener('mouseleave', this._onDragEndEvt);
        window.removeEventListener('mousemove', this._onDragMove);
        super.destroy();
    }
    _initializeHeader(args) {
        // header container
        this._containerHeader = new Container({
            flex: true,
            flexDirection: 'row',
            class: [CLASS_PANEL_HEADER, CLASS_FONT_BOLD]
        });
        // header title
        this._labelTitle = new Label({
            text: args.headerText,
            class: [CLASS_PANEL_HEADER_TITLE, CLASS_FONT_BOLD]
        });
        this._containerHeader.append(this._labelTitle);
        // use native click listener because the Element#click event is only fired if the element
        // is enabled. However we still want to catch header click events in order to collapse them
        this._containerHeader.dom.addEventListener('click', this._onHeaderClick);
        this.append(this._containerHeader);
    }
    _onClickRemove(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        this.emit('click:remove');
    }
    _initializeContent(args) {
        // containers container
        this._containerContent = new Container({
            class: CLASS_PANEL_CONTENT,
            grid: args.grid,
            flex: args.flex,
            flexDirection: args.flexDirection,
            scrollable: args.scrollable,
            dom: args.content
        });
        this.append(this._containerContent);
    }
    // Collapses or expands the panel as needed
    _reflow() {
        if (this._suspendReflow) {
            return;
        }
        if (this._reflowTimeout) {
            cancelAnimationFrame(this._reflowTimeout);
            this._reflowTimeout = null;
        }
        if (this.hidden || !this.collapsible)
            return;
        if (this.collapsed && this.collapseHorizontally) {
            this._containerHeader.style.top = `${-this.headerSize}px`;
        }
        else {
            this._containerHeader.style.top = '';
        }
        // we rely on the content width / height and we have to
        // wait for 1 frame before we can get the final values back
        this._reflowTimeout = requestAnimationFrame(() => {
            this._reflowTimeout = null;
            if (this.collapsed) {
                // remember size before collapse
                if (!this._widthBeforeCollapse) {
                    this._widthBeforeCollapse = this.style.width;
                }
                if (!this._heightBeforeCollapse) {
                    this._heightBeforeCollapse = this.style.height;
                }
                if (this._collapseHorizontally) {
                    this.height = '';
                    this.width = this.headerSize;
                }
                else {
                    this.height = this.headerSize;
                }
                // add collapsed class after getting the width and height
                // because if we add it before then because of overflow:hidden
                // we might get inaccurate width/heights.
                this.class.add(CLASS_COLLAPSED);
            }
            else {
                // remove collapsed class first and the restore width and height
                // (opposite order of collapsing)
                this.class.remove(CLASS_COLLAPSED);
                if (this._collapseHorizontally) {
                    this.height = '';
                    if (this._widthBeforeCollapse !== null) {
                        this.width = this._widthBeforeCollapse;
                    }
                }
                else {
                    if (this._heightBeforeCollapse !== null) {
                        this.height = this._heightBeforeCollapse;
                    }
                }
                // reset before collapse vars
                this._widthBeforeCollapse = null;
                this._heightBeforeCollapse = null;
            }
        });
    }
    _onDragEnd(evt) {
        window.removeEventListener('mouseup', this._onDragEndEvt);
        window.removeEventListener('mouseleave', this._onDragEndEvt);
        window.removeEventListener('mousemove', this._onDragMove);
        if (this._draggedChild === this) {
            this._draggedChild = null;
        }
        this.emit('dragend');
        // @ts-ignore accessing protected methods
        if (this.parent && this.parent._onChildDragStart) {
            // @ts-ignore accessing protected methods
            this.parent._onChildDragEnd(evt, this);
        }
    }
    /**
     * Sets whether the Element is collapsible.
     */
    set collapsible(value) {
        if (value === this._collapsible)
            return;
        this._collapsible = value;
        if (value) {
            this.class.add(CLASS_COLLAPSIBLE);
        }
        else {
            this.class.remove(CLASS_COLLAPSIBLE);
        }
        this._reflow();
        if (this.collapsed) {
            this.emit(value ? 'collapse' : 'expand');
        }
    }
    /**
     * Gets whether the Element is collapsible.
     */
    get collapsible() {
        return this._collapsible;
    }
    /**
     * Sets whether the Element should be collapsed.
     */
    set collapsed(value) {
        if (this._collapsed === value)
            return;
        this._collapsed = value;
        this._reflow();
        if (this.collapsible) {
            this.emit(value ? 'collapse' : 'expand');
        }
    }
    /**
     * Gets whether the Element should be collapsed.
     */
    get collapsed() {
        return this._collapsed;
    }
    /**
     * Sets whether the panel can be reordered.
     */
    set sortable(value) {
        if (this._sortable === value)
            return;
        this._sortable = value;
        if (value) {
            this._iconSort = new Label({
                class: CLASS_PANEL_SORTABLE_ICON
            });
            this._iconSort.dom.addEventListener('mousedown', this._onDragStart);
            this.header.prepend(this._iconSort);
        }
        else if (this._iconSort) {
            this._iconSort.destroy();
            this._iconSort = null;
        }
    }
    /**
     * Gets whether the panel can be reordered.
     */
    get sortable() {
        return this._sortable;
    }
    /**
     * Sets whether the panel can be removed
     */
    set removable(value) {
        if (this.removable === value)
            return;
        if (value) {
            this._btnRemove = new Button({
                icon: 'E289',
                class: CLASS_PANEL_REMOVE
            });
            this._btnRemove.on('click', this._onClickRemove.bind(this));
            this.header.append(this._btnRemove);
        }
        else {
            this._btnRemove.destroy();
            this._btnRemove = null;
        }
    }
    /**
     * Gets whether the panel can be removed
     */
    get removable() {
        return !!this._btnRemove;
    }
    /**
     * Sets whether the panel collapses horizontally. This would be the case for side panels. Defaults to `false`.
     */
    set collapseHorizontally(value) {
        if (this._collapseHorizontally === value)
            return;
        this._collapseHorizontally = value;
        if (value) {
            this.class.add(CLASS_PANEL_HORIZONTAL);
        }
        else {
            this.class.remove(CLASS_PANEL_HORIZONTAL);
        }
        this._reflow();
    }
    /**
     * Gets whether the panel collapses horizontally.
     */
    get collapseHorizontally() {
        return this._collapseHorizontally;
    }
    /**
     * Gets the content container.
     */
    get content() {
        return this._containerContent;
    }
    /**
     * Gets the header container.
     */
    get header() {
        return this._containerHeader;
    }
    /**
     * Sets the header text of the panel. Defaults to the empty string.
     */
    set headerText(value) {
        this._labelTitle.text = value;
    }
    /**
     * Gets the header text of the panel.
     */
    get headerText() {
        return this._labelTitle.text;
    }
    /**
     * Sets the height of the header in pixels. Defaults to 32.
     */
    set headerSize(value) {
        this._headerSize = value;
        const style = this._containerHeader.dom.style;
        style.height = `${Math.max(0, value)}px`;
        style.lineHeight = style.height;
        this._reflow();
    }
    /**
     * Gets the height of the header in pixels.
     */
    get headerSize() {
        return this._headerSize;
    }
}
/**
 * Fired when the panel gets collapsed.
 *
 * @event
 * @example
 * ```ts
 * const panel = new Panel();
 * panel.on('collapse', () => {
 *     console.log('Panel collapsed');
 * });
 * ```
 */
Panel.EVENT_COLLAPSE = 'collapse';
/**
 * Fired when the panel gets expanded.
 *
 * @event
 * @example
 * ```ts
 * const panel = new Panel();
 * panel.on('expand', () => {
 *     console.log('Panel expanded');
 * });
 * ```
 */
Panel.EVENT_EXPAND = 'expand';
Element.register('panel', Panel);

export { Panel };
//# sourceMappingURL=index.js.map
