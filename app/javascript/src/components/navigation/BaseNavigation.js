import React, { useContext } from 'react';
import { Button } from 'react-bootstrap';
import { observer } from 'mobx-react';

import { aviatorNavigationToApp } from 'src/utilities/routesUtils';
import UserAuth from 'src/components/navigation/UserAuth';
import NavNewSession from 'src/components/navigation/NavNewSession';
import ChemotionLogo from 'src/components/common/ChemotionLogo';
import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import { StoreContext } from 'src/stores/mobx/RootStore';

const Navigation = () => {
  const { userStore } = useContext(StoreContext);
  const { currentUser } = userStore;

  return (
    <div className="surface-lighten4 d-flex align-items-center justify-content-between px-4 py-3">
      <Button variant="plain" onClick={() => aviatorNavigationToApp('/mydb/collection/all')}>
        <ChemotionLogo />
      </Button>

      <div className="d-flex gap-2">
        <SupportMenuButton linkToEln variant="link" />
        {currentUser
          ? (<UserAuth userMenuDropdownToggleVariant="link" />)
          : (<NavNewSession />)}
      </div>
    </div>
  );
};

export default observer(Navigation);
