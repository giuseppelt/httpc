import type { PermissionToken, PermissionTokenRawValue } from "./models";
import Token from "./Token";


export type PermissionAtomTokenDefinition = {
    kind: "atom"
    name: string
    token: PermissionToken
    alias?: string[]
    includes?: PermissionToken[]
}

export type PermissionCompositeTokenDefinition = Omit<PermissionAtomTokenDefinition, "kind" | "includes"> & {
    kind: "composite"
    children: PermissionAtomTokenDefinition[]
}

export type PermissionTokenDefinition =
    | PermissionAtomTokenDefinition
    | PermissionCompositeTokenDefinition


export class PermissionsModel {
    protected _defs: PermissionTokenDefinition[];
    protected _caseSensitive: boolean;
    private _hasAtoms: boolean;
    private _hasComposites: boolean;

    constructor(params?: {
        tokens?: PermissionTokenDefinition[]
        caseSensitive?: boolean
    }) {
        this._defs = params?.tokens?.slice() || [];
        this._caseSensitive = params?.caseSensitive || false;
        this._hasAtoms = this._defs.some(x => x.kind === "atom");
        this._hasComposites = this._defs.some(x => x.kind === "composite");
    }

    get hasAtoms() {
        return this._hasAtoms;
    }

    get hasComposites() {
        return this._hasComposites;
    }

    get tokens(): readonly PermissionTokenDefinition[] {
        return this._defs;
    }

    find(token: PermissionTokenRawValue): PermissionTokenDefinition | undefined;
    find(token: PermissionToken, mode: "claim"): PermissionTokenDefinition | undefined;
    find(token: PermissionTokenRawValue, mode?: "claim"): PermissionTokenDefinition | undefined {
        const isCaseSensitive = this._caseSensitive;
        const definitions = this._defs;

        const _token = mode === "claim"
            ? token as PermissionToken
            : Token.parse(token);

        if (Token.isAtom(_token)) {
            const name = isCaseSensitive ? _token : _token.toLowerCase();

            for (const def of definitions) {
                if (def.kind !== "atom") continue;

                const defName = isCaseSensitive ? def.name : def.name.toLowerCase();

                if (defName === name || this._isMatchingAlias(name, def.alias)) {
                    return def;
                }
            }

            return; // not found
        }

        //
        // from here 
        // Token is Composite
        //

        let compositeDef: PermissionCompositeTokenDefinition | undefined;
        const parentName = isCaseSensitive ? _token[0] : _token[0].toLowerCase();

        for (const def of definitions) {
            if (def.kind !== "composite") continue;

            const defParentName = isCaseSensitive ? def.name : def.name.toLowerCase();

            if (parentName === defParentName || this._isMatchingAlias(parentName, def.alias)) {
                compositeDef = def;
                break;
            }
        }

        if (!compositeDef) {
            return; // not found
        }


        // check if composite-parent search: 
        // >  parent:*
        // or if a full token search:
        // >  parent:child   

        if (_token[1] === "*") {
            // return the parent definition if a wildcard search
            return compositeDef;
        }

        // search for the child
        const childName = isCaseSensitive ? _token[1] : _token[1].toLowerCase();

        for (const def of compositeDef.children) {
            const defChildName = isCaseSensitive ? def.name : def.name.toLowerCase();

            if (childName === defChildName || this._isMatchingAlias(childName, def.alias)) {
                return def;
            }
        }

        return; // not found;
    }

    private _isMatchingAlias(value: string, aliases?: string[]): boolean {
        if (!aliases || aliases.length === 0) {
            return false;
        }

        for (const alias of aliases) {
            if (value === alias ||
                // here value is assumed lowercase, already transformed by the caller
                (!this._caseSensitive && alias.toLowerCase() === value)
            ) {
                return true;
            }
        }

        return false;
    }
}
