import { EmptyResponse } from "./EmptyResponse";


export class RedirectResponse extends EmptyResponse {
    constructor(location: string);
    constructor(statusCode: number, location: string);
    constructor(status: number | string, location?: string) {
        if (typeof status === "string") {
            location = status;
            status = 301;
        }

        super(status, { location: location! });
    }
}
