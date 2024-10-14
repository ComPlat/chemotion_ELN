import React from 'react';

import Navigation from 'src/apps/home/Navigation';
import WelcomeMessage from 'src/apps/home/WelcomeMessage';

export default function Home() {
  return (
    <div>
      <Navigation />
      <WelcomeMessage />
    </div>
  );
}
