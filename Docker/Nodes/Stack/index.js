import { ItemConfig } from '../../Core/config.js';
import { ResolvedHeaderedItemConfig, ResolvedItemConfig, ResolvedStackItemConfig } from '../../Core/resolved-config.js';
import { Header } from './header.js';
import { AssertError, UnexpectedNullError, UnexpectedUndefinedError } from '../../Core/internal-error.js';
import { EventEmitter } from '../../Events/event-emitter.js';
import { ItemType, SizeUnitEnum } from '../../Utils/types.js';
import { getElementWidthAndHeight, numberToPixels } from '../../Utils/utils.js';
import { ComponentItem } from '../Component/component-item.js';
import { ComponentParentableItem } from '../Component/component-parentable-item.js';
import { ContentItem } from '../Component/content-item.js';
import { Container } from '../../../Sugar/index.js';

export class Stack extends ComponentParentableItem {
    constructor(layoutManager, config, parent) {
        super(layoutManager, config, parent, Stack.createElement());

        this._headerSideChanged = false;
        this._resizeListener = () => this.handleResize();
        this._headerConfig = config.header;
        const configContent = config.content;

        let componentHeaderConfig;
        // If stack has only one component, then we can also check this for header settings
        if (configContent.length !== 1) { componentHeaderConfig = undefined; }
        else {
            const firstChildItemConfig = configContent[0];
            componentHeaderConfig = firstChildItemConfig.header; // will be undefined if not component (and wont be stack)
        }

        this._initialWantMaximise = config.maximised;
        this._initialActiveItemIndex = config.activeItemIndex ?? 0;// make sure defined

        this._header = new Header(layoutManager,
            this,
            () => this.getActiveComponentItem(),
            () => this.remove(),
            () => this.toggleMaximise(),
            (item) => this.handleHeaderComponentRemoveEvent(item),
            (item) => this.handleHeaderComponentFocusEvent(item),
            (x, y, dragListener, item) => this.handleHeaderComponentStartDragEvent(x, y, dragListener, item)
        );

        this.isStack = true;

        this._childElementContainer = new Container({ class: 'stack-content', height: '100%', width: '100%'});
        this._childElementContainer.class.add("lm_items");

        this.on('resize', this._resizeListener);

        this.element.appendChild(this._header.element);
        this.element.appendChild(this._childElementContainer.dom);
        this.setupHeaderPosition();
    }


    get childElementContainer() { return this._childElementContainer.dom; }
    get header() { return this._header; }
    get headerLeftRightSided() { return this._header.leftRightSided; }
    get contentAreaDimensions() { return this._contentAreaDimensions; }
    get initialWantMaximise() { return this._initialWantMaximise; }
    get isMaximised() { return this === this.layoutManager.maximisedStack; }
    get stackParent() {
        if (!this.parent) { throw new Error('Stack should always have a parent'); }
        return this.parent;
    }

    static createElement() {
        const element = new Container({ class: 'lm_stack' });
        element.class.add("lm_item");
        return element.dom;
    }

    updateSize(force) {
        this.layoutManager.beginVirtualSizedContainerAdding();
        try {
            this.updateNodeSize();
            this.updateContentItemsSize(force);
        }
        finally {
            this.layoutManager.endVirtualSizedContainerAdding();
        }
    }

    init() {
        if (this.isInitialised === true)
            return;
        this.updateNodeSize();
        for (let i = 0; i < this.contentItems.length; i++) {
            this._childElementContainer.append(this.contentItems[i].element);
        }
        super.init();
        const contentItems = this.contentItems;
        const contentItemCount = contentItems.length;
        if (contentItemCount > 0) { // contentItemCount will be 0 on drag drop
            if (this._initialActiveItemIndex < 0 || this._initialActiveItemIndex >= contentItemCount) {
                throw new Error(`ActiveItemIndex out of range: ${this._initialActiveItemIndex} id: ${this.id}`);
            }
            else {
                for (let i = 0; i < contentItemCount; i++) {
                    const contentItem = contentItems[i];
                    if (!(contentItem instanceof ComponentItem)) {
                        throw new Error(`Stack Content Item is not of type ComponentItem: ${i} id: ${this.id}`);
                    }
                    else {
                        this._header.createTab(contentItem, i);
                        contentItem.hide();
                        contentItem.container.setBaseLogicalZIndex();
                    }
                }
                this.setActiveComponentItem(contentItems[this._initialActiveItemIndex], false);
                this._header.updateTabSizes();
            }
        }
        this.initContentItems();
    }

