import React from 'react';

import Navigation from 'src/components/navigation/Navigation';
import WelcomeMessage from 'src/apps/home/WelcomeMessage';

export default function Home() {
  return (
    <div>
      <Navigation isHidden />
      <WelcomeMessage />
    </div>
  );
}
