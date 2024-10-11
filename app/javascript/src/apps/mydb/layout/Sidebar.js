import React from "react";
import { Button } from "react-bootstrap";

import NavHead from "src/components/navigation/NavHead";
import CollectionTree from "src/apps/mydb/collections/CollectionTree";

import InboxButton from "src/components/contextActions/InboxButton";
import SampleTaskNavigationElement from "src/components/sampleTaskInbox/SampleTaskNavigationElement";
import OpenCalendarButton from "src/components/calendar/OpenCalendarButton";
import NoticeButton from "src/components/contextActions/NoticeButton";

export default function Sidebar() {
  return (
    <div className="h-100 d-flex flex-column">
      <div className="flex-grow-1 overflow-y-auto h-0">
        <div className="d-flex justify-content-center py-3">
          <NavHead />
        </div>
        <CollectionTree />
      </div>
      <div className="d-flex justify-content-center gap-3 py-4">
        <InboxButton />
        <SampleTaskNavigationElement />
        <OpenCalendarButton />
        <NoticeButton />
        <Button
          onClick={() => UserActions.logout()}
          variant="light"
          title="Log out"
        >
          <i className="fa fa-sign-out" />
        </Button>
      </div>
    </div>
  );
}
