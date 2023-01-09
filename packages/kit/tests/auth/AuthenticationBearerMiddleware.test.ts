import "reflect-metadata";
import { container as globalContainer } from "tsyringe";
import { ApplicationTester, ContainerMiddleware, KEY, PassthroughMiddleware, useContextProperty } from "../../src";
import { AuthenticationBearerMiddleware, IAuthenticationService } from "../../src/auth";
import { random } from "../utils";


describe("AuthenticationBearerMiddleware", () => {

    const onAuthenticate = jest.fn(async key => ({ id: "user-id" }));
    const server = new ApplicationTester({
        middlewares: [
            ContainerMiddleware("request"),
            AuthenticationBearerMiddleware({
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
            authorization: "API none"
        });

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("passthrough when already authenticated", async () => {
        const call = server.newCall().withHeaders({
            authorization: "BEARER token-value"
        }).withContext({
            user: { id: random.string() }
        });

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("called onAuthenticate", async () => {
        const token = random.string();
        const call = server.newCall().withHeaders({
            authorization: `BEARER ${token}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(onAuthenticate).toBeCalledWith(token);
    });

    test("used ApiKeyAuthentication service", async () => {
        const CustomBearerAuthentication: IAuthenticationService = {
            authenticate: jest.fn(async key => ({ id: "user-id" }))
        };

        const container = globalContainer.createChildContainer();
        container.registerInstance(KEY("BearerAuthentication"), CustomBearerAuthentication);

        const server = new ApplicationTester({
            middlewares: [
                PassthroughMiddleware(() => { useContextProperty("container", container); }),
                AuthenticationBearerMiddleware()
            ]
        });
        await server.initialize();

        const schema = random.string();
        const call = server.newCall().withHeaders({
            authorization: `BEARER ${schema}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(CustomBearerAuthentication.authenticate).toBeCalledWith(schema);
    });
});