    setActiveContentItem(item) {
        if (!ContentItem.isComponentItem(item)) {
            throw new Error('Stack.setActiveContentItem: item is not a ComponentItem');
        }
        else {
            this.setActiveComponentItem(item, false);
        }
    }

    setActiveComponentItem(componentItem, focus, suppressFocusEvent = false) {
        if (this._activeComponentItem !== componentItem) {
            if (this.contentItems.indexOf(componentItem) === -1) {
                throw new Error('componentItem is not a child of this stack');
            }
            else {
                this.layoutManager.beginSizeInvalidation();
                try {
                    if (this._activeComponentItem !== undefined) {
                        this._activeComponentItem.hide();
                    }
                    this._activeComponentItem = componentItem;
                    this._header.processActiveComponentChanged(componentItem);
                    componentItem.show();
                }
                finally {
                    this.layoutManager.endSizeInvalidation();
                }
                this.emit('activeContentItemChanged', componentItem);
                this.layoutManager.emit('activeContentItemChanged', componentItem);
                this.emitStateChangedEvent();
            }
        }
        if (this.focused || focus) {
            this.layoutManager.setFocusedComponentItem(componentItem, suppressFocusEvent);
        }
    }

    getActiveContentItem() {
        var _a;
        return (_a = this.getActiveComponentItem()) !== null && _a !== void 0 ? _a : null;
    }

    getActiveComponentItem() {
        return this._activeComponentItem;
    }

    focusActiveContentItem() {
        var _a;
        (_a = this._activeComponentItem) === null || _a === void 0 ? void 0 : _a.focus();
    }

    setFocusedValue(value) {
        this._header.applyFocusedValue(value);
        super.setFocusedValue(value);
    }

    setRowColumnClosable(value) {
        this._header.setRowColumnClosable(value);
    }

    newComponent(componentType, componentState, title, index) {
        const itemConfig = {
            type: 'component',
            componentType,
            componentState,
            title,
        };
        return this.newItem(itemConfig, index);
    }

    addComponent(componentType, componentState, title, index) {
        const itemConfig = {
            type: 'component',
            componentType,
            componentState,
            title,
        };
        return this.addItem(itemConfig, index);
    }

    newItem(itemConfig, index) {
        index = this.addItem(itemConfig, index);
        return this.contentItems[index];
    }

    addItem(itemConfig, index) {
        this.layoutManager.checkMinimiseMaximisedStack();
        const resolvedItemConfig = ItemConfig.resolve(itemConfig, false);
        const contentItem = this.layoutManager.createAndInitContentItem(resolvedItemConfig, this);
        return this.addChild(contentItem, index);
    }

    addChild(contentItem, index, focus = false) {
        if (index !== undefined && index > this.contentItems.length) {
            index -= 1;
            throw new AssertError('SAC99728'); // undisplayChild() removed so this condition should no longer occur
        }
        if (!(contentItem instanceof ComponentItem)) {
            throw new AssertError('SACC88532'); // Stacks can only have Component children
        }
        else {
            index = super.addChild(contentItem, index);
            this._childElementContainer.append(contentItem.element);
            this._header.createTab(contentItem, index);
            this.setActiveComponentItem(contentItem, focus);
            this._header.updateTabSizes();
            this.updateSize(false);
            contentItem.container.setBaseLogicalZIndex();
            this.emitStateChangedEvent();
            return index;
        }
    }

