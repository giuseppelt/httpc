import { ErrorInfo } from "@httpc/server";
import { Constructor } from "../di";
import type { ILogger } from "../logging";
import { cleanUndefined } from "../utils";
import { ServiceErrorPresets, ServiceError, ServiceErrors } from "./error";
import type { IService, ITransactionService } from "./types";


export const ServiceErrorPreset = new ServiceErrorPresets()
    .add("invalid_param", { status: 400 })
    .add("unauthorized", { status: 401 })
    .add("forbidden", { status: 403 })
    .add("not_allowed", { status: 422 })
    .add("invalid_state")
    .add("not_found")
    .add("misconfiguration")
    .add("not_supported")
    .add("processing_error")


export function BaseService<E extends ServiceErrorPresets = typeof ServiceErrorPreset>(presets?: E): typeof _BaseService<ServiceErrors<E>> {
    return !presets
        ? _BaseService
        : class extends _BaseService<ServiceErrors<E>>{
            constructor() {
                //@ts-expect-error
                super(...arguments);
                //@ts-ignore
                this.__errorPresets = presets || ServiceErrorPreset;
            }
        };
}

export class _BaseService<TError extends string> {
    private readonly __arguments!: readonly any[];
    private readonly __errorPresets?: ServiceErrorPresets = ServiceErrorPreset;
    private __inTransaction = false;

    constructor(
        protected readonly logger: ILogger,
        ...args: any[]
    ) {
        this._setArguments([...arguments]);
        logger.debug("Created");
    }

    protected _setArguments(args: readonly any[]) {
        (this.__arguments as any) = args.slice();
    }

    inTransaction(data: ITransactionService): this {
        if (this.__inTransaction) {
            return this;
        }

        function activate(arg: any) {
            return (arg && typeof arg === "object" && typeof (arg as IService).inTransaction === "function")
                ? (arg as IService).inTransaction?.(data) || arg
                : arg;
        }

        const ctor = this.constructor as Constructor<this>;
        const args = this.__arguments.map(x => Array.isArray(x)
            ? x.map(activate)
            : activate(x)
        );

        const instance = new ctor(...args);
        instance.__inTransaction = true;
        return instance;
    }

    protected _raiseError(error: TError, data?: Record<string, any>): never;
    protected _raiseError(error: TError, message?: string, data?: Record<string, any>): never;
    protected _raiseError(error: TError, message?: string | Record<string, any>, data?: Record<string, any>): never {
        if (typeof message === "object") {
            data = message;
            message = undefined;
        }

        const preset = this.__errorPresets?.get(error);
        const info: ErrorInfo = {
            status: 500,
            ...preset,
            errorCode: error,
            ...cleanUndefined({
                message,
                data,
            })
        };

        this.logger.error("%s: %s", info.errorCode, info.message, info.data);

        throw new ServiceError(info);
    }
}
