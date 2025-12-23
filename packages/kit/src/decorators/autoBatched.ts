import type { ILogger } from "../logging";
import { assert } from "../internal";


type AutoBatchedOptions<T, I, O> = {
    delay?: number
    polling?: number
    maxTime?: number
    maxCount?: number
} & (
        | { batch: keyof T }
        | { batch(this: T, input: I[]): Promise<Map<I, O>> }
    )


const $batches = Symbol("batches");

export function autoBatched<T = any, I = any, O = any>(options: AutoBatchedOptions<T, I, O>): MethodDecorator {
    return (target, property, descriptor) => {
        const key = property;
        const single = descriptor.value as () => any;
        assert(typeof single === "function", "Must be a method");

        const { batch, ...rest } = options;

        descriptor.value = function (this: T & { logger?: ILogger, [$batches]?: Map<string | symbol, AutoBatch> }, input: I) {
            const batches = (this[$batches] ??= new Map<string | symbol, AutoBatch>());

            let auto = batches.get(key);
            if (!auto) {
                const batchCall = typeof batch === "string" ? this[batch] : batch;
                assert(typeof batchCall === "function", "batch must point to a method");

                auto = new AutoBatch({
                    ...rest,
                    key,
                    logger: this.logger,
                    single: single.bind(this),
                    batch: batchCall.bind(this)
                });

                batches.set(key, auto);
                this.logger?.debug("[AutoBatch] %s created", property);
            }

            return auto.push(input);
        } as any;

        return descriptor;
    };
}



type AutoBatchOptions<T, I, O> = AutoBatchedOptions<T, I, O> & {
    key: string | symbol
    single(this: T, input: I): Promise<O>
    logger?: ILogger
}

class AutoBatch<T = any, I = any, O = any> {
    private readonly runs = new Map<I, PromiseWithResolvers<O>>();
    private timeoutId: NodeJS.Timeout | undefined = undefined;
    private start: number = 0;

    constructor(private readonly options: AutoBatchOptions<T, I, O>) {

    }

    push(input: I): Promise<O> {
        let resolvers = this.runs.get(input);
        if (!resolvers) {
            resolvers = Promise.withResolvers<O>();
            this.runs.set(input, resolvers);
            this.options.logger?.debug("[AutoBatch] %s new run", this.options.key, { input });
        } else {
            this.options.logger?.debug("[AutoBatch] %s new run (duplicate)", this.options.key, { input });
        }

        this.poll();

        return resolvers.promise;
    }

    private poll() {
        const { delay = 100, polling = 5, maxTime = 0, maxCount = 0 } = this.options;
        if (maxCount === 1 || (maxCount > 1 && this.runs.size >= maxCount)) {
            this.timeoutId = void clearTimeout(this.timeoutId);
            this.execute();
            return;
        }

        if (!this.timeoutId) {
            this.start = Date.now();
            this.timeoutId = setTimeout(() => this.poll(), delay);
            return;
        }

        const elapsed = Date.now() - this.start;
        if (elapsed < delay) {
            // if sill under delay --> skip
            return;
        }

        this.timeoutId = void clearTimeout(this.timeoutId);

        // do nothing if under max --> trigger after first delay
        if (maxTime < 1) {
            this.execute();
            return;
        }

        if ((elapsed + polling) < maxTime && (maxCount < 1 || this.runs.size < maxCount)) {
            // reschedule if under max
            this.timeoutId = setTimeout(() => this.poll(), polling);
            return;
        }

        this.execute();
    }

    private execute() {
        // reset timer
        this.timeoutId = undefined;
        this.start = 0;

        // clone and reset runs
        const current = new Map(this.runs);
        this.runs.clear();

        const { single, batch, logger, key } = this.options;
        assert(typeof batch === "function", "batch must be a method");

        if (current.size === 1) {
            const [[input, resolver]] = current;
            single.call(null!, input)
                .then(resolver.resolve, resolver.reject);

            logger?.debug("[AutoBatch] %s executed: single run", key);
        } else {
            batch.call(null!, [...current.keys()])
                .then(
                    results => results.forEach((o, i) => current.get(i)!.resolve(o)),
                    err => current.forEach(v => v.reject(err))
                );

            logger?.debug("[AutoBatch] %s executed: multiple(%d) runs", key, current.size);
        }
    }
}
