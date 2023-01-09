
function add(a: number, b: number) {
    return a + b;
}

function greet(name: string) {
    return `Hello ${name || "Anonymous"}`;
}

export default {
    add,
    greet,
}
