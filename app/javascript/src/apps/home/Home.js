import React from 'react';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import WelcomeMessage from 'src/apps/home/WelcomeMessage';
import WorkshopGuideInline from 'src/components/workshopGuide/WorkshopGuideInline';

const Home = () => (
    <div>
      <BaseNavigation />
      <WelcomeMessage />
      <WorkshopGuideInline />
    </div>
  );

export default Home;
