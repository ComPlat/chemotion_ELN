import React, { useContext } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import WelcomeMessage from 'src/apps/home/WelcomeMessage';
import WorkshopGuideInline from 'src/components/workshopGuide/WorkshopGuideInline';
import { ExtendedSignInForm } from 'src/components/navigation/NavNewSession';

const Home = () => {
  const { userStore } = useContext(StoreContext);
  if (userStore.loginStatus === 'failed') {
    return (
      <div>
        <BaseNavigation />
        <Container className="mt-5">
          <Alert variant="warning">Invalid Login or password.</Alert>
          <ExtendedSignInForm />
        </Container>
      </div>
    );
  }

  return (
    <div>
      <BaseNavigation />
      <WelcomeMessage />
      <WorkshopGuideInline />
    </div>
  );
};

export default observer(Home);
