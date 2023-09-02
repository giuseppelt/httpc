import { singleton } from "tsyringe";
import { assert } from "../internal";
import type { IEmailSender, SendEmailParams } from "./types";
import { type ILogger, logger } from "../logging";
import { BaseService } from "../services";


@singleton()
export class NoopEmailSender extends BaseService() implements IEmailSender {
    constructor(
        @logger() logger: ILogger,
    ) {
        //@ts-expect-error
        super(...arguments);
    }

    async send(options: SendEmailParams) {
        assert(!!(options.bodyHtml || options.bodyText), "One of bodyHtml and bodyText is required");

        if (Array.isArray(options.to)) {
            assert(options.to.length > 0, "options.to must have at least an item");
        }

        if (this.logger.isLevelEnabled("debug")) {
            this.logger.debug("Email params=%o", { ...options, bodyHtml: "<omitted>", bodyText: "<omitted>" });
        }

        this.logger.verbose("Email sent(%s)", options.to);
    }
}
