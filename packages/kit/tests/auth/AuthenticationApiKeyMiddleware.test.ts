import "reflect-metadata";
import { container as globalContainer } from "tsyringe";
import { ApplicationTester, KEY, PassthroughMiddleware, useContextProperty } from "../../src";
import { AuthenticationApiKeyMiddleware, IAuthenticationService } from "../../src/auth";
import { random } from "../utils";


describe("AuthenticationApiKeyMiddleware", () => {

    const onAuthenticate = jest.fn(async key => ({ id: "user-id" }));
    const server = new ApplicationTester({
        middlewares: [
            AuthenticationApiKeyMiddleware({
                onAuthenticate: onAuthenticate,
            })
        ]
    });

    beforeAll(async () => {
        await server.initialize();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("passthrough", async () => {
        const call = server.newCall();

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("passthrough when different schema", async () => {
        const call = server.newCall().withHeaders({
            authorization: "BEARER none"
        });

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("passthrough when already authenticated", async () => {
        const call = server.newCall().withHeaders({
            authorization: "API_KEY random-key"
        }).withContext({
            user: { id: random.string() }
        });

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("called onAuthenticate", async () => {
        const apiKey = random.uuid();
        const call = server.newCall().withHeaders({
            authorization: `API_KEY ${apiKey}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(onAuthenticate).toBeCalledWith(apiKey);
    });

    test("used ApiKeyAuthentication service", async () => {
        const CustomApiKeyAuthentication: IAuthenticationService = {
            authenticate: jest.fn(async key => ({ id: "user-id" }))
        };

        const container = globalContainer.createChildContainer();
        container.registerInstance(KEY("ApiKeyAuthentication"), CustomApiKeyAuthentication);

        const server = new ApplicationTester({
            middlewares: [
                PassthroughMiddleware(() => { useContextProperty("container", container); }),
                AuthenticationApiKeyMiddleware()
            ]
        });
        await server.initialize();

        const apiKey = random.uuid();
        const call = server.newCall().withHeaders({
            authorization: `API_KEY ${apiKey}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(CustomApiKeyAuthentication.authenticate).toBeCalledWith(apiKey);
    });

    test("authorization schemas", async () => {
        //cspell:disable
        const schemas = [
            "api_key",
            "api-key",
            "apikey",
            "API_KEY",
            "API-KEY",
            "APIKEY",
            "ApiKey",
            "Api_Key",
            "Api-Key",
        ];
        //cspell:enable

        for (const schema of schemas) {
            const apiKey = random.uuid();
            const call = server.newCall().withHeaders({
                authorization: `${schema} ${apiKey}`
            });

            await expect(call.run()).resolves.toBeUndefined();
            expect(onAuthenticate).toBeCalledWith(apiKey);
            onAuthenticate.mockClear();
        }
    });


    test("header api-key", async () => {
        //cspell:disable
        const schemas = [
            "api_key",
            "api-key",
            "apikey",
            "API_KEY",
            "API-KEY",
            "APIKEY",
            "ApiKey",
            "Api_Key",
            "Api-Key",
        ];
        //cspell:enable

        for (const schema of schemas) {
            const apiKey = random.uuid();
            const call = server.newCall().withHeaders({
                [schema]: apiKey
            });

            await expect(call.run()).resolves.toBeUndefined();
            expect(onAuthenticate).toBeCalledWith(apiKey);
            onAuthenticate.mockClear();
        }
    });

    test("empty api-key header extract nothing", async () => {
        //cspell:disable
        const schemas = [
            "api_key",
            "api-key",
            "apikey",
            "API_KEY",
            "API-KEY",
            "APIKEY",
            "ApiKey",
            "Api_Key",
            "Api-Key",
        ];
        //cspell:enable

        for (const schema of schemas) {
            const call = server.newCall().withHeaders({
                [schema]: " "
            });

            await expect(call.run()).resolves.toBeUndefined();
            expect(onAuthenticate).not.toBeCalled();
            onAuthenticate.mockClear();
        }
    });

    test("missing api-key header extract nothing", async () => {
        const call = server.newCall().withHeaders({});

        await expect(call.run()).resolves.toBeUndefined();
        expect(onAuthenticate).not.toBeCalled();
        onAuthenticate.mockClear();
    });

    test("querystring api-key", async () => {
        //cspell:disable
        const schemas = [
            "api_key",
            "api-key",
            "apikey",
            "API_KEY",
            "API-KEY",
            "APIKEY",
            "ApiKey",
            "Api_Key",
            "Api-Key",
        ];
        //cspell:enable

        for (const schema of schemas) {
            const apiKey = random.uuid();
            const call = server.newCall().withQuery(`${schema}=${apiKey}`);

            await expect(call.run()).resolves.toBeUndefined();
            expect(onAuthenticate).toBeCalledWith(apiKey);
            onAuthenticate.mockClear();
        }
    });

    test("missing querystring key extract nothing", async () => {
        const call = server.newCall();

        await expect(call.run()).resolves.toBeUndefined();
        expect(onAuthenticate).not.toBeCalled();
        onAuthenticate.mockClear();
    });

    test("empty querystring key extract nothing", async () => {
        //cspell:disable
        const schemas = [
            "api_key",
            "api-key",
            "apikey",
            "API_KEY",
            "API-KEY",
            "APIKEY",
            "ApiKey",
            "Api_Key",
            "Api-Key",
        ];
        //cspell:enable

        for (const schema of schemas) {
            const call = server.newCall().withQuery(`${schema}=`);

            await expect(call.run()).resolves.toBeUndefined();
            expect(onAuthenticate).not.toBeCalled();
            onAuthenticate.mockClear();
        }
    });


});
