import "dotenv/config";
import path from "path";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import lottie from "astro-integration-lottie";
import compress from "astro-compress";
import rehypeLinkProcessor from "rehype-link-processor";
import codeTheme from "./src/code-theme";
import codeDecoration from "./src/plugins/codeBlockDecorator";


export default defineConfig({
  site: "https://httpc.dev",
  server: {
    port: Number(process.env.PORT || 3000)
  },
  integrations: [
    codeDecoration(),
    mdx(),
    preact(),
    lottie(),
    compress({
      html: {
        removeAttributeQuotes: false,
      },
      css: false
    }),
    sitemap({
      filter: page => ![
        "/docs/"
      ].includes(new URL(page).pathname)
    })
  ],
  markdown: {
    rehypePlugins: [
      rehypeLinkProcessor(),
    ],
    shikiConfig: {
      theme: codeTheme
    }
  },
  vite: {
    plugins: [
      {
        name: "watch-assets",
        enforce: "post",
        handleHotUpdate({ file, server }) {
          if (file.includes("/assets/")) {
            server.ws.send({
              type: "full-reload",
              path: "*"
            });
          }
        }
      }
    ],
    resolve: {
      alias: {
        "~": path.resolve("./src").replaceAll("\\", "/")
      }
    }
  }
});
