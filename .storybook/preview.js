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
          'Subatomic',
          ['Colors', 'Typography'],
          'Atoms',
          ['Button', 'Select'],
          'Molecules',
          ['DetailCardButton', 'Forms'],
          'Organisms',
          ['AppModal', 'DetailCard', 'ElementDetailCard', 'ConfirmationOverlay'],
        ],
      },
    },
  },
};

export default preview;
