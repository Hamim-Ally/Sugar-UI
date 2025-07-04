import { Container, Dropdown } from '../../../Sugar/index.js';
import { UnexpectedUndefinedError } from '../../Core/internal-error.js';
import { EventEmitter } from '../../Events/event-emitter.js';
import { TabsContainer } from './tabs-container.js';

// This class represents a header above a Stack ContentItem.
export class Header extends EventEmitter {
    constructor(_layoutManager, _parent, _getActiveComponentItemEvent,
        closeEvent, _maximiseToggleEvent, _componentRemoveEvent,
        _componentFocusEvent, _componentDragStartEvent) {

        super();

        this._layoutManager = _layoutManager;
        this._parent = _parent;
        this._getActiveComponentItemEvent = _getActiveComponentItemEvent;
        this._maximiseToggleEvent = _maximiseToggleEvent;
        this._componentRemoveEvent = _componentRemoveEvent;
        this._componentFocusEvent = _componentFocusEvent;
        this._componentDragStartEvent = _componentDragStartEvent;


        this._tabsContainer = new TabsContainer(this._layoutManager,
            (item) => this.handleTabInitiatedComponentRemoveEvent(item),
            (item) => this.handleTabInitiatedComponentFocusEvent(item),
            (x, y, dragListener, item) => this.handleTabInitiatedDragStartEvent(x, y, dragListener, item));

        this._element = new Container({
            class: "lm_header",
            flex: true,
            flexDirection: 'row',
            width: '100%',
            height: '100%'
        });

        this._controlsContainerElement = new Container({ class: "lm_controls", });

        this._element.append(this._tabsContainer);
        this._element.append(this._controlsContainerElement);

        this._tabControlOffset = this._layoutManager.layoutConfig.settings.tabControlOffset;

        this.control = new Dropdown({
            icon: 'E235',
            class: 'control',
            alignMenu: 'right',
            menuClass: 'control-menu',
            menu: [
                {
                    text: 'Close',
                    onSelect: () => {
                        const activeItem = this._getActiveComponentItemEvent?.();
                        if (activeItem) { this.handleTabInitiatedComponentRemoveEvent(activeItem); }
                    }
                },
                {
                    text: 'Close All',
                    onSelect: () => closeEvent()
                },
                {
                    text: 'Maximize',
                    onSelect: () => this._maximiseToggleEvent()
                },

            ]
        });

        this.controlsContainerElement.append(this.control);
    }
    // 
    // private _activeComponentItem: ComponentItem | null = null; // only used to identify active tab
    get side() { return this._side; }
    get layoutManager() { return this._layoutManager; }
    get parent() { return this._parent; }
    get tabs() { return this._tabsContainer.tabs; }
    get lastVisibleTabIndex() { return this._tabsContainer.lastVisibleTabIndex; }
    get element() { return this._element.dom; }
    get tabsContainerElement() { return this._tabsContainer.element; }
    get controlsContainerElement() { return this._controlsContainerElement; }
    /**
     * Destroys the entire header
     * @internal
     */
    destroy() {
        this.emit('destroy');
        this._maximiseToggleEvent = undefined;
        this._componentRemoveEvent = undefined;
        this._componentFocusEvent = undefined;
        this._componentDragStartEvent = undefined;
        this._tabsContainer.destroy();
        this._element.dom.remove();
    }
    /**
     * Creates a new tab and associates it with a contentItem
     * @param index - The position of the tab
     * @internal
     */
    createTab(componentItem, index) { this._tabsContainer.createTab(componentItem, index); }
    /**
     * Finds a tab based on the contentItem its associated with and removes it.
     * Cannot remove tab if it has the active ComponentItem
     * @internal
     */
    removeTab(componentItem) { this._tabsContainer.removeTab(componentItem); }

    processActiveComponentChanged(newActiveComponentItem) {
        this._tabsContainer.processActiveComponentChanged(newActiveComponentItem);
        this.updateTabSizes();
    }

    applyFocusedValue(value) {
        if (value) { this._element.class.add("lm_focused"); }
        else { this._element.class.remove("lm_focused"); }
    }

    /**
     * Pushes the tabs to the tab dropdown if the available space is not sufficient
     * @internal
     */
    updateTabSizes() {
        if (this._tabsContainer.tabCount > 0) {
            this._element.width = '';
            this._element.height = 'auto';
            let availableWidth;

            availableWidth = this._element.dom.offsetWidth - this._controlsContainerElement.offsetWidth - this._tabControlOffset;
            this._tabsContainer.updateTabSizes(availableWidth, this._getActiveComponentItemEvent());
        }
    }

    handleTabInitiatedComponentRemoveEvent(componentItem) {
        if (this._componentRemoveEvent === undefined) {
            console.error('Component remove event is not defined');
        }
        else {
            this._componentRemoveEvent(componentItem);
        }
    }

    handleTabInitiatedComponentFocusEvent(componentItem) {
        if (this._componentFocusEvent === undefined) {
            console.error('Component focus event is not defined');
        }
        else {
            this._componentFocusEvent(componentItem);
        }
    }

    handleTabInitiatedDragStartEvent(x, y, dragListener, componentItem) {

        if (this._componentDragStartEvent === undefined) {
            throw new UnexpectedUndefinedError('HHTDSE22294');
        }
        else {
            this._componentDragStartEvent(x, y, dragListener, componentItem);
        }
    }
}