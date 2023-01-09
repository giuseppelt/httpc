import kleur from "kleur";


export function warn(message: string, ...args: any[]) {
    console.log(kleur.yellow(`[!] ${message}`), ...args);
}

export function success(message: string, ...args: any[]) {
    console.log(kleur.cyan(`✔️ ${message}`), ...args);
}

export function done(message: string, ...args: any[]) {
    console.log(kleur.cyan(`✔️ ${message}`), ...args);
}

export function verbose(message: string, ...args: any[]) {
    console.log(kleur.gray(`${message}`), ...args);
}

export function minor(message: string, ...args: any[]) {
    console.log(kleur.gray(`${message}`), ...args);
}

export function error(message: string, ...args: any[]) {
    console.log(kleur.red(`❌ ${message}`), ...args);
}
