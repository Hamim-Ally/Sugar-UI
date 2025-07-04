import { ItemConfig, LayoutConfig } from './config.js';
import { ResolvedItemConfig, ResolvedLayoutConfig } from "./resolved-config.js";
import { DragProxy } from '../Nodes/Stack/drag-proxy.js';
import { DropTargetIndicator } from '../Nodes/Stack/drop-target-indicator.js';
import { ConfigurationError } from './external-error.js';
import { AssertError, UnexpectedNullError, UnexpectedUndefinedError, UnreachableCaseError } from './internal-error.js';
import { ComponentItem } from '../Nodes/Component/component-item.js';
import { ContentItem } from '../Nodes/Component/content-item.js';
import { GroundItem } from '../Nodes/Layout/ground-item.js';
import { RowOrColumn } from '../Nodes/Layout/row-or-column.js';
import { Stack } from '../Nodes/Stack/index.js';
import { ConfigMinifier } from '../Utils/config-minifier.js';
import { EventEmitter } from '../Events/event-emitter.js';
import { EventHub } from '../Events/event-hub.js';
import { I18nStrings, i18nStrings } from '../Utils/i18n-strings.js';
import { ItemType, ResponsiveMode } from '../Utils/types.js';
import { getElementWidthAndHeight, removeFromArray, setElementHeight, setElementWidth } from '../Utils/utils.js';
/**
 * The main class that will be exposed as GoldenLayout.
 */
/** @public */
export class LayoutManager extends EventEmitter {
    /**
    * @param container - A Dom HTML element. Defaults to body
    * @internal
    */
    constructor(parameters) {
        super();
        /** Whether the layout will be automatically be resized to container whenever the container's size is changed
         * Default is true if <body> is the container otherwise false
         * Default will be changed to true for any container in the future
         */
        this.resizeWithContainerAutomatically = false;
        /** The debounce interval (in milliseconds) used whenever a layout is automatically resized.  0 means next tick */
        this.resizeDebounceInterval = 100;
        /** Extend the current debounce delay time period if it is triggered during the delay.
         * If this is true, the layout will only resize when its container has stopped being resized.
         * If it is false, the layout will resize at intervals while its container is being resized.
         */
        this.resizeDebounceExtendedWhenPossible = true;
        /** @internal */
        this._isInitialised = false;
        /** @internal */
        this._groundItem = undefined;

        /** @internal */
        this._dropTargetIndicator = null;
        /** @internal */
        this._itemAreas = [];
        /** @internal */
        this._maximisePlaceholder = LayoutManager.createMaximisePlaceElement(document);
        /** @internal */
        this._tabDropPlaceholder = LayoutManager.createTabDropPlaceholderElement(document);
        /** @internal */
        this._dragSources = [];
        /** @internal */
        this._updatingColumnsResponsive = false;
        /** @internal */
        this._firstLoad = true;
        /** @internal */
        this._eventHub = new EventHub(this);
        /** @internal */
        this._width = null;
        /** @internal */
        this._height = null;
        /** @internal */
        this._virtualSizedContainers = [];
        /** @internal */
        this._virtualSizedContainerAddingBeginCount = 0;
        /** @internal */
        this._sizeInvalidationBeginCount = 0;
        /** @internal */
        this._resizeObserver = new ResizeObserver(() => this.handleContainerResize());
        /** @internal @deprecated to be removed in version 3 */
        this._windowBeforeUnloadListener = () => this.onBeforeUnload();
        /** @internal @deprecated to be removed in version 3 */
        this._windowBeforeUnloadListening = false;
        /** @internal */
        this._maximisedStackBeforeDestroyedListener = (ev) => this.cleanupBeforeMaximisedStackDestroyed(ev);
        this._constructorLayoutConfig = parameters.constructorLayoutConfig;
        I18nStrings.checkInitialise();
        ConfigMinifier.checkInitialise();
        if (parameters.containerElement !== undefined) {
            this._containerElement = parameters.containerElement;
        }
    }
    get container() { return this._containerElement; }
    get isInitialised() { return this._isInitialised; }
    /** @internal */
    get groundItem() { return this._groundItem; }
    /** @internal @deprecated use {@link (LayoutManager:class).groundItem} instead */
    get root() { return this._groundItem; }

    /** @internal */
    get dropTargetIndicator() { return this._dropTargetIndicator; }
    get width() { return this._width; }
    get height() { return this._height; }
    /**
     * Retrieves the {@link (EventHub:class)} instance associated with this layout manager.
     * This can be used to propagate events between the windows
     * @public
     */
    get eventHub() { return this._eventHub; }
    get rootItem() {
        if (this._groundItem === undefined) {
            throw new Error('Cannot access rootItem before init');
        }
        else {
            const groundContentItems = this._groundItem.contentItems;
            if (groundContentItems.length === 0) {
                return undefined;
            }
            else {
                return this._groundItem.contentItems[0];
            }
        }
    }
    get focusedComponentItem() { return this._focusedComponentItem; }
    /** @internal */
    get tabDropPlaceholder() { return this._tabDropPlaceholder; }
    get maximisedStack() { return this._maximisedStack; }

