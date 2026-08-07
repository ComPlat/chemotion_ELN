/** @type { import('@storybook/react-webpack5').StorybookConfig } */
import path from 'path';

const BASE_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

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
      // Replace both the bare alt package and the app singleton with a
      // Storybook-safe stub. alt 0.18.x uses constructor patterns incompatible
      // with SWC's strict class transforms, causing
      // "class constructors must be invoked with new" during module init.
      alt$: path.resolve(__dirname, 'mocks/alt.js'),
      'src/stores/alt/alt$': path.resolve(__dirname, 'mocks/alt.js'),
      'src/apps/mydb/elements/labels/ElementCollectionLabels$': path.resolve(__dirname, 'mocks/ElementCollectionLabels.js'),
      'src/components/common/CopyElementModal$': path.resolve(__dirname, 'mocks/CopyElementModal.js'),
      'src/components/UserLabels$': path.resolve(__dirname, 'mocks/UserLabels.js'),
      'src/components/comments/HeaderCommentSection$': path.resolve(__dirname, 'mocks/HeaderCommentSection.js'),
      'src/components/common/PrintCodeButton$': path.resolve(__dirname, 'mocks/PrintCodeButton.js'),
      'src/components/calendar/OpenCalendarButton$': path.resolve(__dirname, 'mocks/OpenCalendarButton.js'),
      'src/stores/alt/actions/DetailActions$': path.resolve(__dirname, 'mocks/DetailActions.js'),
    };
    return config;
  },
  previewHead: (head) => `
    ${head}
    <link rel="stylesheet" href="${BASE_URL}/assets/application.css" />
  `,

};
export default config;
