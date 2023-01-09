
export type Package =
    | "@httpc/server"
    | "@httpc/kit"
    | "@httpc/client"
    | "@httpc/cli"


export type PackageMeta = Readonly<{
    icon: string
    description: string
}>

export const packageMeta: Record<Package, PackageMeta> = {
    "@httpc/server": {
        icon: "ri:server-fill",
        description: "The httpc core component allowing function calls over the standard http protocol",
    },
    "@httpc/kit": {
        icon: "ion:construct",
        description: "Rich toolbox of builtin components to manage common use cases and business concerns",
    },
    "@httpc/client": {
        icon: "ic:baseline-outbound",
        description: "Typed interface used by consumers to interact safely with functions exposed by an httpc server",
    },
    "@httpc/cli": {
        icon: "ri:terminal-box-fill",
        description: "Commands to setup a project, generate clients, manage versioning and help with common tasks",
    },
}
