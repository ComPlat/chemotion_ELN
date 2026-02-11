import React from 'react';
import { Button } from 'react-bootstrap';
import CreateButton from 'src/components/contextActions/CreateButton';
import ScanCodeButton from 'src/components/contextActions/ScanCodeButton';
import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import UserAuth from 'src/components/navigation/UserAuth';

export default function Topbar() {
  return (
    <div className="d-flex justify-content-between pe-3 topbar">
      <div className="d-flex align-items-center flex-wrap gap-2 row-gap-1">
        <CreateButton />
      </div>
      <div className="d-flex align-items-center gap-2 row-gap-1 flex-wrap justify-content-end">
        <ScanCodeButton />
        <SupportMenuButton />
        <UserAuth />
      </div>
    </div>
  );
}