    /**
     * Destroys the LayoutManager instance itself as well as every ContentItem
     * within it. After this is called nothing should be left of the LayoutManager.
     *
     * This function only needs to be called if an application wishes to destroy the Golden Layout object while
     * a page remains loaded. When a page is unloaded, all resources claimed by Golden Layout will automatically
     * be released.
     */
    destroy() {
        if (this._isInitialised) {
            if (this._windowBeforeUnloadListening) {
                globalThis.removeEventListener('beforeunload', this._windowBeforeUnloadListener);
                this._windowBeforeUnloadListening = false;
            }

            this._resizeObserver.disconnect();
            this.checkClearResizeTimeout();
            if (this._groundItem !== undefined) {
                this._groundItem.destroy();
            }
            this._tabDropPlaceholder.remove();
            if (this._dropTargetIndicator !== null) {
                this._dropTargetIndicator.destroy();
            }

            this._eventHub.destroy();
            for (const dragSource of this._dragSources) {
                dragSource.destroy();
            }
            this._dragSources = [];
            this._isInitialised = false;
        }
    }
    /**
     * Takes a GoldenLayout configuration object and
     * replaces its keys and values recursively with
     * one letter codes
     * @deprecated use {@link (ResolvedLayoutConfig:namespace).minifyConfig} instead
     */
    minifyConfig(config) {
        return ResolvedLayoutConfig.minifyConfig(config);
    }
    /**
     * Takes a configuration Object that was previously minified
     * using minifyConfig and returns its original version
     * @deprecated use {@link (ResolvedLayoutConfig:namespace).unminifyConfig} instead
     */
    unminifyConfig(config) {
        return ResolvedLayoutConfig.unminifyConfig(config);
    }
    /**
     * Called from GoldenLayout class. Finishes of init
     * @internal
     */
    init() {
        this.setContainer();
        this._dropTargetIndicator = new DropTargetIndicator( /*this.container*/);
        this.updateSizeFromContainer();
        let subWindowRootConfig;

        // backwards compatibility
        this.layoutConfig = LayoutConfig.resolve(this._constructorLayoutConfig);
        const layoutConfig = this.layoutConfig;
        this._groundItem = new GroundItem(this, layoutConfig.root, this._containerElement);
        this._groundItem.init();
        this.checkLoadedLayoutMaximiseItem();
        this._resizeObserver.observe(this._containerElement);
        this._isInitialised = true;
        this.adjustColumnsResponsive();
        this.emit('initialised');
        if (subWindowRootConfig !== undefined) {
            // must be SubWindow
            this.loadComponentAsRoot(subWindowRootConfig);
        }
    }
    /**
     * Loads a new layout
     * @param layoutConfig - New layout to be loaded
     */
    loadLayout(layoutConfig) {
        if (!this.isInitialised) {
            // In case application not correctly using legacy constructor
            throw new Error('GoldenLayout: Need to call init() if LayoutConfig with defined root passed to constructor');
        }
        else {
            if (this._groundItem === undefined) {
                throw new UnexpectedUndefinedError('LMLL11119');
            }
            else {
                this.createSubWindows(); // still needs to be tested
                this.layoutConfig = LayoutConfig.resolve(layoutConfig);
                this._groundItem.loadRoot(this.layoutConfig.root);
                this.checkLoadedLayoutMaximiseItem();
                this.adjustColumnsResponsive();
            }
        }
    }
    /**
     * Creates a layout configuration object based on the the current state
     *
     * @public
     * @returns GoldenLayout configuration
     */
    saveLayout() {
        if (this._isInitialised === false) {
            throw new Error('Can\'t create config, layout not yet initialised');
        }
        else {
            // if (root !== undefined && !(root instanceof ContentItem)) {
            //     throw new Error('Root must be a ContentItem');
            // }
            /*
            * Content
            */
            if (this._groundItem === undefined) {
                throw new UnexpectedUndefinedError('LMTC18244');
            }
            else {
                const groundContent = this._groundItem.calculateConfigContent();
                let rootItemConfig;
                if (groundContent.length !== 1) {
                    rootItemConfig = undefined;
                }
                else {
                    rootItemConfig = groundContent[0];
                }

                const config = {
                    root: rootItemConfig,
                    settings: ResolvedLayoutConfig.Settings.createCopy(this.layoutConfig.settings),
                    dimensions: ResolvedLayoutConfig.Dimensions.createCopy(this.layoutConfig.dimensions),
                    header: ResolvedLayoutConfig.Header.createCopy(this.layoutConfig.header),
                    resolved: true,
                };
                return config;
            }
        }
    }
    /**
     * Removes any existing layout. Effectively, an empty layout will be loaded.
     */
    clear() {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMCL11129');
        }
        else {
            this._groundItem.clearRoot();
        }
    }
    /**
     * @deprecated Use {@link (LayoutManager:class).saveLayout}
     */
    toConfig() {
        return this.saveLayout();
    }
    /**
     * Adds a new ComponentItem.  Will use default location selectors to ensure a location is found and
     * component is successfully added
     * @param componentTypeName - Name of component type to be created.
     * @param state - Optional initial state to be assigned to component
     * @returns New ComponentItem created.
     */
    newComponent(componentType, componentState, title) {
        const componentItem = this.newComponentAtLocation(componentType, componentState, title);
        if (componentItem === undefined) {
            throw new AssertError('LMNC65588');
        }
        else {
            return componentItem;
        }
    }
    /**
     * Adds a ComponentItem at the first valid selector location.
     * @param componentTypeName - Name of component type to be created.
     * @param state - Optional initial state to be assigned to component
     * @param locationSelectors - Array of location selectors used to find location in layout where component
     * will be added. First location in array which is valid will be used. If locationSelectors is undefined,
     * {@link (LayoutManager:namespace).defaultLocationSelectors} will be used
     * @returns New ComponentItem created or undefined if no valid location selector was in array.
     */
    newComponentAtLocation(componentType, componentState, title, locationSelectors) {
        if (this._groundItem === undefined) {
            throw new Error('Cannot add component before init');
        }
        else {
            const location = this.addComponentAtLocation(componentType, componentState, title, locationSelectors);
            if (location === undefined) {
                return undefined;
            }
            else {
                const createdItem = location.parentItem.contentItems[location.index];
                if (!ContentItem.isComponentItem(createdItem)) {
                    throw new AssertError('LMNC992877533');
                }
                else {
                    return createdItem;
                }
            }
        }
    }
    /**
     * Adds a new ComponentItem.  Will use default location selectors to ensure a location is found and
     * component is successfully added
     * @param componentType - Type of component to be created.
     * @param state - Optional initial state to be assigned to component
     * @returns Location of new ComponentItem created.
     */
    addComponent(componentType, componentState, title) {
        const location = this.addComponentAtLocation(componentType, componentState, title);
        if (location === undefined) {
            throw new AssertError('LMAC99943');
        }
        else {
            return location;
        }
    }
    /**
     * Adds a ComponentItem at the first valid selector location.
     * @param componentType - Type of component to be created.
     * @param state - Optional initial state to be assigned to component
     * @param locationSelectors - Array of location selectors used to find determine location in layout where component
     * will be added. First location in array which is valid will be used. If undefined,
     * {@link (LayoutManager:namespace).defaultLocationSelectors} will be used.
     * @returns Location of new ComponentItem created or undefined if no valid location selector was in array.
     */
    addComponentAtLocation(componentType, componentState, title, locationSelectors) {
        const itemConfig = {
            type: 'component',
            componentType,
            componentState,
            title,
        };
        return this.addItemAtLocation(itemConfig, locationSelectors);
    }
    /**
     * Adds a new ContentItem.  Will use default location selectors to ensure a location is found and
     * component is successfully added
     * @param itemConfig - ResolvedItemConfig of child to be added.
     * @returns New ContentItem created.
    */
    newItem(itemConfig) {
        const contentItem = this.newItemAtLocation(itemConfig);
        if (contentItem === undefined) {
            throw new AssertError('LMNC65588');
        }
        else {
            return contentItem;
        }
    }
    /**
     * Adds a new child ContentItem under the root ContentItem.  If a root does not exist, then create root ContentItem instead
     * @param itemConfig - ResolvedItemConfig of child to be added.
     * @param locationSelectors - Array of location selectors used to find determine location in layout where ContentItem
     * will be added. First location in array which is valid will be used. If undefined,
     * {@link (LayoutManager:namespace).defaultLocationSelectors} will be used.
     * @returns New ContentItem created or undefined if no valid location selector was in array. */
    newItemAtLocation(itemConfig, locationSelectors) {
        if (this._groundItem === undefined) {
            throw new Error('Cannot add component before init');
        }
        else {
            const location = this.addItemAtLocation(itemConfig, locationSelectors);
            if (location === undefined) {
                return undefined;
            }
            else {
                const createdItem = location.parentItem.contentItems[location.index];
                return createdItem;
            }
        }
    }
    /**
     * Adds a new ContentItem.  Will use default location selectors to ensure a location is found and
     * component is successfully added.
     * @param itemConfig - ResolvedItemConfig of child to be added.
     * @returns Location of new ContentItem created. */
    addItem(itemConfig) {
        const location = this.addItemAtLocation(itemConfig);
        if (location === undefined) {
            throw new AssertError('LMAI99943');
        }
        else {
            return location;
        }
    }
    /**
     * Adds a ContentItem at the first valid selector location.
     * @param itemConfig - ResolvedItemConfig of child to be added.
     * @param locationSelectors - Array of location selectors used to find determine location in layout where ContentItem
     * will be added. First location in array which is valid will be used. If undefined,
     * {@link (LayoutManager:namespace).defaultLocationSelectors} will be used.
     * @returns Location of new ContentItem created or undefined if no valid location selector was in array. */
    addItemAtLocation(itemConfig, locationSelectors) {
        if (this._groundItem === undefined) {
            throw new Error('Cannot add component before init');
        }
        else {
            if (locationSelectors === undefined) {
                // defaultLocationSelectors should always find a location
                locationSelectors = LayoutManager.defaultLocationSelectors;
            }
            const location = this.findFirstLocation(locationSelectors);
            if (location === undefined) {
                return undefined;
            }
            else {
                let parentItem = location.parentItem;
                let addIdx;
                switch (parentItem.type) {
                    case ItemType.ground: {
                        const groundItem = parentItem;
                        addIdx = groundItem.addItem(itemConfig, location.index);
                        if (addIdx >= 0) {
                            parentItem = this._groundItem.contentItems[0]; // was added to rootItem
                        }
                        else {
                            addIdx = 0; // was added as rootItem (which is the first and only ContentItem in GroundItem)
                        }
                        break;
                    }
                    case ItemType.row:
                    case ItemType.column: {
                        const rowOrColumn = parentItem;
                        addIdx = rowOrColumn.addItem(itemConfig, location.index);
                        break;
                    }
                    case ItemType.stack: {
                        if (!ItemConfig.isComponent(itemConfig)) {
                            throw Error(i18nStrings[6 /* ItemConfigIsNotTypeComponent */]);
                        }
                        else {
                            const stack = parentItem;
                            addIdx = stack.addItem(itemConfig, location.index);
                            break;
                        }
                    }
                    case ItemType.component: {
                        throw new AssertError('LMAIALC87444602');
                    }
                    default:
                        throw new UnreachableCaseError('LMAIALU98881733', parentItem.type);
                }
                if (ItemConfig.isComponent(itemConfig)) {
                    // see if stack was inserted
                    const item = parentItem.contentItems[addIdx];
                    if (ContentItem.isStack(item)) {
                        parentItem = item;
                        addIdx = 0;
                    }
                }
                location.parentItem = parentItem;
                location.index = addIdx;
                return location;
            }
        }
    }
    /** Loads the specified component ResolvedItemConfig as root.
     * This can be used to display a Component all by itself.  The layout cannot be changed other than having another new layout loaded.
     * Note that, if this layout is saved and reloaded, it will reload with the Component as a child of a Stack.
    */
    loadComponentAsRoot(itemConfig) {
        if (this._groundItem === undefined) {
            throw new Error('Cannot add item before init');
        }
        else {
            this._groundItem.loadComponentAsRoot(itemConfig);
        }
    }
    /** @deprecated Use {@link (LayoutManager:class).setSize} */
    updateSize(width, height) {
        this.setSize(width, height);
    }
    /**
     * Updates the layout managers size
     *
     * @param width - Width in pixels
     * @param height - Height in pixels
     */
    setSize(width, height) {
        this._width = width;
        this._height = height;
        if (this._isInitialised === true) {
            if (this._groundItem === undefined) {
                throw new UnexpectedUndefinedError('LMUS18881');
            }
            else {
                this._groundItem.setSize(this._width, this._height);
                if (this._maximisedStack) {
                    const { width, height } = getElementWidthAndHeight(this._containerElement);
                    setElementWidth(this._maximisedStack.element, width);
                    setElementHeight(this._maximisedStack.element, height);
                    this._maximisedStack.updateSize(false);
                }
                this.adjustColumnsResponsive();
            }
        }
    }
    /** @internal */
    beginSizeInvalidation() {
        this._sizeInvalidationBeginCount++;
    }
    /** @internal */
    endSizeInvalidation() {
        if (--this._sizeInvalidationBeginCount === 0) {
            this.updateSizeFromContainer();
        }
    }
    /** @internal */
    updateSizeFromContainer() {
        const { width, height } = getElementWidthAndHeight(this._containerElement);
        this.setSize(width, height);
    }
    /**
     * Update the size of the root ContentItem.  This will update the size of all contentItems in the tree
     * @param force - In some cases the size is not updated if it has not changed. In this case, events
     * (such as ComponentContainer.virtualRectingRequiredEvent) are not fired. Setting force to true, ensures the size is updated regardless, and
     * the respective events are fired. This is sometimes necessary when a component's size has not changed but it has become visible, and the
     * relevant events need to be fired.
     */
    updateRootSize(force = false) {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMURS28881');
        }
        else {
            this._groundItem.updateSize(force);
        }
    }
    /** @public */
    createAndInitContentItem(config, parent) {
        const newItem = this.createContentItem(config, parent);
        newItem.init();
        return newItem;
    }
    /**
     * Recursively creates new item tree structures based on a provided
     * ItemConfiguration object
     *
     * @param config - ResolvedItemConfig
     * @param parent - The item the newly created item should be a child of
     * @internal
     */
    createContentItem(config, parent) {
        if (typeof config.type !== 'string') {
            throw new ConfigurationError('Missing parameter \'type\'', JSON.stringify(config));
        }
        /**
         * We add an additional stack around every component that's not within a stack anyways.
         */
        if (
            // If this is a component
            ResolvedItemConfig.isComponentItem(config) &&
            // and it's not already within a stack
            !(parent instanceof Stack) &&
            // and we have a parent
            !!parent &&
            // and it's not the topmost item in a new window
            !(this.isSubWindow === true && parent instanceof GroundItem)) {
            const stackConfig = {
                type: ItemType.stack,
                content: [config],
                size: config.size,
                sizeUnit: config.sizeUnit,
                minSize: config.minSize,
                minSizeUnit: config.minSizeUnit,
                id: config.id,
                maximised: config.maximised,
                isClosable: config.isClosable,
                activeItemIndex: 0,
                header: undefined,
            };
            config = stackConfig;
        }
        const contentItem = this.createContentItemFromConfig(config, parent);
        return contentItem;
    }
    findFirstComponentItemById(id) {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMFFCIBI82446');
        }
        else {
            return this.findFirstContentItemTypeByIdRecursive(ItemType.component, id, this._groundItem);
        }
    }

    /** @internal */
    beginVirtualSizedContainerAdding() {
        if (++this._virtualSizedContainerAddingBeginCount === 0) {
            this._virtualSizedContainers.length = 0;
        }
    }
    /** @internal */
    addVirtualSizedContainer(container) {
        this._virtualSizedContainers.push(container);
    }
    /** @internal */
    endVirtualSizedContainerAdding() {
        if (--this._virtualSizedContainerAddingBeginCount === 0) {
            const count = this._virtualSizedContainers.length;
            if (count > 0) {
                this.fireBeforeVirtualRectingEvent(count);
                for (let i = 0; i < count; i++) {
                    const container = this._virtualSizedContainers[i];
                    container.notifyVirtualRectingRequired();
                }
                this.fireAfterVirtualRectingEvent();
                this._virtualSizedContainers.length = 0;
            }
        }
    }
    /** @internal */
    fireBeforeVirtualRectingEvent(count) {
        if (this.beforeVirtualRectingEvent !== undefined) {
            this.beforeVirtualRectingEvent(count);
        }
    }
    /** @internal */
    fireAfterVirtualRectingEvent() {
        if (this.afterVirtualRectingEvent !== undefined) {
            this.afterVirtualRectingEvent();
        }
    }

    /**
     * Removes a DragListener added by createDragSource() so the corresponding
     * DOM element is not a drag source any more.
     */
    removeDragSource(dragSource) {
        removeFromArray(dragSource, this._dragSources);
        dragSource.destroy();
    }
    /** @internal */
    startComponentDrag(x, y, dragListener, componentItem, stack) {
        new DragProxy(x, y, dragListener, this, componentItem, stack);
    }
    /**
     * Programmatically focuses an item. This focuses the specified component item
     * and the item emits a focus event
     *
     * @param item - The component item to be focused
     * @param suppressEvent - Whether to emit focus event
     */
    focusComponent(item, suppressEvent = false) {
        item.focus(suppressEvent);
    }
    /**
     * Programmatically blurs (defocuses) the currently focused component.
     * If a component item is focused, then it is blurred and and the item emits a blur event
     *
     * @param item - The component item to be blurred
     * @param suppressEvent - Whether to emit blur event
     */
    clearComponentFocus(suppressEvent = false) {
        this.setFocusedComponentItem(undefined, suppressEvent);
    }
    /**
     * Programmatically focuses a component item or removes focus (blurs) from an existing focused component item.
     *
     * @param item - If defined, specifies the component item to be given focus.  If undefined, clear component focus.
     * @param suppressEvents - Whether to emit focus and blur events
     * @internal
     */
    setFocusedComponentItem(item, suppressEvents = false) {
        if (item !== this._focusedComponentItem) {
            let newFocusedParentItem;
            if (item === undefined) {
                newFocusedParentItem === undefined;
            }
            else {
                newFocusedParentItem = item.parentItem;
            }
            if (this._focusedComponentItem !== undefined) {
                const oldFocusedItem = this._focusedComponentItem;
                this._focusedComponentItem = undefined;
                oldFocusedItem.setBlurred(suppressEvents);
                const oldFocusedParentItem = oldFocusedItem.parentItem;
                if (newFocusedParentItem === oldFocusedParentItem) {
                    newFocusedParentItem = undefined;
                }
                else {
                    oldFocusedParentItem.setFocusedValue(false);
                }
            }
            if (item !== undefined) {
                this._focusedComponentItem = item;
                item.setFocused(suppressEvents);
                if (newFocusedParentItem !== undefined) {
                    newFocusedParentItem.setFocusedValue(true);
                }
            }
        }
    }
    /** @internal */
    createContentItemFromConfig(config, parent) {
        switch (config.type) {
            case ItemType.ground: throw new AssertError('LMCCIFC68871');
            case ItemType.row: return new RowOrColumn(false, this, config, parent);
            case ItemType.column: return new RowOrColumn(true, this, config, parent);
            case ItemType.stack: return new Stack(this, config, parent);
            case ItemType.component:
                return new ComponentItem(this, config, parent);
            default:
                throw new UnreachableCaseError('CCC913564', config.type, 'Invalid Config Item type specified');
        }
    }
    /**
     * This should only be called from stack component.
     * Stack will look after docking processing associated with maximise/minimise
     * @internal
     **/
    setMaximisedStack(stack) {
        if (stack === undefined) {
            if (this._maximisedStack !== undefined) {
                this.processMinimiseMaximisedStack();
            }
        }
        else {
            if (stack !== this._maximisedStack) {
                if (this._maximisedStack !== undefined) {
                    this.processMinimiseMaximisedStack();
                }
                this.processMaximiseStack(stack);
            }
        }
    }
    checkMinimiseMaximisedStack() {
        if (this._maximisedStack !== undefined) {
            this._maximisedStack.minimise();
        }
    }
    // showAllActiveContentItems() was called from ContentItem.show().  Not sure what its purpose was so have commented out
    // Everything seems to work ok without this.  Have left commented code just in case there was a reason for it becomes
    // apparent
    // /** @internal */
    // showAllActiveContentItems(): void {
    //     const allStacks = this.getAllStacks();
    //     for (let i = 0; i < allStacks.length; i++) {
    //         const stack = allStacks[i];
    //         const activeContentItem = stack.getActiveComponentItem();
    //         if (activeContentItem !== undefined) {
    //             if (!(activeContentItem instanceof ComponentItem)) {
    //                 throw new AssertError('LMSAACIS22298');
    //             } else {
    //                 activeContentItem.container.show();
    //             }
    //         }
    //     }
    // }
    // hideAllActiveContentItems() was called from ContentItem.hide().  Not sure what its purpose was so have commented out
    // Everything seems to work ok without this.  Have left commented code just in case there was a reason for it becomes
    // apparent
    // /** @internal */
    // hideAllActiveContentItems(): void {
    //     const allStacks = this.getAllStacks();
    //     for (let i = 0; i < allStacks.length; i++) {
    //         const stack = allStacks[i];
    //         const activeContentItem = stack.getActiveComponentItem();
    //         if (activeContentItem !== undefined) {
    //             if (!(activeContentItem instanceof ComponentItem)) {
    //                 throw new AssertError('LMSAACIH22298');
    //             } else {
    //                 activeContentItem.container.hide();
    //             }
    //         }
    //     }
    // }
    /** @internal */
    cleanupBeforeMaximisedStackDestroyed(event) {
        if (this._maximisedStack !== null && this._maximisedStack === event.target) {
            this._maximisedStack.off('beforeItemDestroyed', this._maximisedStackBeforeDestroyedListener);
            this._maximisedStack = undefined;
        }
    }

    /** @internal */
    getArea(x, y) {
        let matchingArea = null;
        let smallestSurface = Infinity;
        for (let i = 0; i < this._itemAreas.length; i++) {
            const area = this._itemAreas[i];
            if (x >= area.x1 &&
                x < area.x2 && // x2 is not included in area
                y >= area.y1 &&
                y < area.y2 && // y2 is not included in area
                smallestSurface > area.surface) {
                smallestSurface = area.surface;
                matchingArea = area;
            }
        }
        return matchingArea;
    }
    /** @internal */
    calculateItemAreas() {
        const allContentItems = this.getAllContentItems();
        /**
         * If the last item is dragged out, highlight the entire container size to
         * allow to re-drop it. this.ground.contentiItems.length === 0 at this point
         *
         * Don't include ground into the possible drop areas though otherwise since it
         * will used for every gap in the layout, e.g. splitters
         */
        const groundItem = this._groundItem;
        if (groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMCIAR44365');
        }
        else {
            if (allContentItems.length === 1) {
                // No root ContentItem (just Ground ContentItem)
                const groundArea = groundItem.getElementArea();
                if (groundArea === null) {
                    throw new UnexpectedNullError('LMCIARA44365');
                }
                else {
                    this._itemAreas = [groundArea];
                }
                return;
            }
            else {
                if (groundItem.contentItems[0].isStack) {
                    // if root is Stack, then split stack and sides of Layout are same, so skip sides
                    this._itemAreas = [];
                }
                else {
                    // sides of layout
                    this._itemAreas = groundItem.createSideAreas();
                }
                for (let i = 0; i < allContentItems.length; i++) {
                    const stack = allContentItems[i];
                    if (ContentItem.isStack(stack)) {
                        const area = stack.getArea();
                        if (area === null) {
                            continue;
                        }
                        else {
                            this._itemAreas.push(area);
                            const stackContentAreaDimensions = stack.contentAreaDimensions;
                            if (stackContentAreaDimensions === undefined) {
                                throw new UnexpectedUndefinedError('LMCIASC45599');
                            }
                            else {
                                const highlightArea = stackContentAreaDimensions.header.highlightArea;
                                const surface = (highlightArea.x2 - highlightArea.x1) * (highlightArea.y2 - highlightArea.y1);
                                const header = {
                                    x1: highlightArea.x1,
                                    x2: highlightArea.x2,
                                    y1: highlightArea.y1,
                                    y2: highlightArea.y2,
                                    contentItem: stack,
                                    surface,
                                };
                                this._itemAreas.push(header);
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Called as part of loading a new layout (including initial init()).
     * Checks to see layout has a maximised item. If so, it maximises that item.
     * @internal
     */
    checkLoadedLayoutMaximiseItem() {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMCLLMI43432');
        }
        else {
            const configMaximisedItems = this._groundItem.getConfigMaximisedItems();
            if (configMaximisedItems.length > 0) {
                let item = configMaximisedItems[0];
                if (ContentItem.isComponentItem(item)) {
                    const stack = item.parent;
                    if (stack === null) {
                        throw new UnexpectedNullError('LMXLLMI69999');
                    }
                    else {
                        item = stack;
                    }
                }
                if (!ContentItem.isStack(item)) {
                    throw new AssertError('LMCLLMI19993');
                }
                else {
                    item.maximise();
                }
            }
        }
    }
    /** @internal */
    processMaximiseStack(stack) {
        this._maximisedStack = stack;
        stack.on('beforeItemDestroyed', this._maximisedStackBeforeDestroyedListener);
        stack.element.classList.add("lm_maximised" /* Maximised */);
        stack.element.insertAdjacentElement('afterend', this._maximisePlaceholder);
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMMXI19993');
        }
        else {
            this._groundItem.element.prepend(stack.element);
            const { width, height } = getElementWidthAndHeight(this._containerElement);
            setElementWidth(stack.element, width);
            setElementHeight(stack.element, height);
            stack.updateSize(true);
            stack.focusActiveContentItem();
            this._maximisedStack.emit('maximised');
            this.emit('stateChanged');
        }
    }
    /** @internal */
    processMinimiseMaximisedStack() {
        if (this._maximisedStack === undefined) {
            throw new AssertError('LMMMS74422');
        }
        else {
            const stack = this._maximisedStack;
            if (stack.parent === null) {
                throw new UnexpectedNullError('LMMI13668');
            }
            else {
                stack.element.classList.remove("lm_maximised" /* Maximised */);
                this._maximisePlaceholder.insertAdjacentElement('afterend', stack.element);
                this._maximisePlaceholder.remove();
                this.updateRootSize(true);
                this._maximisedStack = undefined;
                stack.off('beforeItemDestroyed', this._maximisedStackBeforeDestroyedListener);
                stack.emit('minimised');
                this.emit('stateChanged');
            }
        }
    }

    /**
     * Returns a flattened array of all content items,
     * regardles of level or type
     * @internal
     */
    getAllContentItems() {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMGACI13130');
        }
        else {
            return this._groundItem.getAllContentItems();
        }
    }

    /**
     * Debounces resize events
     * @internal
     */
    handleContainerResize() {
        if (this.resizeWithContainerAutomatically) {
            this.processResizeWithDebounce();
        }
    }
    /**
     * Debounces resize events
     * @internal
     */
    processResizeWithDebounce() {
        if (this.resizeDebounceExtendedWhenPossible) {
            this.checkClearResizeTimeout();
        }
        if (this._resizeTimeoutId === undefined) {
            this._resizeTimeoutId = setTimeout(() => {
                this._resizeTimeoutId = undefined;
                this.beginSizeInvalidation();
                this.endSizeInvalidation();
            }, this.resizeDebounceInterval);
        }
    }
    checkClearResizeTimeout() {
        if (this._resizeTimeoutId !== undefined) {
            clearTimeout(this._resizeTimeoutId);
            this._resizeTimeoutId = undefined;
        }
    }
    /**
     * Determines what element the layout will be created in
     * @internal
     */
    setContainer() {
        var _a;
        const bodyElement = document.body;
        const containerElement = (_a = this._containerElement) !== null && _a !== void 0 ? _a : bodyElement;
        if (containerElement === bodyElement) {
            this.resizeWithContainerAutomatically = true;
            const documentElement = document.documentElement;
            documentElement.style.height = '100%';
            documentElement.style.margin = '0';
            documentElement.style.padding = '0';
            documentElement.style.overflow = 'clip';
            bodyElement.style.height = '100%';
            bodyElement.style.margin = '0';
            bodyElement.style.padding = '0';
            bodyElement.style.overflow = 'clip';
        }
        this._containerElement = containerElement;
    }
    /**
     * Called when the window is closed or the user navigates away
     * from the page
     * @internal
     * @deprecated to be removed in version 3
     */
    onBeforeUnload() {
        this.destroy();
    }
    /**
     * Adjusts the number of columns to be lower to fit the screen and still maintain minItemWidth.
     * @internal
     */
    adjustColumnsResponsive() {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMACR20883');
        }
        else {
            this._firstLoad = false;
            // If there is no min width set, or not content items, do nothing.
            if (this.useResponsiveLayout() &&
                !this._updatingColumnsResponsive &&
                this._groundItem.contentItems.length > 0 &&
                this._groundItem.contentItems[0].isRow) {
                if (this._groundItem === undefined || this._width === null) {
                    throw new UnexpectedUndefinedError('LMACR77412');
                }
                else {
                    // If there is only one column, do nothing.
                    const columnCount = this._groundItem.contentItems[0].contentItems.length;
                    if (columnCount <= 1) {
                        return;
                    }
                    else {
                        // If they all still fit, do nothing.
                        const minItemWidth = this.layoutConfig.dimensions.defaultMinItemWidth;
                        const totalMinWidth = columnCount * minItemWidth;
                        if (totalMinWidth <= this._width) {
                            return;
                        }
                        else {
                            // Prevent updates while it is already happening.
                            this._updatingColumnsResponsive = true;
                            // Figure out how many columns to stack, and put them all in the first stack container.
                            const finalColumnCount = Math.max(Math.floor(this._width / minItemWidth), 1);
                            const stackColumnCount = columnCount - finalColumnCount;
                            const rootContentItem = this._groundItem.contentItems[0];
                            const allStacks = this.getAllStacks();
                            if (allStacks.length === 0) {
                                throw new AssertError('LMACRS77413');
                            }
                            else {
                                const firstStackContainer = allStacks[0];
                                for (let i = 0; i < stackColumnCount; i++) {
                                    // Stack from right.
                                    const column = rootContentItem.contentItems[rootContentItem.contentItems.length - 1];
                                    this.addChildContentItemsToContainer(firstStackContainer, column);
                                }
                                this._updatingColumnsResponsive = false;
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Determines if responsive layout should be used.
     *
     * @returns True if responsive layout should be used; otherwise false.
     * @internal
     */
    useResponsiveLayout() {
        const settings = this.layoutConfig.settings;
        const alwaysResponsiveMode = settings.responsiveMode === ResponsiveMode.always;
        const onLoadResponsiveModeAndFirst = settings.responsiveMode === ResponsiveMode.onload && this._firstLoad;
        return alwaysResponsiveMode || onLoadResponsiveModeAndFirst;
    }
    /**
     * Adds all children of a node to another container recursively.
     * @param container - Container to add child content items to.
     * @param node - Node to search for content items.
     * @internal
     */
    addChildContentItemsToContainer(container, node) {
        const contentItems = node.contentItems;
        if (node instanceof Stack) {
            for (let i = 0; i < contentItems.length; i++) {
                const item = contentItems[i];
                node.removeChild(item, true);
                container.addChild(item);
            }
        }
        else {
            for (let i = 0; i < contentItems.length; i++) {
                const item = contentItems[i];
                this.addChildContentItemsToContainer(container, item);
            }
        }
    }
    /**
     * Finds all the stacks.
     * @returns The found stack containers.
     * @internal
     */
    getAllStacks() {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMFASC52778');
        }
        else {
            const stacks = [];
            this.findAllStacksRecursive(stacks, this._groundItem);
            return stacks;
        }
    }
    /** @internal */
    findFirstContentItemType(type) {
        if (this._groundItem === undefined) {
            throw new UnexpectedUndefinedError('LMFFCIT82446');
        }
        else {
            return this.findFirstContentItemTypeRecursive(type, this._groundItem);
        }
    }
    /** @internal */
    findFirstContentItemTypeRecursive(type, node) {
        const contentItems = node.contentItems;
        const contentItemCount = contentItems.length;
        if (contentItemCount === 0) {
            return undefined;
        }
        else {
            for (let i = 0; i < contentItemCount; i++) {
                const contentItem = contentItems[i];
                if (contentItem.type === type) {
                    return contentItem;
                }
            }
            for (let i = 0; i < contentItemCount; i++) {
                const contentItem = contentItems[i];
                const foundContentItem = this.findFirstContentItemTypeRecursive(type, contentItem);
                if (foundContentItem !== undefined) {
                    return foundContentItem;
                }
            }
            return undefined;
        }
    }
    /** @internal */
    findFirstContentItemTypeByIdRecursive(type, id, node) {
        const contentItems = node.contentItems;
        const contentItemCount = contentItems.length;
        if (contentItemCount === 0) {
            return undefined;
        }
        else {
            for (let i = 0; i < contentItemCount; i++) {
                const contentItem = contentItems[i];
                if (contentItem.type === type && contentItem.id === id) {
                    return contentItem;
                }
            }
            for (let i = 0; i < contentItemCount; i++) {
                const contentItem = contentItems[i];
                const foundContentItem = this.findFirstContentItemTypeByIdRecursive(type, id, contentItem);
                if (foundContentItem !== undefined) {
                    return foundContentItem;
                }
            }
            return undefined;
        }
    }
    /**
     * Finds all the stack containers.
     *
     * @param stacks - Set of containers to populate.
     * @param node - Current node to process.
     * @internal
     */
    findAllStacksRecursive(stacks, node) {
        const contentItems = node.contentItems;
        for (let i = 0; i < contentItems.length; i++) {
            const item = contentItems[i];
            if (item instanceof Stack) {
                stacks.push(item);
            }
            else {
                if (!item.isComponent) {
                    this.findAllStacksRecursive(stacks, item);
                }
            }
        }
    }
    /** @internal */
    findFirstLocation(selectors) {
        const count = selectors.length;
        for (let i = 0; i < count; i++) {
            const selector = selectors[i];
            const location = this.findLocation(selector);
            if (location !== undefined) {
                return location;
            }
        }
        return undefined;
    }
    /** @internal */
    findLocation(selector) {
        const selectorIndex = selector.index;
        switch (selector.typeId) {
            case 0 /* FocusedItem */: {
                if (this._focusedComponentItem === undefined) {
                    return undefined;
                }
                else {
                    const parentItem = this._focusedComponentItem.parentItem;
                    const parentContentItems = parentItem.contentItems;
                    const parentContentItemCount = parentContentItems.length;
                    if (selectorIndex === undefined) {
                        return { parentItem, index: parentContentItemCount };
                    }
                    else {
                        const focusedIndex = parentContentItems.indexOf(this._focusedComponentItem);
                        const index = focusedIndex + selectorIndex;
                        if (index < 0 || index > parentContentItemCount) {
                            return undefined;
                        }
                        else {
                            return { parentItem, index };
                        }
                    }
                }
            }
            case 1 /* FocusedStack */: {
                if (this._focusedComponentItem === undefined) {
                    return undefined;
                }
                else {
                    const parentItem = this._focusedComponentItem.parentItem;
                    return this.tryCreateLocationFromParentItem(parentItem, selectorIndex);
                }
            }
            case 2 /* FirstStack */: {
                const parentItem = this.findFirstContentItemType(ItemType.stack);
                if (parentItem === undefined) {
                    return undefined;
                }
                else {
                    return this.tryCreateLocationFromParentItem(parentItem, selectorIndex);
                }
            }
            case 3 /* FirstRowOrColumn */: {
                let parentItem = this.findFirstContentItemType(ItemType.row);
                if (parentItem !== undefined) {
                    return this.tryCreateLocationFromParentItem(parentItem, selectorIndex);
                }
                else {
                    parentItem = this.findFirstContentItemType(ItemType.column);
                    if (parentItem !== undefined) {
                        return this.tryCreateLocationFromParentItem(parentItem, selectorIndex);
                    }
                    else {
                        return undefined;
                    }
                }
            }
            case 4 /* FirstRow */: {
                const parentItem = this.findFirstContentItemType(ItemType.row);
                if (parentItem === undefined) {
                    return undefined;
                }
                else {
                    return this.tryCreateLocationFromParentItem(parentItem, selectorIndex);
                }
            }
            case 5 /* FirstColumn */: {
                const parentItem = this.findFirstContentItemType(ItemType.column);
                if (parentItem === undefined) {
                    return undefined;
                }
                else {
                    return this.tryCreateLocationFromParentItem(parentItem, selectorIndex);
                }
            }
            case 6 /* Empty */: {
                if (this._groundItem === undefined) {
                    throw new UnexpectedUndefinedError('LMFLRIF18244');
                }
                else {
                    if (this.rootItem !== undefined) {
                        return undefined;
                    }
                    else {
                        if (selectorIndex === undefined || selectorIndex === 0)
                            return { parentItem: this._groundItem, index: 0 };
                        else {
                            return undefined;
                        }
                    }
                }
            }
            case 7 /* Root */: {
                if (this._groundItem === undefined) {
                    throw new UnexpectedUndefinedError('LMFLF18244');
                }
                else {
                    const groundContentItems = this._groundItem.contentItems;
                    if (groundContentItems.length === 0) {
                        if (selectorIndex === undefined || selectorIndex === 0)
                            return { parentItem: this._groundItem, index: 0 };
                        else {
                            return undefined;
                        }
                    }
                    else {
                        const parentItem = groundContentItems[0];
                        return this.tryCreateLocationFromParentItem(parentItem, selectorIndex);
                    }
                }
            }
        }
    }
    /** @internal */
    tryCreateLocationFromParentItem(parentItem, selectorIndex) {
        const parentContentItems = parentItem.contentItems;
        const parentContentItemCount = parentContentItems.length;
        if (selectorIndex === undefined) {
            return { parentItem, index: parentContentItemCount };
        }
        else {
            if (selectorIndex < 0 || selectorIndex > parentContentItemCount) {
                return undefined;
            }
            else {
                return { parentItem, index: selectorIndex };
            }
        }
    }
}
/** @public */
(function (LayoutManager) {
    /** @internal */
    function createMaximisePlaceElement(document) {
        const element = document.createElement('div');
        element.classList.add("lm_maximise_place" /* MaximisePlace */);
        return element;
    }
    LayoutManager.createMaximisePlaceElement = createMaximisePlaceElement;
    /** @internal */
    function createTabDropPlaceholderElement(document) {
        const element = document.createElement('div');
        element.classList.add("lm_drop_tab_placeholder" /* DropTabPlaceholder */);
        return element;
    }
    LayoutManager.createTabDropPlaceholderElement = createTabDropPlaceholderElement;
    /**
     * Default LocationSelectors array used if none is specified.  Will always find a location.
     * @public
     */
    LayoutManager.defaultLocationSelectors = [
        { typeId: 1 /* FocusedStack */, index: undefined },
        { typeId: 2 /* FirstStack */, index: undefined },
        { typeId: 3 /* FirstRowOrColumn */, index: undefined },
        { typeId: 7 /* Root */, index: undefined },
    ];
    /**
     * LocationSelectors to try to get location next to existing focused item
     * @public
     */
    LayoutManager.afterFocusedItemIfPossibleLocationSelectors = [
        { typeId: 0 /* FocusedItem */, index: 1 },
        { typeId: 2 /* FirstStack */, index: undefined },
        { typeId: 3 /* FirstRowOrColumn */, index: undefined },
        { typeId: 7 /* Root */, index: undefined },
    ];
})(LayoutManager || (LayoutManager = {}));