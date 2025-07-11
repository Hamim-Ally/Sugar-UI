function deepCopy(data) {
    if (data == null || typeof (data) !== 'object') {
        return data;
    }
    if (data instanceof Array) {
        const arr = [];
        for (let i = 0; i < data.length; i++) {
            arr[i] = deepCopy(data[i]);
        }
        return arr;
    }
    const obj = {};
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            obj[key] = deepCopy(data[key]);
        }
    }
    return obj;
}
function arrayEquals(lhs, rhs) {
    if (!lhs) {
        return false;
    }
    if (!rhs) {
        return false;
    }
    if (lhs.length !== rhs.length) {
        return false;
    }
    for (let i = 0, l = lhs.length; i < l; i++) {
        if (lhs[i] instanceof Array && rhs[i] instanceof Array) {
            if (!lhs[i].equals(rhs[i])) {
                return false;
            }
        }
        else if (lhs[i] !== rhs[i]) {
            return false;
        }
    }
    return true;
}

export { arrayEquals, deepCopy };
//# sourceMappingURL=utils.js.map
