
export interface IService {
    inTransaction?(transactionService: ITransactionService): this
}

export interface IInitialize {
    initialize(): Promise<void>;
}

export interface IDbService {
    startTransaction<T>(func: (transactionService: ITransactionService) => Promise<T>): Promise<T>;
}

export interface ITransactionService {
    on(event: "afterTransaction", handler: (() => void | Promise<void>)): void;
}
