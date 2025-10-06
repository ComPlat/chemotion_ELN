/** @type { import('@storybook/react-webpack5').StorybookConfig } */
import path from 'path';

const config = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-webpack5-compiler-swc",
    "@storybook/addon-docs"
  ],
  framework: {
    "name": "@storybook/react-webpack5",
    "options": {}
  },
  webpackFinal: async (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      src: path.resolve(__dirname, '../app/javascript/src'),
    };
    return config;
  },
};
export default config;