    removeChild(contentItem, keepChild) {
        const componentItem = contentItem;
        const index = this.contentItems.indexOf(componentItem);
        const stackWillBeDeleted = this.contentItems.length === 1;
        if (this._activeComponentItem === componentItem) {
            if (componentItem.focused) {
                componentItem.blur();
            }
            if (!stackWillBeDeleted) {
                // At this point we're already sure we have at least one content item left *after*
                // removing contentItem, so we can safely assume index 1 is a valid one if
                // the index of contentItem is 0, otherwise we just use the previous content item.
                const newActiveComponentIdx = index === 0 ? 1 : index - 1;
                this.setActiveComponentItem(this.contentItems[newActiveComponentIdx], false);
            }
        }
        this._header.removeTab(componentItem);
        super.removeChild(componentItem, keepChild);
        this.emitStateChangedEvent();
    }
    /**
     * Maximises the Item or minimises it if it is already maximised
     */
    toggleMaximise() {
        if (this.isMaximised) {
            this.minimise();
        }
        else {
            this.maximise();
        }
    }
    maximise() {
        if (!this.isMaximised) {
            this.layoutManager.setMaximisedStack(this);
            const contentItems = this.contentItems;
            const contentItemCount = contentItems.length;
            for (let i = 0; i < contentItemCount; i++) {
                const contentItem = contentItems[i];
                if (contentItem instanceof ComponentItem) {
                    contentItem.enterStackMaximised();
                }
                else {
                    throw new AssertError('SMAXI87773');
                }
            }
            this.emitStateChangedEvent();
        }
    }
    minimise() {
        if (this.isMaximised) {
            this.layoutManager.setMaximisedStack(undefined);
            const contentItems = this.contentItems;
            const contentItemCount = contentItems.length;
            for (let i = 0; i < contentItemCount; i++) {
                const contentItem = contentItems[i];
                if (contentItem instanceof ComponentItem) {
                    contentItem.exitStackMaximised();
                }
                else {
                    throw new AssertError('SMINI87773');
                }
            }
            this.emitStateChangedEvent();
        }
    }

    destroy() {
        var _a;
        if ((_a = this._activeComponentItem) === null || _a === void 0 ? void 0 : _a.focused) {
            this._activeComponentItem.blur();
        }
        super.destroy();
        this.off('resize', this._resizeListener);
        this._header.destroy();
    }

    toConfig() {
        let activeItemIndex;
        if (this._activeComponentItem) {
            activeItemIndex = this.contentItems.indexOf(this._activeComponentItem);
            if (activeItemIndex < 0) {
                throw new Error('active component item not found in stack');
            }
        }
        if (this.contentItems.length > 0 && activeItemIndex === undefined) {
            throw new Error('expected non-empty stack to have an active component item');
        }
        else {
            const result = {
                type: 'stack',
                content: this.calculateConfigContent(),
                size: this.size,
                sizeUnit: this.sizeUnit,
                minSize: this.minSize,
                minSizeUnit: this.minSizeUnit,
                id: this.id,
                isClosable: this.isClosable,
                maximised: this.isMaximised,
                header: this.createHeaderConfig(),
                activeItemIndex,
            };
            return result;
        }
    }

