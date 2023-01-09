#!/usr/bin/env node
import "cross-fetch/polyfill";
import { program } from "commander";
import { VERSION } from "./version";
import { ClientCommand, CreateCommand, CallCommand } from "./commands";


program.name("httpc")
    .version(VERSION, "-v, --version")
    .configureHelp({
        subcommandTerm: cmd => cmd.name()
    })
    .addCommand(ClientCommand)
    .addCommand(CreateCommand)
    .addCommand(CallCommand)
    ;

program.parse();
