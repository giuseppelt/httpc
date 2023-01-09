import assert from "assert";
import { singleton } from "tsyringe";
import type { IEmailSender, SendEmailParams } from "./types";
import { BaseService } from "../services";


@singleton()
export class NoopEmailSender extends BaseService() implements IEmailSender {
    async send(options: SendEmailParams) {
        assert(!!(options.bodyHtml || options.bodyText), "one of bodyHtml and bodyText is required");

        if (Array.isArray(options.to)) {
            assert(options.to.length > 0, "options.to must have at least an item");
        }

        if (this.logger.isLevelEnabled("debug")) {
            this.logger.debug("Mail params=%o", { ...options, bodyHtml: "<omitted>", bodyText: "<omitted>" });
        }

        this.logger.verbose("Mail sent(%s)", options.to);
    }
}
