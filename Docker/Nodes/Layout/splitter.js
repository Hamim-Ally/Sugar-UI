import { Container } from '../../../Sugar/index.js';
import { DragListener } from '../../Events/drag-listener.js';
import { numberToPixels } from '../../Utils/utils.js';

class Splitter extends Container {
    constructor(_isVertical, _size, grabSize){
        super();
        this._isVertical = _isVertical;
        this._size = _size;
        this._grabSize = grabSize < this._size ? this._size : grabSize;

        this.class.add("lm_splitter");
        const dragHandleElement = new Container({ class: "lm_drag_handle" });

        const handleExcessSize = this._grabSize - this._size;
        const handleExcessPos = handleExcessSize / 2;

        if (this._isVertical) {
            dragHandleElement.style.top = numberToPixels(-handleExcessPos);
            dragHandleElement.height = this._size + handleExcessSize;
            this.class.add("lm_vertical");
            this.height = this._size;
        }

        else {
            dragHandleElement.style.left = numberToPixels(-handleExcessPos);
            dragHandleElement.width = this._size + handleExcessSize;
            this.class.add("lm_horizontal");
            this.width = this._size;
        }

        this.append(dragHandleElement);
        this._dragListener = new DragListener(this.dom, [dragHandleElement.dom]);
    }

    get element() { return this.dom; }

    destroy() {this.dom.remove();}
    on(eventName, callback) {if (this._dragListener) {this._dragListener.on(eventName, callback);}}
}

export { Splitter }