import { pathToRegexp } from "path-to-regexp";


type Matcher = {
    regex: RegExp
    hasPrefix: boolean
    hasRest: boolean
    hasBase: boolean
}

export class PathMatcher {
    constructor(path: string);
    constructor(paths: { base?: string, paths: "*" | string[] });
    constructor(param: string | { base?: string, paths: "*" | string[] }) {
        let base = "/";
        let paths: string[];
        let hasBase = false;

        if (typeof param === "string") {
            paths = [param];
        } else {
            base = param.base || "/";
            paths = typeof param.paths === "string" ? [param.paths] : param.paths;
            hasBase = true;
        }

        base = (base.startsWith("/") ? base : `/${base}`).toLowerCase();
        if (base.length > 1 && base.endsWith("/")) {
            base = base.substring(0, base.length - 1);
        }

        this.base = base;

        const basePath = base.endsWith("/") ? base.substring(0, base.length - 1) : base;
        this.matchers = paths.map(path => {
            if (path.startsWith("/")) path = path.substring(1);
            path = `${basePath}/${path}`;

            let hasRest = false;
            let hasPrefix = false;

            // rewrite sugar syntax
            if (path.startsWith("/*/")) {
                path = "/:prefix" + path.substring(2);
                hasPrefix = true;
            }
            if (path.endsWith("/*")) {
                path = path.substring(0, path.length - 1) + ":rest*";
                hasRest = true;
            }

            return {
                regex: pathToRegexp(path),
                hasPrefix,
                hasRest,
                hasBase,
            };
        });
    }

    readonly base: string;
    protected readonly matchers: Matcher[];

    match(path: string) {
        if (this.matchers.length === 0) return;

        path = path.toLowerCase();
        if (!path.startsWith("/")) path = "/" + path;

        for (const { regex, hasPrefix, hasBase } of this.matchers) {
            const result = regex.exec(path);
            if (!result) continue;

            const [pathMatch, ...matches] = result;

            const [prefix] = hasPrefix
                ? matches.splice(0, 1)
                : [];

            // exclude optional parameters(match=undefined)
            const parameters = matches.filter(x => !!x).join("/") || undefined;
            const base = hasBase
                ? parameters
                    ? pathMatch.substring(0, pathMatch.lastIndexOf(parameters) - 1) || undefined
                    : pathMatch
                : undefined;

            return {
                path: pathMatch,
                base,
                prefix,
                matches,
            };
        }
    }
}
