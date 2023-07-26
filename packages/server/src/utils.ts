
export function randomUUID() {
    if (globalThis.crypto) {
        return crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (x) {
        var r = (Math.random() * 16) | 0,
            v = x == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
