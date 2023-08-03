
export function tryParseInt(value: string | undefined | null, defaultValue?: number): number {
    if (value) {
        try { return parseInt(value!) }
        catch { }
    }

    return defaultValue ?? 0;
}
