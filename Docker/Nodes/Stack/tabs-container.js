import { Container } from '../../../Sugar/index.js';
import { AssertError } from '../../Core/internal-error.js';
import { numberToPixels, pixelsToNumber } from '../../Utils/utils.js';
import { Tab } from './tab.js';

export class TabsContainer extends Container {
    constructor(_layoutManager, _componentRemoveEvent, _componentFocusEvent, _componentDragStartEvent) {
        super();

        this._layoutManager = _layoutManager;
        this._componentRemoveEvent = _componentRemoveEvent;
        this._componentFocusEvent = _componentFocusEvent;
        this._componentDragStartEvent = _componentDragStartEvent;

        // There is one tab per ComponentItem in stack.  However they may not be ordered the same
        this._tabs = [];
        this._lastVisibleTabIndex = -1;
        this._dropdownActive = false;

        this.class.add("lm_tabs");

        this.width = '100%';
        this.height = '100%';

        this.dom.addEventListener('wheel', (e) => {
            e.preventDefault(); // stop vertical scroll
            this.dom.scrollLeft += e.deltaY; // scroll horizontally
        }, { passive: false });

    }

    get tabs() { return this._tabs; }
    get tabCount() { return this._tabs.length; }
    get lastVisibleTabIndex() { return this._lastVisibleTabIndex; }
    get dropdownActive() { return this._dropdownActive; }

    destroy() {
        for (let i = 0; i < this._tabs.length; i++) {
            this._tabs[i].destroy();
        }
    }
    /**
     * Creates a new tab and associates it with a contentItem
     * @param index - The position of the tab
     */
    createTab(componentItem, index) {
        //If there's already a tab relating to the content item, don't do anything
        for (let i = 0; i < this._tabs.length; i++) {
            if (this._tabs[i].componentItem === componentItem) { return; }
        }

        const tab = new Tab(this._layoutManager, componentItem, (item) => this.handleTabFocusEvent(item), (x, y, dragListener, item) => this.handleTabDragStartEvent(x, y, dragListener, item));
        if (index === undefined) { index = this._tabs.length; }
        this._tabs.splice(index, 0, tab);

        if (index < this.dom.childNodes.length) { this.dom.insertBefore(tab.dom, this.dom.childNodes[index]); }
        else { this.append(tab); }
    }

    removeTab(componentItem) {
        // componentItem cannot be ActiveComponentItem
        for (let i = 0; i < this._tabs.length; i++) {
            if (this._tabs[i].componentItem === componentItem) {
                const tab = this._tabs[i];
                tab.destroy();
                this._tabs.splice(i, 1);
                return;
            }
        }
        throw new Error('contentItem is not controlled by this header');
    }

    processActiveComponentChanged(newActiveComponentItem) {
        let activeIndex = -1;
        for (let i = 0; i < this._tabs.length; i++) {
            const isActive = this._tabs[i].componentItem === newActiveComponentItem;
            this._tabs[i].setActive(isActive);
            if (isActive) {
                activeIndex = i;
            }
        }
        if (activeIndex < 0) {
            throw new AssertError('HSACI56632');
        }
        else {
            if (this._layoutManager.layoutConfig.settings.reorderOnTabMenuClick) {
                /**
                 * If the tab selected was in the dropdown, move everything down one to make way for this one to be the first.
                 * This will make sure the most used tabs stay visible.
                 */
                if (this._lastVisibleTabIndex !== -1 && activeIndex > this._lastVisibleTabIndex) {
                    const activeTab = this._tabs[activeIndex];
                    for (let j = activeIndex; j > 0; j--) {
                        this._tabs[j] = this._tabs[j - 1];
                    }
                    this._tabs[0] = activeTab;
                    // updateTabSizes will always be called after this and it will reposition tab elements
                }
            }
        }
    }
    /**
     * Pushes the tabs to the tab dropdown if the available space is not sufficient
     */
    updateTabSizes(availableWidth, activeComponentItem) {
        let dropDownActive = false;
        const success = this.tryUpdateTabSizes(dropDownActive, availableWidth, activeComponentItem);
        if (!success) {
            dropDownActive = true;
            // this will always succeed
            this.tryUpdateTabSizes(dropDownActive, availableWidth, activeComponentItem);
        }
        if (dropDownActive !== this._dropdownActive) {
            this._dropdownActive = dropDownActive;
        }
    }

