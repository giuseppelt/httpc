
export type TimeUnit =
    | "ms"
    | "s"
    | "m"
    | "h"
    | "d"

export type HumanDuration = `${number}${TimeUnit}`;

/**
 * Parse the human-duration string into milliseconds
 *
 * @param {HumanDuration} duration A human readable string representing a duration
 * @returns {number} Duration in milliseconds
 */
export function humanDuration(duration: HumanDuration): number {
    const [, _amount, _unit] = duration.match(/^(\d+)(\w+)$/) || [];
    const unit = _unit as TimeUnit;
    const amount = parseInt(_amount, 10);

    switch (unit) {
        case "ms": return amount;
        case "s": return amount * 1000;
        case "m": return amount * 1000 * 60;
        case "h": return amount * 1000 * 60 * 60;
        case "d": return amount * 1000 * 60 * 60 * 24;
        default:
            const _: never = unit;
            throw new Error("Invalid unit: " + unit);
    }
}
