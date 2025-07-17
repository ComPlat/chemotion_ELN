import React, { useEffect, useState } from "react";
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
import UsersFetcher from 'src/fetchers/UsersFetcher';

export default function Topbar() {
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    let isMounted = true;

    const tryFetchUser = async () => {
      try {
        const result = await UsersFetcher.fetchCurrentUser();
        if (
          isMounted
          && !result.error
          && result.user
          && Object.keys(result.user).length > 0
        ) {
          setCurrentUser(result.user);
        } else if (isMounted) {
          setTimeout(tryFetchUser, 1000); // Retry in 1s
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setTimeout(tryFetchUser, 1000);
      }
    };

    tryFetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!currentUser || Object.keys(currentUser).length === 0) {
    return null;
  }

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
