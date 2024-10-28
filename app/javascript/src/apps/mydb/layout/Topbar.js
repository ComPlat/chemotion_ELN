import React from 'react';

import Search from 'src/components/navigation/search/Search';
import ReportUtilButton from 'src/components/contextActions/ReportUtilButton';
import ScanCodeButton from 'src/components/contextActions/ScanCodeButton';
import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import UserAuth from 'src/components/navigation/UserAuth';

export default function Topbar() {
  return (
    <div className="d-flex justify-content-between p-3">
      <Search />

      <div className="d-flex align-items-center gap-2">
        <ReportUtilButton />
        <ScanCodeButton />
        <SupportMenuButton />
        <UserAuth />
      </div>
    </div>
  );
}
