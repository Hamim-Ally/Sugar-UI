import { BindError } from './external-error.js';
import { UnexpectedUndefinedError } from './internal-error.js';
import { LayoutManager } from './layout-manager.js';
import { i18nStrings } from '../Utils/i18n-strings.js';

export class VirtualLayout extends LayoutManager {
    constructor(configOrOptionalContainer, containerOrBindComponentEventHandler, unbindComponentEventHandler) {
        super(VirtualLayout.createLayoutManagerConstructorParameters(configOrOptionalContainer, containerOrBindComponentEventHandler));
        /** @internal @deprecated use while constructor is not determinate */
        this._bindComponentEventHanlderPassedInConstructor = false; // remove when constructor is determinate
        /** @internal  @deprecated use while constructor is not determinate */
        this._creationTimeoutPassed = false; // remove when constructor is determinate
        if (containerOrBindComponentEventHandler !== undefined) {
            if (typeof containerOrBindComponentEventHandler === 'function') {
                this.bindComponentEvent = containerOrBindComponentEventHandler;
                this._bindComponentEventHanlderPassedInConstructor = true;
                if (unbindComponentEventHandler !== undefined) {
                    this.unbindComponentEvent = unbindComponentEventHandler;
                }
            }
        }
    }

    static createLayoutManagerConstructorParameters(configOrOptionalContainer, containerOrBindComponentEventHandler) {
        let containerElement;
        let config;

        if (configOrOptionalContainer === undefined) { config = undefined; }
        else {
            if (configOrOptionalContainer instanceof HTMLElement) {
                config = undefined;
                containerElement = configOrOptionalContainer;
            }
            else { config = configOrOptionalContainer; }
        }

        if (containerElement === undefined) {
            if (containerOrBindComponentEventHandler instanceof HTMLElement) { containerElement = containerOrBindComponentEventHandler; }
        }

        return {
            constructorLayoutConfig: config,
            containerElement,
        };
    }

    destroy() {
        this.bindComponentEvent = undefined;
        this.unbindComponentEvent = undefined;
        super.destroy();
    }
    /**
     * Creates the actual layout. Must be called after all initial components
     * are registered. Recurses through the configuration and sets up
     * the item tree.
     *
     * If called before the document is ready it adds itself as a listener
     * to the document.ready event
     * @deprecated LayoutConfig should not be loaded in {@link (LayoutManager:class)} constructor, but rather in a
     * {@link (LayoutManager:class).loadLayout} call.  If LayoutConfig is not specified in {@link (LayoutManager:class)} constructor,
     * then init() will be automatically called internally and should not be called externally.
     */
    init() {
        /**
         * If the document isn't ready yet, wait for it.
         */
        if (!this._bindComponentEventHanlderPassedInConstructor && (document.readyState === 'loading' || document.body === null)) {
            document.addEventListener('DOMContentLoaded', () => this.init(), { passive: true });
            return;
        }

        super.init();
    }
    /**
     * Clears existing HTML and adjusts style to make window suitable to be a popout sub window
     * Curently is automatically called when window is a subWindow and bindComponentEvent is not passed in the constructor
     * If bindComponentEvent is not passed in the constructor, the application must either call this function explicitly or
     * (preferably) make the window suitable as a subwindow.
     * In the future, it is planned that this function is NOT automatically called in any circumstances.  Applications will
     * need to determine whether a window is a Golden Layout popout window and either call this function explicitly or
     * hide HTML not relevant to the popout.
     * See apitest for an example of how HTML is hidden when popout windows are displayed
     */
    clearHtmlAndAdjustStylesForSubWindow() {
        const headElement = document.head;
        const appendNodeLists = new Array(4);
        appendNodeLists[0] = document.querySelectorAll('body link');
        appendNodeLists[1] = document.querySelectorAll('body style');
        appendNodeLists[2] = document.querySelectorAll('template');
        appendNodeLists[3] = document.querySelectorAll('.gl_keep');

        for (let listIdx = 0; listIdx < appendNodeLists.length; listIdx++) {
            const appendNodeList = appendNodeLists[listIdx];
            for (let nodeIdx = 0; nodeIdx < appendNodeList.length; nodeIdx++) {
                const node = appendNodeList[nodeIdx];
                headElement.appendChild(node);
            }
        }

        const bodyElement = document.body;
        bodyElement.innerHTML = '';
        bodyElement.style.visibility = 'visible';
        this.checkAddDefaultPopinButton();
    }

    /**
     * Will add button if not popinOnClose specified in settings
     * @returns true if added otherwise false
     */
    checkAddDefaultPopinButton() {
        if (this.layoutConfig.settings.popInOnClose) { return false; }
        else {
            const popInButtonElement = document.createElement('div');
            popInButtonElement.classList.add("lm_popin" /* Popin */);
            popInButtonElement.setAttribute('title', this.layoutConfig.header.dock);
            const iconElement = document.createElement('div');
            iconElement.classList.add("lm_icon" /* Icon */);
            const bgElement = document.createElement('div');
            bgElement.classList.add("lm_bg" /* Bg */);
            popInButtonElement.appendChild(iconElement);
            popInButtonElement.appendChild(bgElement);
            popInButtonElement.addEventListener('click', () => this.emit('popIn'));
            document.body.appendChild(popInButtonElement);
            return true;
        }
    }

    /** @internal */
    bindComponent(container, itemConfig) {
        if (this.bindComponentEvent !== undefined) {
            const bindableComponent = this.bindComponentEvent(container, itemConfig);
            return bindableComponent;
        }

        else {
            if (this.getComponentEvent !== undefined) {
                return {
                    virtual: false,
                    component: this.getComponentEvent(container, itemConfig),
                };
            }

            else {
                // There is no component registered for this type, and we don't have a getComponentEvent defined.
                // This might happen when the user pops out a dialog and the component types are not registered upfront.
                const text = i18nStrings[2 /* ComponentTypeNotRegisteredAndBindComponentEventHandlerNotAssigned */];
                const message = `${text}: ${JSON.stringify(itemConfig)}`;
                throw new BindError(message);
            }
        }
    }

    /** @internal */
    unbindComponent(container, virtual, component) {
        if (this.unbindComponentEvent !== undefined) { this.unbindComponentEvent(container); }
        else {
            if (!virtual && this.releaseComponentEvent !== undefined) {
                if (component === undefined) { throw new UnexpectedUndefinedError('VCUCRCU333998'); }
                else { this.releaseComponentEvent(container, component); }
            }
        }
    }
}