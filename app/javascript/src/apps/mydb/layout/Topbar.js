import React from "react";
import { ButtonGroup } from "react-bootstrap";

import Search from "src/components/navigation/search/Search";
import ReportUtilButton from "src/components/contextActions/ReportUtilButton";
import ManagingActions from "src/components/managingActions/ManagingActions";
import CreateButton from "src/components/contextActions/CreateButton";
import PrintCodeButton from "src/components/contextActions/PrintCodeButton";
import SplitElementButton from "src/components/contextActions/SplitElementButton";
import ExportImportButton from "src/components/contextActions/ExportImportButton";
import SupportMenuButton from "src/components/navigation/SupportMenuButton";
import UserAuth from "src/components/navigation/UserAuth";

export default function Topbar() {
  return (
    <div className="d-flex justify-content-between pe-3 topbar">
      <div className="d-flex align-items-center gap-2">
        <Search />
        <ManagingActions />
        <ButtonGroup className="d-flex align-items-center">
          <SplitElementButton />
          <CreateButton />
        </ButtonGroup>
        <ExportImportButton />
        <ReportUtilButton />
        <PrintCodeButton />
      </div>
      <div className="d-flex align-items-center gap-2">
        <SupportMenuButton />
        <UserAuth />
      </div>
    </div>
  );
}
