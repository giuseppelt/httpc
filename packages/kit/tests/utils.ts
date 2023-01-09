import { randomUUID } from "crypto";


export const random = {
    number() {
        return Math.random();
    },
    string() {
        const length = 10 + Math.floor(Math.random() * 10);
        const min = "A".charCodeAt(0);
        const max = "Z".charCodeAt(0);
        return String.fromCharCode(...[...Array(length)].map(() => min + Math.floor(Math.random() * (max - min + 1))));
    },
    uuid() {
        return randomUUID();
    }
}
