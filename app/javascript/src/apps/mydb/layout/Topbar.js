import React from "react";
import { ButtonGroup } from "react-bootstrap";

import Search from "src/components/navigation/search/Search";
import ReportUtilButton from "src/components/contextActions/ReportUtilButton";
import ManagingActions from "src/components/managingActions/ManagingActions";
import CreateButton from "src/components/contextActions/CreateButton";
import GeneratePDFButton from "src/components/contextActions/GeneratePDFButton";
import SplitElementButton from "src/components/contextActions/SplitElementButton";
import ExportImportButton from "src/components/contextActions/ExportImportButton";
import ScanCodeButton from "src/components/contextActions/ScanCodeButton";
import SupportMenuButton from "src/components/navigation/SupportMenuButton";
import UserAuth from "src/components/navigation/UserAuth";

export default function Topbar() {
  return (
    <div className="d-flex justify-content-between pe-3 topbar">
      <div className="d-flex align-items-center flex-wrap gap-2 row-gap-1">
        <Search />
        <ManagingActions />
        <ButtonGroup className="d-flex align-items-center">
          <SplitElementButton />
          <CreateButton />
        </ButtonGroup>
        <ExportImportButton />
        <ReportUtilButton />
        <GeneratePDFButton />
      </div>
      <div className="d-flex align-items-center gap-2 row-gap-1 flex-wrap justify-content-end">
        <ScanCodeButton />
        <SupportMenuButton />
        <UserAuth />
      </div>
    </div>
  );
}
