import React, { useContext, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import { ExtendedSignInForm } from 'src/components/navigation/NavNewSession';

const SignIn = () => {
  const { userStore } = useContext(StoreContext);
  const { deviseMappings } = userStore;

  useEffect(() => {
    userStore.fetchOmniauthProviders();
    userStore.fetchDeviseMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!deviseMappings) { return null; }

  return (
    <div>
      <BaseNavigation />
      <Container className="mt-5">
        {userStore.loginStatus === 'failed' && (
          <Alert variant="warning">Invalid Login or password.</Alert>
        )}
        <ExtendedSignInForm />
      </Container>
    </div>
  );
};

export default observer(SignIn);
