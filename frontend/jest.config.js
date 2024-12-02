const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^isows$": "<rootDir>/__mocks__/isows.ts",
    "^isows/(.*)$": "<rootDir>/__mocks__/isows.ts",
    "^wagmi$": "<rootDir>/__mocks__/wagmi.ts",
    "^wagmi/(.*)$": "<rootDir>/__mocks__/wagmi.ts",
    "^viem$": "<rootDir>/__mocks__/viem.ts",
    "^viem/(.*)$": "<rootDir>/__mocks__/viem.ts",
    "^@gravity-bridge/(.*)$": "<rootDir>/__mocks__/gravity-bridge.ts",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@wagmi|wagmi|@rainbow-me|@cosmjs|@cosmos-kit|viem|isows|@tanstack|@ethersproject|@bufbuild|@buf|@layerzerolabs|@viem|abitype|@gravity-bridge)/)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "babel-jest",
      {
        presets: [
          [
            "@babel/preset-env",
            {
              targets: { node: "current" },
              modules: "commonjs",
            },
          ],
          "@babel/preset-typescript",
          ["next/babel", { "preset-env": { modules: "commonjs" } }],
        ],
        plugins: [
          [
            "@babel/plugin-transform-modules-commonjs",
            {
              allowTopLevelThis: true,
              loose: true,
            },
          ],
        ],
      },
    ],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  resolver: "<rootDir>/jest.resolver.js",
  moduleDirectories: ["node_modules", "<rootDir>"],
};

module.exports = createJestConfig(config);
