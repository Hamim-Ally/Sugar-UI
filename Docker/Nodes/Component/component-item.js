import { ResolvedComponentItemConfig, ResolvedHeaderedItemConfig } from '../../Core/resolved-config.js';
import { ComponentContainer } from '../Container/component-container.js';
import { UnexpectedNullError } from '../../Core/internal-error.js';
import { ItemType } from '../../Utils/types.js';
import { getElementWidthAndHeight } from '../../Utils/utils.js';
import { ContentItem } from './content-item.js';
import { Container } from '../../../Sugar/index.js';

export class ComponentItem extends ContentItem {
    constructor(layoutManager, config, _parentItem) {
        super(layoutManager, config, _parentItem, new Container().dom);

        this._parentItem = _parentItem;
        this._focused = false;
        this.isComponent = true;
        this._reorderEnabled = config.reorderEnabled;
        this.applyUpdatableConfig(config);
        this._initialWantMaximise = config.maximised;

        const containerElement = new Container({ class: 'lm_content' });
        this.element.appendChild(containerElement.dom);

        this._container = new ComponentContainer(config, this, layoutManager, containerElement.dom, (itemConfig) => this.handleUpdateItemConfigEvent(itemConfig), () => this.show(), () => this.hide(), (suppressEvent) => this.focus(suppressEvent), (suppressEvent) => this.blur(suppressEvent));
    }
    /** @internal @deprecated use {@link (ComponentItem:class).componentType} */
    get componentName() { return this._container.componentType; }
    get componentType() { return this._container.componentType; }
    get reorderEnabled() { return this._reorderEnabled; }
    /** @internal */
    get initialWantMaximise() { return this._initialWantMaximise; }
    get component() { return this._container.component; }
    get container() { return this._container; }
    get parentItem() { return this._parentItem; }
    get headerConfig() { return this._headerConfig; }
    get title() { return this._title; }
    get tab() { return this._tab; }
    get focused() { return this._focused; }
    /** @internal */
    destroy() {
        this._container.destroy();
        super.destroy();
    }
    applyUpdatableConfig(config) {
        this.setTitle(config.title);
        this._headerConfig = config.header;
    }
    toConfig() {
        const stateRequestEvent = this._container.stateRequestEvent;
        const state = stateRequestEvent === undefined ? this._container.state : stateRequestEvent();
        const result = {
            type: ItemType.component,
            content: [],
            size: this.size,
            sizeUnit: this.sizeUnit,
            minSize: this.minSize,
            minSizeUnit: this.minSizeUnit,
            id: this.id,
            maximised: false,
            reorderEnabled: this._reorderEnabled,
            title: this._title,
            header: ResolvedHeaderedItemConfig.Header.createCopy(this._headerConfig),
            componentType: ResolvedComponentItemConfig.copyComponentType(this.componentType),
            componentState: state,
        };
        return result;
    }
    close() {
        if (this.parent === null) {
            throw new UnexpectedNullError('CIC68883');
        }
        else {
            this.parent.removeChild(this, false);
        }
    }

    /** @internal */
    exitDragMode() {
        this._container.exitDragMode();
    }
    /** @internal */
    enterStackMaximised() {
        this._container.enterStackMaximised();
    }
    /** @internal */
    exitStackMaximised() {
        this._container.exitStackMaximised();
    }
    // Used by Drag Proxy
    /** @internal */
    drag() {
        this._container.drag();
    }
    /** @internal */
    updateSize(force) {
        this.updateNodeSize(force);
    }
    /** @internal */
    init() {
        this.updateNodeSize(false);
        super.init();
        this._container.emit('open');
        this.initContentItems();
    }
    /**
     * Set this component's title
     *
     * @public
     * @param title -
     */
    setTitle(title) {
        this._title = title;
        this.emit('titleChanged', title);
        this.emit('stateChanged');
    }
    setTab(tab) {
        this._tab = tab;
        this.emit('tab', tab);
        this._container.setTab(tab);
    }
    /** @internal */
    hide() {
        super.hide();
        this._container.setVisibility(false);
    }
    /** @internal */
    show() {
        super.show();
        this._container.setVisibility(true);
    }
    /**
     * Focuses the item if it is not already focused
     */
    focus(suppressEvent = false) {
        this.parentItem.setActiveComponentItem(this, true, suppressEvent);
    }
    /** @internal */
    setFocused(suppressEvent) {
        this._focused = true;
        this.tab.setFocused();
        if (!suppressEvent) {
            this.emitBaseBubblingEvent('focus');
        }
    }
    /**
     * Blurs (defocuses) the item if it is focused
     */
    blur(suppressEvent = false) {
        if (this._focused) {
            this.layoutManager.setFocusedComponentItem(undefined, suppressEvent);
        }
    }
    /** @internal */
    setBlurred(suppressEvent) {
        this._focused = false;
        this.tab.setBlurred();
        if (!suppressEvent) {
            this.emitBaseBubblingEvent('blur');
        }
    }
    /** @internal */
    setParent(parent) {
        this._parentItem = parent;
        super.setParent(parent);
    }
    /** @internal */
    handleUpdateItemConfigEvent(itemConfig) {
        this.applyUpdatableConfig(itemConfig);
    }
    /** @internal */
    updateNodeSize(force) {
        if (this.element.style.display !== 'none') {
            this.element.style.height = 'inherit';
            // Do not update size of hidden components to prevent unwanted reflows
            const { width, height } = getElementWidthAndHeight(this.element);
            this._container.setSizeToNodeSize(width, height, force);
        }
    }
}