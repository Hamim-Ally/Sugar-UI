import { UnexpectedNullError, UnexpectedUndefinedError } from '../../Core/internal-error.js';
import { numberToPixels } from '../../Utils/utils.js';
import { Container, Label } from '../../../Sugar/index.js';

class DragProxy extends Container {
    constructor(initialX, initialY, _dragListener, _layoutManager, _componentItem, _originalParent) {
        super();
        this._dragListener = _dragListener;
        this._layoutManager = _layoutManager;
        this._componentItem = _componentItem;
        this._originalParent = _originalParent;
        this._area = null;
        this._lastValidArea = null;
        this._dragListener.on('drag', (offsetX, offsetY, event) => this.onDrag(offsetX, offsetY, event));
        this._dragListener.on('dragStop', () => this.onDrop());

        this.class.add('lm_dragProxy');
        this.style.left = numberToPixels(initialX);
        this.style.top = numberToPixels(initialY);
        const titleElement = new Label({ class: "lm_title", text: this._componentItem.title });;
        this.append(titleElement);

        if (this._componentItem.parent === null) {
            // Note that _contentItem will have dummy GroundItem as parent if initiated by a external drag source
            throw new UnexpectedNullError('DPC10097');
        }

        this._componentItemFocused = this._componentItem.focused;
        if (this._componentItemFocused) { this._componentItem.blur(); }

        this._componentItem.parent.removeChild(this._componentItem, true);
        document.body.appendChild(this.dom);

        this.determineMinMaxXY();
        this._layoutManager.calculateItemAreas();
        this.setPosition(initialX, initialY);
    }

    get element() { return this.dom; }

    determineMinMaxXY() {
        const groundItem = this._layoutManager.groundItem;
        if (groundItem === undefined) { throw new UnexpectedUndefinedError('DPDMMXY73109'); }
        else {
            const groundElement = groundItem.element;
            const rect = groundElement.getBoundingClientRect();
            this._minX = rect.left + document.body.scrollLeft;
            this._minY = rect.top + document.body.scrollTop;
            this._maxX = this._minX + rect.width;
            this._maxY = this._minY + rect.height;
        }
    }

    /**
     * Callback on every mouseMove event during a drag. Determines if the drag is
     * still within the valid drag area and calls the layoutManager to highlight the
     * current drop area
     *
     * @param offsetX - The difference from the original x position in px
     * @param offsetY - The difference from the original y position in px
     * @param event -
     * @internal
     */
    onDrag(offsetX, offsetY, event) {
        const x = event.pageX;
        const y = event.pageY;
        this.setPosition(x, y);
        this._componentItem.drag();
    }

    /**
     * Sets the target position, highlighting the appropriate area
     *
     * @param x - The x position in px
     * @param y - The y position in px
     *
     * @internal
     */
    setPosition(x, y) {
        if (this._layoutManager.layoutConfig.settings.constrainDragToContainer) {
            if (x <= this._minX) {
                x = Math.ceil(this._minX);
            }
            else if (x >= this._maxX) {
                x = Math.floor(this._maxX);
            }
            if (y <= this._minY) {
                y = Math.ceil(this._minY);
            }
            else if (y >= this._maxY) {
                y = Math.floor(this._maxY);
            }
        }
        this.style.left = numberToPixels(x);
        this.style.top = numberToPixels(y);
        this._area = this._layoutManager.getArea(x, y);
        if (this._area !== null) {
            this._lastValidArea = this._area;
            this._area.contentItem.highlightDropZone(x, y, this._area);
        }
    }

    /**
     * Callback when the drag has finished. Determines the drop area
     * and adds the child to it
     * @internal
     */
    onDrop() {
        const dropTargetIndicator = this._layoutManager.dropTargetIndicator;
        if (dropTargetIndicator === null) {
            throw new UnexpectedNullError('DPOD30011');
        }
        else {
            dropTargetIndicator.hide();
        }
        this._componentItem.exitDragMode();
        /*
         * Valid drop area found
         */
        let droppedComponentItem;
        if (this._area !== null) {
            droppedComponentItem = this._componentItem;
            this._area.contentItem.onDrop(droppedComponentItem, this._area);
            /**
             * No valid drop area available at present, but one has been found before.
             * Use it
             */
        }
        else if (this._lastValidArea !== null) {
            droppedComponentItem = this._componentItem;
            const newParentContentItem = this._lastValidArea.contentItem;
            newParentContentItem.onDrop(droppedComponentItem, this._lastValidArea);
            /**
             * No valid drop area found during the duration of the drag. Return
             * content item to its original position if a original parent is provided.
             * (Which is not the case if the drag had been initiated by createDragSource)
             */
        }
        else if (this._originalParent) {
            droppedComponentItem = this._componentItem;
            this._originalParent.addChild(droppedComponentItem);
            /**
             * The drag didn't ultimately end up with adding the content item to
             * any container. In order to ensure clean up happens, destroy the
             * content item.
             */
        }
        else {
            this._componentItem.destroy(); // contentItem children are now destroyed as well
        }
        this.dom.remove();
        this._layoutManager.emit('itemDropped', this._componentItem);
        if (this._componentItemFocused && droppedComponentItem !== undefined) {
            droppedComponentItem.focus();
        }
    }
}

export { DragProxy }