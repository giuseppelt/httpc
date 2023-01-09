import assert from "assert";
import { injectable } from "tsyringe";
import { fetch, Response } from "../fetch";
import type { ILogger } from "../logging";
import type { EmailRecipient, IEmailSender, SendEmailParams } from "./types";
import { BaseService } from "../services";
import { options } from "../di";
import { logger } from "../logging";
import { cleanUndefined } from "../utils";



const MAILERSEND_API = "https://api.mailersend.com/v1";


export type MailersendEmailSenderOptions = {
    apiKey: string
    defaultSender?: EmailRecipient
}

@injectable()
export class MailersendEmailSender extends BaseService() implements IEmailSender {
    constructor(
        @logger() logger: ILogger,
        @options() readonly options: MailersendEmailSenderOptions
    ) {
        //@ts-expect-error
        super(...arguments);
    }


    async send(params: SendEmailParams) {
        assert(!!(params.bodyHtml || params.bodyText), "one of bodyHtml and bodyText is required");

        if (Array.isArray(params.to)) {
            assert(params.to.length > 0, "options.to must have at least an item");
        }

        const to = mapEmailRecipient(params.to);
        const from = params.from ? mapEmailRecipient(params.from)[0] :
            this.options.defaultSender ? mapEmailRecipient(this.options.defaultSender) :
                undefined;

        const request = cleanUndefined({
            to,
            from,
            html: params.bodyHtml,
            text: params.bodyText,
            subject: params.subject,
            cc: params.cc ? mapEmailRecipient(params.cc) : undefined,
            bcc: params.bcc ? mapEmailRecipient(params.bcc) : undefined,
        });

        if (this.logger.isLevelEnabled("debug")) {
            this.logger.debug("Email params: %o", { ...request, bodyHtml: "<omitted>", bodyText: "<omitted>" });
        }

        await this._sendMail(request);

        this.logger.verbose("Email sent(%s)", to[0].email);
    }

    private async _sendMail(params: object) {
        assert(this.options.apiKey, "ApiKey must be set");

        try {
            const token = this.options.apiKey;
            const response = await fetch(`${MAILERSEND_API}/email`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(params)
            });

            if (response.status >= 400) {
                throw response;
            }
        } catch (ex) {
            const error = ex instanceof Error ? ex : undefined;
            const response = ex instanceof Error ? undefined : ex as Response;
            const body = response ? await response.json().catch(() => null) : undefined;

            this._raiseError("processing_error", "Email send failed", {
                errorMessage: error && `[${error.name}] ${error.message}`,
                httpStatus: response?.status,
                httpResponse: body
            });
        }
    }
}


function mapEmailRecipient(r: EmailRecipient | EmailRecipient[]): { email: string, name?: string }[] {
    if (!Array.isArray(r)) {
        return mapEmailRecipient([r]);
    }

    return r.map(x => (typeof x === "string" ?
        { email: x } :
        x
    ));
}
