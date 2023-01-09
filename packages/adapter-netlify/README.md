# @httpc/adapter-netlify
This package is part of [httpc](https://httpc.dev) framework.

## httpc
httpc is a javascript/typescript framework for building function-based API with minimal code and end-to-end type safety.
- [Documentation and tutorials](https://httpc.dev/docs)
- [Community](https://httpc.dev/discord)
- [Issues and feature requests](https://httpc.dev/issues)

## httpc family
**@httpc/server**: the httpc core component allowing function calls over the standard http protocol

**@httpc/client**: typed interface used by consumers to interact safely with functions exposed by an httpc server

**@httpc/kit**: rich toolbox of builtin components to manage common use cases and business concerns like authentication, validation, caching and logging

**@httpc/cli**: commands to setup a project, generate clients, manage versioning and help with common tasks

**@httpc/adapter-\***: various [adapters](https://httpc.dev/docs/adapters) to host an httpc API inside environment like vercel, netlify functions, aws lambda and similar
