import React from 'react';
import { ButtonGroup } from 'react-bootstrap';

import Search from 'src/components/navigation/search/Search';
import CreateButton from 'src/components/contextActions/CreateButton';
import SplitElementButton from 'src/components/contextActions/SplitElementButton';
import ReportUtilButton from 'src/components/contextActions/ReportUtilButton';
import ExportImportButton from 'src/components/contextActions/ExportImportButton';
import ScanCodeButton from 'src/components/contextActions/ScanCodeButton';
import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import UserAuth from 'src/components/navigation/UserAuth';

export default function Topbar() {
  return (
    <div className="d-flex justify-content-between p-3">
      <Search />

      <div className="d-flex align-items-center gap-2">
        <ButtonGroup className="d-flex align-items-center">
          <SplitElementButton />
          <CreateButton />
        </ButtonGroup>

        <ExportImportButton />
        <ReportUtilButton />
        <ScanCodeButton />

        <SupportMenuButton />
        <UserAuth />
      </div>
    </div>
  );
}
