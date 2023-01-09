"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { createClient, AuthHeader, Header, QueryParam, HttpCClientError } = require("@httpc/client");
const metadata = require("./types/metadata.json");

exports.AuthHeader = AuthHeader;
exports.Header = Header;
exports.QueryParam = QueryParam;
exports.HttpCClientError = HttpCClientError;
exports.default = function (options) {
    return createClient({ ...options, metadata });
};
