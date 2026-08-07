import React from 'react';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import WelcomeMessage from 'src/apps/home/WelcomeMessage';
import WorkshopGuideInline from 'src/components/workshopGuide/WorkshopGuideInline';

export default function Home() {
  return (
    <div>
      <BaseNavigation />
      <WelcomeMessage />
      <WorkshopGuideInline />
    </div>
  );
}
