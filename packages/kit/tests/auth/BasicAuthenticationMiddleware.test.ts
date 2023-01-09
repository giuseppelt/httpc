import "reflect-metadata";
import { container as globalContainer } from "tsyringe";
import { ApplicationTester, ContainerMiddleware, KEY, PassthroughMiddleware, useContextProperty } from "../../src";
import { BasicAuthenticationMiddleware, IAuthenticationService } from "../../src/auth";
import { random } from "../utils";


describe("BasicAuthenticationMiddleware", () => {

    const onAuthenticate = jest.fn(async _ => ({ id: "user-id" }));
    const server = new ApplicationTester({
        middlewares: [
            ContainerMiddleware("request"),
            BasicAuthenticationMiddleware({
                onAuthenticate: onAuthenticate,
            })
        ]
    });

    function generateAuthentication() {
        const username = random.string();
        const password = random.string();
        const hash = Buffer.from(`${username}:${password}`).toString("base64");

        return { username, password, hash };
    }

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
            authorization: "BEARER value"
        });

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("passthrough when already authenticated", async () => {
        const call = server.newCall().withHeaders({
            authorization: "BASIC value"
        }).withContext({
            user: { id: random.string() }
        });

        const value = random.string();
        await expect(call.run(() => value)).resolves.toBe(value);
        expect(onAuthenticate).not.toBeCalled();
    });

    test("called onAuthenticate", async () => {
        const { username, password, hash } = generateAuthentication();
        const call = server.newCall().withHeaders({
            authorization: `BASIC ${hash}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(onAuthenticate).toBeCalledWith({ username, password });
    });

    test("used BasicAuthentication service", async () => {
        const CustomBearerAuthentication: IAuthenticationService = {
            authenticate: jest.fn(async key => ({ id: "user-id" }))
        };

        const container = globalContainer.createChildContainer();
        container.registerInstance(KEY("BasicAuthentication"), CustomBearerAuthentication);

        const server = new ApplicationTester({
            middlewares: [
                PassthroughMiddleware(() => { useContextProperty("container", container); }),
                BasicAuthenticationMiddleware()
            ]
        });
        await server.initialize();

        const { username, password, hash } = generateAuthentication();
        const call = server.newCall().withHeaders({
            authorization: `BASIC ${hash}`
        });

        await expect(call.run()).resolves.toBeUndefined();
        expect(CustomBearerAuthentication.authenticate).toBeCalledWith({ username, password });
    });

    test("authorization schemas", async () => {
        const schemas = [
            "basic",
            "Basic",
            "BASIC",
            "bASiC"
        ];

        for (const schema of schemas) {
            const { username, password, hash } = generateAuthentication();
            const call = server.newCall().withHeaders({
                authorization: `${schema} ${hash}`
            });

            await expect(call.run()).resolves.toBeUndefined();
            expect(onAuthenticate).toBeCalledWith({ username, password });
            onAuthenticate.mockClear();
        }
    });
});
