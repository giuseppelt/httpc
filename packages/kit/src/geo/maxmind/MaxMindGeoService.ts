import fs from "fs/promises";
import os from "os";
import path from "path";
import { downloadTo, exists, unzip } from "../../node/index.internal";
import { singleton } from "tsyringe";
import type { Reader, CityResponse } from "maxmind";
import type { ILogger } from "../../logging";
import { BaseService, IInitialize } from "../../services";
import { initializer, options } from "../../di";
import { logger } from "../../logging";
//cspell:ignore mmdb


export type MaxMindGeoServiceOptions = {
    autoLoad?: boolean
    databaseUrlTemplate?: string
    localDatabaseFile?: string
}

@singleton()
@initializer()
export class MaxMindGeoService extends BaseService() implements IInitialize {
    static DEFAULT_OPTIONS: MaxMindGeoServiceOptions = {
        databaseUrlTemplate: "https://download.db-ip.com/free/dbip-city-lite-{0}.mmdb.gz",
        localDatabaseFile: path.join(os.tmpdir(), "db-city.mmdb"),
    };

    protected db?: Reader<CityResponse> | undefined;

    constructor(
        @logger() logger: ILogger,
        @options(undefined) readonly options?: MaxMindGeoServiceOptions
    ) {
        //@ts-ignore
        super(...arguments);

        this.options = { ...MaxMindGeoService.DEFAULT_OPTIONS, ...options };
        this.db = undefined;
    }

    async initialize(): Promise<void> {
        if (!this.options?.autoLoad) {
            return;
        }

        this.logger.info("AutoLoad set: preloading database");

        await this.load();
    }

    async load() {
        const maxmind = await import("maxmind");

        const dbPath = await this.downloadDatabase();
        this.db = await maxmind.open(dbPath);

        this.logger.info("Database loaded");
    }

    async downloadDatabase(force?: boolean): Promise<string> {
        if (!this.options?.localDatabaseFile) {
            this._raiseError("misconfiguration", "Missing option: localDatabaseFile");
        }

        const localPath = path.resolve(this.options.localDatabaseFile);
        if (!force && await exists(localPath)) {
            this.logger.info("Database download skipped: local copy available");
            return localPath;
        }

        const url = this._getDatabaseUrl();
        const zipPath = localPath + ".gz";
        this.logger.verbose("Downloading IP DB(%s) to %s", url, zipPath);

        await downloadTo(url, zipPath).catch((ex) => {
            this.logger.warn("Can't download current IP DB version (error: %s)", ex.message);

            // try to download previous month
            const previous = this._getDatabaseUrl("previous");
            this.logger.verbose("Downloading IP DB(%s) to %s", previous, zipPath);

            return downloadTo(previous, zipPath);
        });

        await unzip(zipPath, localPath);
        await fs.rm(zipPath);

        this.logger.info("IP DB downloaded to: %s", localPath);

        return localPath;
    }

    lookupIP(ip: string) {
        if (!this.db) {
            this._raiseError("invalid_state", "Database not loaded");
        }

        return this.db.get(ip) || undefined;
    }

    protected _getDatabaseUrl(interval: "current" | "previous" = "current"): string {
        const { databaseUrlTemplate } = this.options || {};
        if (!databaseUrlTemplate) {
            this._raiseError("misconfiguration", "Missing option: databaseUrlTemplate");
        }

        const today = new Date();
        const yearMonth = (interval === "previous"
            ? new Date(today.getUTCFullYear(), today.getUTCMonth() - 1)
            : today)
            .toISOString().substring(0, 7);

        return databaseUrlTemplate.replace("{0}", yearMonth);
    }
}
