/** @type { import('@storybook/react-webpack5').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Design Principles',
          ['Colors', 'Typography', 'Forms'],
          'Components',
        ],
      },
    },
  },
};

export default preview;
