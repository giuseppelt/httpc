
export type TokenDefinition = {
    token: string
    fullToken: string | string[]
    alias?: string[]
    child?: TokenDefinition[]
    includes?: string[]
    tags?: string[]
}

export class PermissionsModel {
    protected _tokens: TokenDefinition[] = [];

    constructor(params?: {
        tokens?: TokenDefinition[]
    }) {
        this._tokens = params?.tokens?.slice() || [];
    }

    get tokens(): readonly TokenDefinition[] {
        return this._tokens;
    }

    find(token: string | readonly string[], level: "exact" | "partial" | "any" = "any"): TokenDefinition | undefined {
        if (typeof token === "string") {
            token = [token];
        }

        token = token.map(x => x.toLowerCase());

        let defs = this._tokens;

        for (let a = 0; a < token.length; a++) {
            const part = token[a];
            const isLast = a === token.length - 1;

            // if wildcard search, use the the first definition
            // * support only last position wildcard search -> token:*, token:child:*
            // * no support for "nested-wildcard search" -> *:child, token:*:child

            const def = part === "*"
                ? defs[0]
                : defs.find(def => def.token.toLowerCase() === part || def.alias?.some(x => x.toLowerCase() === part));

            if (!def) {
                return;
            }

            const hasChildren = def.child && def.child.length > 0;

            if (isLast) {
                return (
                    (hasChildren && level === "partial") ||
                    (!hasChildren && level === "exact") ||
                    level === "any"
                ) ? def : undefined;
            }

            // if not last, continue with the children
            if (!hasChildren) {
                return;
            }

            defs = def.child!;
        }
    }
}


type _TokenOf<S extends object> = {
    [k in keyof S]: S[k]
}[keyof S]

type _TokenAdd<Schema extends object, Token extends string, Builder = undefined> = Schema & {
    [token in Token]: undefined extends Builder
    ? Token
    : Builder extends FluentToken<any, infer T, infer C>
    ? undefined extends C
    ? T
    : `${T}:${C}`
    : never
}

class FluentToken<Schema extends object, Token extends string, Child extends string | undefined = undefined> {
    protected _alias?: Set<string>;
    protected _includes?: string[];
    protected _tags?: Set<string>;
    protected _fullToken: string[];
    protected _child?: TokenDefinition[];

    constructor(protected readonly _token: Token, parent?: string[]) {
        this._fullToken = [...parent || [], _token];
    }

    alias<A extends string>(alias: A): this {
        (this._alias ??= new Set()).add(alias);
        return this;
    }

    tag(tag: string | string[]): this {
        this._tags ??= new Set();

        if (Array.isArray(tag)) {
            tag.forEach(x => this._tags!.add(x));
        } else {
            this._tags.add(tag);
        }

        return this;
    }

    includes<I extends _TokenOf<Schema>>(token: I | I[]): this {
        if (Array.isArray(token)) {
            (this._includes ??= []).push(...token as string[])
        } else {
            (this._includes ??= []).push(token as string);
        }

        return this;
    }

    token<Sub extends string, Builder extends FluentToken<any, any, any>>(token: Sub, builder?: (token: FluentToken<Schema, Sub>) => Builder): FluentToken<_TokenAdd<Schema, `${Token}:${Sub}`>, Token, Exclude<Child | Sub, undefined>> {
        if (builder) {
            (this._child ??= []).push(builder(new FluentToken(token, this._fullToken)).build());
        } else {
            (this._child ??= []).push({
                token,
                fullToken: [...this._fullToken, token],
            });
        }
        return this;
    }

    build(): TokenDefinition {
        return {
            token: this._token,
            fullToken: this._fullToken,
            alias: this._alias ? [...this._alias] : undefined,
            includes: this._includes,
            tags: this._tags ? [...this._tags] : undefined,
            child: this._child,
        }
    }
}

class FluentPermission<Schema extends object = object> {
    protected _tokens: TokenDefinition[] = [];

    token<Token extends string, Builder extends FluentToken<Schema, Token>>(token: Token, builder?: (token: FluentToken<Schema, Token>) => Builder): FluentPermission<_TokenAdd<Schema, Token, Builder>> {
        if (builder) {
            this._tokens.push(builder(new FluentToken(token)).build())
        } else {
            this._tokens.push({
                token,
                fullToken: [token],
            });
        }

        return this;
    }

    build(): PermissionsModel {
        return new PermissionsModel({
            tokens: this._tokens
        });
    }
}


export function permissions(api: (builder: FluentPermission) => FluentPermission) {
    return api(new FluentPermission()).build();
}
