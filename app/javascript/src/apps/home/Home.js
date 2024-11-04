import React from 'react';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import WelcomeMessage from 'src/apps/home/WelcomeMessage';

export default function Home() {
  return (
    <div>
      <BaseNavigation />
      <WelcomeMessage />
    </div>
  );
}
