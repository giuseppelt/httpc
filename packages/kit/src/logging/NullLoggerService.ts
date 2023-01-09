import { singleton } from "tsyringe";
import { ILogger, ILogService } from "./types";


@singleton()
export class NullLoggerService implements ILogService {
    createLogger(label: string): ILogger {
        return new NullLogger();
    }
}


export class NullLogger implements ILogger {
    error(message: string | Error, ...args: any[]): void {
    }
    info(message: string, ...args: any[]): void {
    }
    warn(message: string, ...args: any[]): void {
    }
    verbose(message: string, ...args: any[]): void {
    }
    debug(message: string, ...args: any[]): void {
    }
    log(level: string, message: string, ...args: any[]): void {
    }
    isLevelEnabled(level: string): boolean {
        return true;
    }
}
