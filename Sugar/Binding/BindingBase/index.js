import { Events } from '../../Events/events.js';

/**
 * Base class for data binding between {@link IBindable} {@link Element}s and Observers.
 */
class BindingBase extends Events {
    /**
     * Creates a new binding.
     *
     * @param args - The arguments.
     */
    constructor(args) {
        var _a;
        super();
        this._observers = [];
        this._paths = [];
        this._applyingChange = false;
        this._linked = false;
        this._element = args.element;
        this._history = args.history;
        this._historyPrefix = args.historyPrefix;
        this._historyPostfix = args.historyPostfix;
        this._historyName = args.historyName;
        this._historyCombine = (_a = args.historyCombine) !== null && _a !== void 0 ? _a : false;
    }
    // Returns the path at the specified index
    // or the path at the first index if it doesn't exist.
    _pathAt(paths, index) {
        return paths[index] || paths[0];
    }
    /**
     * Links the specified observers to the specified paths.
     *
     * @param observers - The observer(s).
     * @param paths - The path(s). The behavior of the binding depends on how many paths are passed.
     * If an equal amount of paths and observers are passed then the binding will map each path to each observer at each index.
     * If more observers than paths are passed then the path at index 0 will be used for all observers.
     * If one observer and multiple paths are passed then all of the paths will be used for the observer (e.g. for curves).
     */
    link(observers, paths) {
        if (this._observers) {
            this.unlink();
        }
        this._observers = Array.isArray(observers) ? observers : [observers];
        this._paths = Array.isArray(paths) ? paths : [paths];
        this._linked = true;
    }
    /**
     * Unlinks the observers and paths.
     */
    unlink() {
        this._observers = [];
        this._paths = [];
        this._linked = false;
    }
    /**
     * Clones the binding. To be implemented by derived classes.
     */
    clone() {
        throw new Error('BindingBase#clone: Not implemented');
    }
    /**
     * Sets a value to the linked observers at the linked paths.
     *
     * @param value - The value
     */
    setValue(value) {
    }
    /**
     * Sets an array of values to the linked observers at the linked paths.
     *
     * @param values - The values.
     */
    setValues(values) {
    }
    /**
     * Adds (inserts) a value to the linked observers at the linked paths.
     *
     * @param value - The value.
     */
    addValue(value) {
    }
    /**
     * Adds (inserts) multiple values to the linked observers at the linked paths.
     *
     * @param values - The values.
     */
    addValues(values) {
    }
    /**
     * Removes a value from the linked observers at the linked paths.
     *
     * @param value - The value.
     */
    removeValue(value) {
    }
    /**
     * Removes multiple values from the linked observers from the linked paths.
     *
     * @param values - The values.
     */
    removeValues(values) {
    }
    /**
     * Sets the element.
     */
    set element(value) {
        this._element = value;
    }
    /**
     * Gets the element.
     */
    get element() {
        return this._element;
    }
    /**
     * Sets whether the binding is currently applying a change, either to the observers or the element.
     */
    set applyingChange(value) {
        if (this._applyingChange === value)
            return;
        this._applyingChange = value;
        this.emit('applyingChange', value);
    }
    /**
     * Gets whether the binding is currently applying a change, either to the observers or the element.
     */
    get applyingChange() {
        return this._applyingChange;
    }
    /**
     * Gets whether the binding is linked to observers.
     */
    get linked() {
        return this._linked;
    }
    /**
     * Sets whether to combine history actions when applying changes to observers. This is assuming
     * a history module is being used.
     */
    set historyCombine(value) {
        this._historyCombine = value;
    }
    /**
     * Gets whether to combine history actions when applying changes to observers.
     */
    get historyCombine() {
        return this._historyCombine;
    }
    /**
     * Sets the name of the history action when applying changes to observers.
     */
    set historyName(value) {
        this._historyName = value;
    }
    /**
     * Gets the name of the history action when applying changes to observers.
     */
    get historyName() {
        return this._historyName;
    }
    /**
     * Sets the string to prefix {@link historyName} with.
     */
    set historyPrefix(value) {
        this._historyPrefix = value;
    }
    /**
     * Gets the string to prefix {@link historyName} with.
     */
    get historyPrefix() {
        return this._historyPrefix;
    }
    /**
     * Sets the string to postfix {@link historyName} with.
     */
    set historyPostfix(value) {
        this._historyPostfix = value;
    }
    /**
     * Gets the string to postfix {@link historyName} with.
     */
    get historyPostfix() {
        return this._historyPostfix;
    }
    /**
     * Sets whether history is enabled for the binding. A valid history object must have been provided first.
     */
    set historyEnabled(value) {
        if (this._history) {
            // @ts-ignore
            this._history.enabled = value;
        }
    }
    /**
     * Gets whether history is enabled for the binding.
     */
    get historyEnabled() {
        // @ts-ignore
        return this._history && this._history.enabled;
    }
    /**
     * Gets the linked observers.
     */
    get observers() {
        return this._observers;
    }
    /**
     * Gets the linked paths.
     */
    get paths() {
        return this._paths;
    }
}

export { BindingBase };
//# sourceMappingURL=index.js.map