    tryUpdateTabSizes(dropdownActive, availableWidth, activeComponentItem) {
        if (this._tabs.length === 0) return true;
        if (!activeComponentItem) throw new Error('non-empty tabs must have active component item');

        const activeIndex = this._tabs.indexOf(activeComponentItem.tab);
        if (activeIndex === -1) throw new Error('Active tab not found in tabs list');

        this._lastVisibleTabIndex = -1;

        // 1. Calculate widths + margins for all tabs
        const tabWidths = this.calculateTabWidths();

        // 2. Check if tabs fit with possible overlap, and apply styles
        return this.applyTabLayout(dropdownActive, availableWidth, activeIndex, tabWidths);
    }

    calculateTabWidths() {
        const widths = [];
        for (const tab of this._tabs) {
            if (tab.dom.parentElement !== this.dom) this.append(tab);
            const style = getComputedStyle(tab.dom);
            const marginRight = pixelsToNumber(style.marginRight);
            widths.push(tab.dom.offsetWidth + marginRight);
        }
        return widths;
    }

    applyTabLayout(dropdownActive, availableWidth, activeIndex, tabWidths) {
        let cumulativeWidth = 0;
        let overlapExceeded = false;
        const allowance = this._layoutManager.layoutConfig.settings.tabOverlapAllowance;

        for (let i = 0; i < this._tabs.length; i++) {
            cumulativeWidth += tabWidths[i];

            // Calculate visible width including active tab logic
            let visibleWidth = (activeIndex <= i)
                ? cumulativeWidth
                : cumulativeWidth + tabWidths[activeIndex];

            if (visibleWidth > availableWidth) {
                if (!overlapExceeded) {
                    const divisor = (activeIndex > 0 && activeIndex <= i) ? i - 1 : i;
                    const overlap = (visibleWidth - availableWidth) / divisor;

                    if (overlap < allowance) {
                        this.applyOverlapStyles(i, activeIndex, overlap);
                        this._lastVisibleTabIndex = i;
                        if (this._tabs[i].dom.parentElement !== this.dom) this.append(this._tabs[i]);
                    } else {
                        overlapExceeded = true;
                    }
                }
                if (overlapExceeded && i !== activeIndex) {
                    if (dropdownActive) {
                        this.resetTabStyle(i);
                    } else {
                        return false; // force retry with dropdown active
                    }
                } else if (i === activeIndex) {
                    this.resetTabStyle(i);
                    if (this._tabs[i].dom.parentElement !== this.dom) this.append(this._tabs[i]);
                }
            } else {
                this._lastVisibleTabIndex = i;
                this.resetTabStyle(i);
                if (this._tabs[i].dom.parentElement !== this.dom) this.append(this._tabs[i]);
            }
        }

        return true;
    }

    applyOverlapStyles(index, activeIndex, overlap) {
        for (let j = 0; j <= index; j++) {
            const marginLeft = (j !== activeIndex && j !== 0) ? '-' + numberToPixels(overlap) : '';
            this._tabs[j].style.zIndex = numberToPixels(index - j);
            this._tabs[j].style.marginLeft = marginLeft;
        }
    }

    resetTabStyle(i) {
        this._tabs[i].style.zIndex = 'auto';
        this._tabs[i].style.marginLeft = '';
    }

    handleTabFocusEvent(componentItem) {
        this._componentFocusEvent(componentItem);
    }
    
    handleTabDragStartEvent(x, y, dragListener, componentItem) {
        this._componentDragStartEvent(x, y, dragListener, componentItem);
    }
}