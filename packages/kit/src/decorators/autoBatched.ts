import type { ILogger } from "../logging";
import { assert } from "../internal";


type AutoBatchOptions<T, I, O> = {
    key: string | symbol
    single(this: T, input: I): Promise<O>
    batch(this: T, input: I[]): Promise<Map<I, O>>
    delay?: number
    maxWindow?: number
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
        const { delay = 100, maxWindow = 0 } = this.options;

        if (!this.timeoutId) {
            this.timeoutId = setTimeout(() => this.execute(), delay);
            this.start = Date.now();
            return;
        }

        // do nothing if no windows specified
        // ie. trigger on first delay
        if (maxWindow < 1) {
            return;
        }

        const elapsed = Date.now() - this.start;
        if (elapsed < maxWindow) {
            // cancel and reschedule
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => this.execute(), Math.min(delay, maxWindow - elapsed));
        }
    }

    private execute() {
        // reset timer
        this.timeoutId = undefined;
        this.start = 0;

        // clone and reset runs
        const current = new Map(this.runs);
        this.runs.clear();

        const { single, batch, logger, key } = this.options;

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


const $batches = Symbol("batches");

export function autoBatched<T = any, I = any, O = any>(options: Pick<AutoBatchOptions<T, I, O>, "batch" | "delay" | "maxWindow">): MethodDecorator {
    return (target, property, descriptor) => {
        const key = property;
        const single = descriptor.value as () => any;
        assert(typeof single === "function", "Must be a method");

        const { batch, ...rest } = options;

        descriptor.value = function (this: T & { logger?: ILogger, [$batches]?: Map<string | symbol, AutoBatch> }, input: I) {
            const batches = (this[$batches] ??= new Map<string | symbol, AutoBatch>());

            let auto = batches.get(key);
            if (!auto) {
                auto = new AutoBatch({
                    ...rest,
                    key,
                    logger: this.logger,
                    single: single.bind(this),
                    batch: batch.bind(this)
                });

                batches.set(key, auto);
                this.logger?.debug("[AutoBatch] %s created", property);
            }

            return auto.push(input);
        } as any;

        return descriptor;
    };
}