    onDrop(contentItem, area) {
        /*
         * The item was dropped on the header area. Just add it as a child of this stack and
         * get the hell out of this logic
         */
        if (this._dropSegment === "header" /* Header */) {
            this.resetHeaderDropZone();
            if (this._dropIndex === undefined) {
                throw new UnexpectedUndefinedError('SODDI68990');
            }
            else {
                this.addChild(contentItem, this._dropIndex);
                return;
            }
        }
        /*
         * The stack is empty. Let's just add the element.
         */
        if (this._dropSegment === "body" /* Body */) {
            this.addChild(contentItem, 0, true);
            return;
        }
        /*
         * The item was dropped on the top-, left-, bottom- or right- part of the content. Let's
         * aggregate some conditions to make the if statements later on more readable
         */
        const isVertical = this._dropSegment === "top" /* Top */ || this._dropSegment === "bottom" /* Bottom */;
        const isHorizontal = this._dropSegment === "left" /* Left */ || this._dropSegment === "right" /* Right */;
        const insertBefore = this._dropSegment === "top" /* Top */ || this._dropSegment === "left" /* Left */;
        const hasCorrectParent = (isVertical && this.stackParent.isColumn) || (isHorizontal && this.stackParent.isRow);
        /*
         * The content item can be either a component or a stack. If it is a component, wrap it into a stack
         */
        if (contentItem.isComponent) {
            const itemConfig = ResolvedStackItemConfig.createDefault();
            itemConfig.header = this.createHeaderConfig();
            const stack = this.layoutManager.createAndInitContentItem(itemConfig, this);
            stack.addChild(contentItem);
            contentItem = stack;
        }
        /*
         * If the contentItem that's being dropped is not dropped on a Stack (cases which just passed above and
         * which would wrap the contentItem in a Stack) we need to check whether contentItem is a RowOrColumn.
         * If it is, we need to re-wrap it in a Stack like it was when it was dragged by its Tab (it was dragged!).
         */
        if (contentItem.type === ItemType.row || contentItem.type === ItemType.column) {
            const itemConfig = ResolvedStackItemConfig.createDefault();
            itemConfig.header = this.createHeaderConfig();
            const stack = this.layoutManager.createContentItem(itemConfig, this);
            stack.addChild(contentItem);
            contentItem = stack;
        }
        /*
         * If the item is dropped on top or bottom of a column or left and right of a row, it's already
         * layd out in the correct way. Just add it as a child
         */
        if (hasCorrectParent) {
            const index = this.stackParent.contentItems.indexOf(this);
            this.stackParent.addChild(contentItem, insertBefore ? index : index + 1, true);
            this.size *= 0.5;
            contentItem.size = this.size;
            contentItem.sizeUnit = this.sizeUnit;
            this.stackParent.updateSize(false);
            /*
             * This handles items that are dropped on top or bottom of a row or left / right of a column. We need
             * to create the appropriate contentItem for them to live in
             */
        }
        else {
            const type = isVertical ? ItemType.column : ItemType.row;
            const itemConfig = ResolvedItemConfig.createDefault(type);
            const rowOrColumn = this.layoutManager.createContentItem(itemConfig, this);
            this.stackParent.replaceChild(this, rowOrColumn);
            rowOrColumn.addChild(contentItem, insertBefore ? 0 : undefined, true);
            rowOrColumn.addChild(this, insertBefore ? undefined : 0, true);
            this.size = 50;
            contentItem.size = 50;
            contentItem.sizeUnit = SizeUnitEnum.Percent;
            rowOrColumn.updateSize(false);
        }
    }
    /**
     * If the user hovers above the header part of the stack, indicate drop positions for tabs.
     * otherwise indicate which segment of the body the dragged item would be dropped on
     *
     * @param x - Absolute Screen X
     * @param y - Absolute Screen Y
     * @internal
     */
    highlightDropZone(x, y) {
        for (const key in this._contentAreaDimensions) {
            const segment = key;
            const area = this._contentAreaDimensions[segment].hoverArea;
            if (area.x1 < x && area.x2 > x && area.y1 < y && area.y2 > y) {
                if (segment === "header" /* Header */) {
                    this._dropSegment = "header" /* Header */;
                    this.highlightHeaderDropZone(this._header.leftRightSided ? y : x);
                }
                else {
                    this.resetHeaderDropZone();
                    this.highlightBodyDropZone(segment);
                }
                return;
            }
        }
    }
    /** @internal */
    getArea() {
        if (this.element.style.display === 'none') {
            return null;
        }
        const headerArea = super.getElementArea(this._header.element);
        const contentArea = super.getElementArea(this._childElementContainer.dom);
        if (headerArea === null || contentArea === null) {
            throw new UnexpectedNullError('SGAHC13086');
        }
        const contentWidth = contentArea.x2 - contentArea.x1;
        const contentHeight = contentArea.y2 - contentArea.y1;
        this._contentAreaDimensions = {
            header: {
                hoverArea: {
                    x1: headerArea.x1,
                    y1: headerArea.y1,
                    x2: headerArea.x2,
                    y2: headerArea.y2
                },
                highlightArea: {
                    x1: headerArea.x1,
                    y1: headerArea.y1,
                    x2: headerArea.x2,
                    y2: headerArea.y2
                }
            }
        };
        /**
         * Highlight the entire body if the stack is empty
         */
        if (this.contentItems.length === 0) {
            this._contentAreaDimensions.body = {
                hoverArea: {
                    x1: contentArea.x1,
                    y1: contentArea.y1,
                    x2: contentArea.x2,
                    y2: contentArea.y2
                },
                highlightArea: {
                    x1: contentArea.x1,
                    y1: contentArea.y1,
                    x2: contentArea.x2,
                    y2: contentArea.y2
                }
            };
            return super.getElementArea(this.element);
        }
        else {
            this._contentAreaDimensions.left = {
                hoverArea: {
                    x1: contentArea.x1,
                    y1: contentArea.y1,
                    x2: contentArea.x1 + contentWidth * 0.25,
                    y2: contentArea.y2
                },
                highlightArea: {
                    x1: contentArea.x1,
                    y1: contentArea.y1,
                    x2: contentArea.x1 + contentWidth * 0.5,
                    y2: contentArea.y2
                }
            };
            this._contentAreaDimensions.top = {
                hoverArea: {
                    x1: contentArea.x1 + contentWidth * 0.25,
                    y1: contentArea.y1,
                    x2: contentArea.x1 + contentWidth * 0.75,
                    y2: contentArea.y1 + contentHeight * 0.5
                },
                highlightArea: {
                    x1: contentArea.x1,
                    y1: contentArea.y1,
                    x2: contentArea.x2,
                    y2: contentArea.y1 + contentHeight * 0.5
                }
            };
            this._contentAreaDimensions.right = {
                hoverArea: {
                    x1: contentArea.x1 + contentWidth * 0.75,
                    y1: contentArea.y1,
                    x2: contentArea.x2,
                    y2: contentArea.y2
                },
                highlightArea: {
                    x1: contentArea.x1 + contentWidth * 0.5,
                    y1: contentArea.y1,
                    x2: contentArea.x2,
                    y2: contentArea.y2
                }
            };
            this._contentAreaDimensions.bottom = {
                hoverArea: {
                    x1: contentArea.x1 + contentWidth * 0.25,
                    y1: contentArea.y1 + contentHeight * 0.5,
                    x2: contentArea.x1 + contentWidth * 0.75,
                    y2: contentArea.y2
                },
                highlightArea: {
                    x1: contentArea.x1,
                    y1: contentArea.y1 + contentHeight * 0.5,
                    x2: contentArea.x2,
                    y2: contentArea.y2
                }
            };
            return super.getElementArea(this.element);
        }
    }
    /**
     * Programmatically operate with header position.
     *
     * @param position -
     *
     * @returns previous header position
     * @internal
     */
    positionHeader(position) {
        if (this._header.side !== position) {
            this._header.setSide(position);
            this._headerSideChanged = true;
            this.setupHeaderPosition();
        }
    }
    /** @internal */
    updateNodeSize() {
        if (this.element.style.display !== 'none') {
   
            const content = getElementWidthAndHeight(this.element);
            this._childElementContainer.width = content.width;
            this._childElementContainer.height = content.height - this._header.element.offsetHeight;
            console.log(content.height);
            for (let i = 0; i < this.contentItems.length; i++) {
                this.contentItems[i].element.style.width = numberToPixels(content.width);
                this.contentItems[i].element.style.height = numberToPixels(content.height);
            }
            this.emit('resize');
            this.emitStateChangedEvent();
        }
    }
    /** @internal */
    highlightHeaderDropZone(x) {
        const visibleTabsLength = this._header.lastVisibleTabIndex + 1;
        const tabsContainerElement = this._header.tabsContainerElement;
        const tabsContainerElementChildNodes = tabsContainerElement.childNodes;
        // Create shallow copy of childNodes list, excluding DropPlaceHolder, as we will be modifying the childNodes list
        const visibleTabElements = new Array(visibleTabsLength);
        let tabIndex = 0;
        let tabCount = 0;
        while (tabCount < visibleTabsLength) {
            const visibleTabElement = tabsContainerElementChildNodes[tabIndex++];
            if (visibleTabElement !== this.layoutManager.tabDropPlaceholder) {
                visibleTabElements[tabCount++] = visibleTabElement;
            }
        }
        const dropTargetIndicator = this.layoutManager.dropTargetIndicator;
        if (dropTargetIndicator === null) {
            throw new UnexpectedNullError('SHHDZDTI97110');
        }
        let area;
        // Empty stack
        if (visibleTabsLength === 0) {
            const headerRect = this._header.element.getBoundingClientRect();
            const headerTop = headerRect.top + document.body.scrollTop;
            const headerLeft = headerRect.left + document.body.scrollLeft;
            area = {
                x1: headerLeft,
                x2: headerLeft + 100,
                y1: headerTop + headerRect.height - 20,
                y2: headerTop + headerRect.height,
            };
            this._dropIndex = 0;
        }
        else {
            let tabIndex = 0;
            // This indicates whether our cursor is exactly over a tab
            let isAboveTab = false;
            let tabTop;
            let tabLeft;
            let tabWidth;
            let tabElement;
            do {
                tabElement = visibleTabElements[tabIndex];
                const tabRect = tabElement.getBoundingClientRect();
                const tabRectTop = tabRect.top + document.body.scrollTop;
                const tabRectLeft = tabRect.left + document.body.scrollLeft;
                if (this._header.leftRightSided) {
                    tabLeft = tabRectTop;
                    tabTop = tabRectLeft;
                    tabWidth = tabRect.height;
                }
                else {
                    tabLeft = tabRectLeft;
                    tabTop = tabRectTop;
                    tabWidth = tabRect.width;
                }
                if (x >= tabLeft && x < tabLeft + tabWidth) {
                    isAboveTab = true;
                }
                else {
                    tabIndex++;
                }
            } while (tabIndex < visibleTabsLength && !isAboveTab);
            // If we're not above any tabs, or to the right of any tab, we are out of the area, so give up
            if (isAboveTab === false && x < tabLeft) {
                return;
            }
            const halfX = tabLeft + tabWidth / 2;
            if (x < halfX) {
                this._dropIndex = tabIndex;
                tabElement.insertAdjacentElement('beforebegin', this.layoutManager.tabDropPlaceholder);
            }
            else {
                this._dropIndex = Math.min(tabIndex + 1, visibleTabsLength);
                tabElement.insertAdjacentElement('afterend', this.layoutManager.tabDropPlaceholder);
            }
            const tabDropPlaceholderRect = this.layoutManager.tabDropPlaceholder.getBoundingClientRect();
            const tabDropPlaceholderRectTop = tabDropPlaceholderRect.top + document.body.scrollTop;
            const tabDropPlaceholderRectLeft = tabDropPlaceholderRect.left + document.body.scrollLeft;
            const tabDropPlaceholderRectWidth = tabDropPlaceholderRect.width;
            if (this._header.leftRightSided) {
                const placeHolderTop = tabDropPlaceholderRectTop;
                area = {
                    x1: tabTop,
                    x2: tabTop + tabElement.clientHeight,
                    y1: placeHolderTop,
                    y2: placeHolderTop + tabDropPlaceholderRectWidth,
                };
            }
            else {
                const placeHolderLeft = tabDropPlaceholderRectLeft;
                area = {
                    x1: placeHolderLeft,
                    x2: placeHolderLeft + tabDropPlaceholderRectWidth,
                    y1: tabTop,
                    y2: tabTop + tabElement.clientHeight,
                };
            }
        }
        dropTargetIndicator.highlightArea(area, 0);
        return;
    }

