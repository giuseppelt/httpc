
export function assert(value: unknown, message?: string | Error): asserts value {
    if (!value) {
        if (message instanceof Error) {
            throw message;
        }

        throw new Error(message || "Assertion failed");
    }
}
