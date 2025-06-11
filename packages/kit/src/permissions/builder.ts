import type { PermissionToken } from "./models";
import Parser from "./Parser";
import { PermissionAtomTokenDefinition, PermissionCompositeTokenDefinition, PermissionsModel, PermissionTokenDefinition } from "./PermissionModel";


type _SchemaTokenList<Schema extends object> = {
    [k in keyof Schema]: Schema[k]
}[keyof Schema]

type _SchemaAddAtom<Schema extends object, Token extends string> = Schema & {
    [token in Token]: Token
}
type _SchemaAddComposite<Schema extends object, Token extends string, Children = undefined> = Omit<Schema, Token> & {
    [token in Token]: Children extends string
    ? `${Token}:${Children}`
    : Children extends FluentCompositeToken<any, any, infer ChildrenList>
    ? `${Token}:${ChildrenList}`
    : never
}

class FluentAtomToken<Schema extends object, Token extends string> {
    protected _alias?: Set<string>;
    protected _includes?: PermissionToken[];

    constructor(protected readonly _name: Token) {
        if (_name.includes(":")) {
            throw new Error("Invalid token name. Cannot include [:]");
        }
    }

    alias(alias: string, ...extra: string[]): this {
        (this._alias ??= new Set()).add(alias);
        if (extra && extra.length > 0) extra.forEach(x => this._alias!.add(x));

        return this;
    }

    includes<I extends _SchemaTokenList<Schema>>(token: I | I[]): this {
        this._includes ??= [];

        if (Array.isArray(token)) {
            this._includes.push(...token.map(x => Parser.parseToken(x as string[])));
        } else {
            this._includes.push(Parser.parseToken(token as string));
        }

        return this;
    }

    protected build(): PermissionAtomTokenDefinition {
        return {
            kind: "atom",
            name: this._name,
            token: this._name as any as PermissionToken,
            alias: this._alias ? [...this._alias] : undefined,
            includes: this._includes
        };
    }
}

class FluentCompositeToken<Schema extends object, Parent extends string, Children extends string> {
    protected _alias?: Set<string>;
    protected _children?: PermissionAtomTokenDefinition[];

    constructor(protected readonly _name: Parent) {
    }

    alias(alias: string, ...extra: string[]): this {
        this._alias ??= new Set();

        this._alias.add(alias);
        if (extra && extra.length > 0) {
            extra.forEach(x => this._alias!.add(x));
        }

        return this;
    }

    children<T extends string>(token: T | T[]): FluentCompositeToken<_SchemaAddComposite<Schema, Parent, Children | T>, Parent, Children | T> {
        this._children ??= [];

        if (typeof token === "string") {
            token = [token];
        }

        for (const name of token) {
            this._children.push({
                kind: "atom",
                name,
                token: [this._name, name] as any as PermissionToken
            });
        }

        return this;
    }

    child<Token extends string, Builder extends FluentAtomToken<Schema, Token>>(token: Token, builder?: (token: FluentAtomToken<Schema, Token>) => Builder): FluentCompositeToken<_SchemaAddComposite<Schema, Parent, Children | Token>, Parent, Children | Token> {
        this._children ??= [];

        const fluent = new FluentAtomToken(token);
        builder?.(fluent);
        this._children.push({ ...fluent["build"](), token: [this._name, token] as any as PermissionToken });

        return this;
    }

    protected build(): PermissionCompositeTokenDefinition {
        return {
            kind: "composite",
            name: this._name,
            token: [this._name, "*"] as any as PermissionToken,
            alias: this._alias ? [...this._alias] : undefined,
            children: this._children?.slice() || [],
        };
    }
}

class FluentPermission<Schema extends object = object> {
    protected _tokens: PermissionTokenDefinition[] = [];

    atom<Token extends string, Builder extends FluentAtomToken<Schema, Token>>(token: Token, builder?: (token: FluentAtomToken<Schema, Token>) => Builder): FluentPermission<_SchemaAddAtom<Schema, Token>> {
        const fluent = new FluentAtomToken(token);
        builder?.(fluent);
        this._tokens.push(fluent["build"]());

        return this;
    }

    composite<Token extends string, Children extends string>(token: Token, children: Children[]): FluentPermission<_SchemaAddComposite<Schema, Token, Children>>;
    composite<Token extends string, Builder extends FluentCompositeToken<Schema, Token, any>>(token: Token, builder: (token: FluentCompositeToken<Schema, Token, never>) => Builder): FluentPermission<_SchemaAddComposite<Schema, Token, Builder>>;
    composite<Token extends string, Builder extends FluentCompositeToken<Schema, Token, any>>(token: Token, builderOrChildren: string[] | ((token: FluentCompositeToken<Schema, Token, never>) => Builder)): FluentPermission {
        const fluent = new FluentCompositeToken(token);
        if (typeof builderOrChildren === "function") {
            builderOrChildren(fluent);
        } else if (Array.isArray(builderOrChildren)) {
            fluent.children(builderOrChildren);
        }

        this._tokens.push(fluent["build"]());

        return this;
    }

    protected build(): PermissionsModel {
        return new PermissionsModel({
            tokens: this._tokens,
        });
    }
}


export function permissions(api: (builder: FluentPermission) => FluentPermission) {
    return api(new FluentPermission())["build"]();
}