    resetHeaderDropZone() { this.layoutManager.tabDropPlaceholder.remove(); }
    setupHeaderPosition() {
        this.element.classList.remove("lm_left", "lm_right", "lm_bottom");
        if (this._header.leftRightSided) {
            this.element.classList.add('lm_' + this._header.side);
        }
        this.updateSize(false);
    }

    highlightBodyDropZone(segment) {
        if (this._contentAreaDimensions === undefined) {
            throw new UnexpectedUndefinedError('SHBDZC82265');
        }
        else {
            const highlightArea = this._contentAreaDimensions[segment].highlightArea;
            const dropTargetIndicator = this.layoutManager.dropTargetIndicator;
            if (dropTargetIndicator === null) {
                throw new UnexpectedNullError('SHBDZD96110');
            }
            else {
                dropTargetIndicator.highlightArea(highlightArea, 1);
                this._dropSegment = segment;
            }
        }
    }

    handleResize() { this._header.updateTabSizes(); }

    handleHeaderClickEvent(ev) {
        const eventName = EventEmitter.headerClickEventName;
        const bubblingEvent = new EventEmitter.ClickBubblingEvent(eventName, this, ev);
        this.emit(eventName, bubblingEvent);
    }

    handleHeaderTouchStartEvent(ev) {
        const eventName = EventEmitter.headerTouchStartEventName;
        const bubblingEvent = new EventEmitter.TouchStartBubblingEvent(eventName, this, ev);
        this.emit(eventName, bubblingEvent);
    }

    handleHeaderComponentRemoveEvent(item) { this.removeChild(item, false); }
    handleHeaderComponentFocusEvent(item) { this.setActiveComponentItem(item, true); }

    handleHeaderComponentStartDragEvent(x, y, dragListener, componentItem) {
        if (this.isMaximised === true) { this.toggleMaximise(); }
        this.layoutManager.startComponentDrag(x, y, dragListener, componentItem, this);
    }

    createHeaderConfig() { if (!this._headerSideChanged) { return ResolvedHeaderedItemConfig.Header.createCopy(this._headerConfig); } }
    emitStateChangedEvent() { this.emitBaseBubblingEvent('stateChanged'); }
}