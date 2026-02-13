// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force javascript-lp-solver to resolve to its browser build
// (the default ESM entry imports Node's "fs" and "child_process")
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "javascript-lp-solver") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/javascript-lp-solver/dist/index.browser.mjs"
      ),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
