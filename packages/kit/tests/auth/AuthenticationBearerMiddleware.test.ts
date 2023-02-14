import "reflect-metadata";
import { container as globalContainer } from "tsyringe";
import { ApplicationTester, KEY, PassthroughMiddleware, RESOLVE, useContextProperty } from "../../src";
import { AuthenticationBearerMiddleware, IAuthenticationService } from "../../src/auth";
import { random } from "../utils";


describe("AuthenticationBearerMiddleware", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("passthrough", async () => {
        const onAuthenticate = jest.fn(async key => ({ id: "user-id" }));
        const server = new ApplicationTester({
            middlewares: [
                AuthenticationBearerMiddleware({
                    onAuthenticate: onAuthenticate,
                })
            ]
        });

        await server.initialize();

        const call = server.newCall();

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("passthrough when different schema", async () => {
        const onAuthenticate = jest.fn(async key => ({ id: "user-id" }));
        const server = new ApplicationTester({
            middlewares: [
                AuthenticationBearerMiddleware({
                    onAuthenticate: onAuthenticate,
                })
            ]
        });

        await server.initialize();

        const call = server.newCall().withHeaders({
            authorization: "API none"
        });

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("passthrough when already authenticated", async () => {
        const onAuthenticate = jest.fn(async key => ({ id: "user-id" }));
        const server = new ApplicationTester({
            middlewares: [
                AuthenticationBearerMiddleware({
                    onAuthenticate: onAuthenticate,
                })
            ]
        });

        await server.initialize();

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
        const onAuthenticate = jest.fn(async key => ({ id: "user-id" }));
        const server = new ApplicationTester({
            middlewares: [
                AuthenticationBearerMiddleware({
                    onAuthenticate: onAuthenticate,
                })
            ]
        });

        await server.initialize();

        const token = random.string();
        const call = server.newCall().withHeaders({
            authorization: `BEARER ${token}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(onAuthenticate).toBeCalledWith(token);
    });

    test("called builtin BearerAuthenticationService", async () => {
        const container = globalContainer.createChildContainer();

        const server = new ApplicationTester({
            middlewares: [
                PassthroughMiddleware(() => { useContextProperty("container", container); }),
                AuthenticationBearerMiddleware({
                    jwtSecret: "secret"
                })
            ]
        });
        await server.initialize();

        const token = random.string();
        const call = server.newCall().withHeaders({
            authorization: `BEARER ${token}`
        });

        const service = RESOLVE(container, KEY("BearerAuthentication"));
        const authenticate = jest.spyOn(service, "authenticate").mockImplementation(async () => ({ id: "user-id" }));

        await expect(call.run()).resolves.toBeUndefined();
        expect(authenticate).toBeCalledWith(token);
    });

    test("used custom BearerAuthentication service", async () => {
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

        const token = random.string();
        const call = server.newCall().withHeaders({
            authorization: `BEARER ${token}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(CustomBearerAuthentication.authenticate).toBeCalledWith(token);
    });
});
