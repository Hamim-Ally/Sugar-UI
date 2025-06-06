import { DragListener } from '../../Events/drag-listener.js';
import { Container, Label } from '../../../Sugar/index.js';

export class Tab extends Container {
    #titleElement = new Label({ class: 'title' });
    #title = null;
    #isActive = false;

    constructor(_layoutManager, _componentItem, _focusEvent, _dragStartEvent) {
        super();

        this._layoutManager = _layoutManager;
        this._componentItem = _componentItem;
        this._focusEvent = _focusEvent;
        this._dragStartEvent = _dragStartEvent;
        this.#title = _componentItem.title;
        this._tabClickListener = (ev) => this.onTabClickDown(ev);
        this._dragStartListener = (x, y) => this.onDragStart(x, y);
        this._contentItemDestroyListener = () => this.onContentItemDestroy();
        this._tabTitleChangedListener = (title) => this.setTitle(title);
        this.class.add("lm_tab");
        this.append(this.#titleElement);
        this.setTitle(this.#title);
        this._componentItem.on('titleChanged', this._tabTitleChangedListener);
        const reorderEnabled = _componentItem.reorderEnabled ?? this._layoutManager.layoutConfig.settings.reorderEnabled;
        if (reorderEnabled) { this.enableReorder(); }
        this.dom.addEventListener('click', this._tabClickListener, { passive: true });
        this._componentItem.setTab(this);
        this._layoutManager.emit('tabCreated', this);
    }

    get isActive() { return this.#isActive; }
    get componentItem() { return this._componentItem; }
    get contentItem() { return this._componentItem; }
    get reorderEnabled() { return this._dragListener !== undefined; }

    set reorderEnabled(value) {
        if (value !== this.reorderEnabled) {
            if (value) { this.enableReorder(); }
            else { this.disableReorder(); }
        }
    }

    setTitle(title) {
        this.#titleElement.text = title;
        this.dom.title = title;
    }

    setActive(isActive) {
        if (isActive === this.#isActive) { return; }
        this.#isActive = isActive;
        if (isActive) { this.class.add("lm_active"); }
        else { this.class.remove("lm_active"); }
    }

    destroy() {
        this._focusEvent = undefined;
        this._dragStartEvent = undefined;
        this.dom.removeEventListener('click', this._tabClickListener);
        this._componentItem.off('titleChanged', this._tabTitleChangedListener);
        if (this.reorderEnabled) {this.disableReorder();}
        this.dom.remove();
    }

    setBlurred() {
        this.class.remove("lm_focused");
        this.#titleElement.class.remove("lm_focused");
    }

    setFocused() {
        this.class.add("lm_focused");
        this.#titleElement.class.add("lm_focused");
    }

    onDragStart(x, y) {if (this._dragListener && this._dragStartEvent) {this._dragStartEvent(x, y, this._dragListener, this.componentItem);}}

    onContentItemDestroy() {
        if (this._dragListener !== undefined) {
            this._dragListener.destroy();
            this._dragListener = undefined;
        }
    }

    onTabClickDown(event) {if (event.target === this.dom || event.target === this.#titleElement.dom) {if (event.button === 0) {this.notifyFocus();}}}
    notifyFocus() {if (this._focusEvent) {this._focusEvent(this._componentItem);}}

    enableReorder() {
        this._dragListener = new DragListener(this.dom, [this.#titleElement.dom]);
        this._dragListener.on('dragStart', this._dragStartListener);
        this._componentItem.on('destroy', this._contentItemDestroyListener);
    }

    disableReorder() {
        if (this._dragListener) {
            this._componentItem.off('destroy', this._contentItemDestroyListener);
            this._dragListener.off('dragStart', this._dragStartListener);
            this._dragListener = undefined;
        }
    }
}