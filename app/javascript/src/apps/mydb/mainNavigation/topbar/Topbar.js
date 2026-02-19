import React from 'react';
import ScanCodeButton from 'src/components/navigation/ScanCodeButton';
import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import UserAuth from 'src/components/navigation/UserAuth';
import InboxButton from 'src/apps/mydb/mainNavigation/topbar/InboxButton';
import SampleTaskSidebarButton from 'src/components/sampleTaskInbox/SampleTaskSidebarButton';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import NoticeButton from 'src/apps/mydb/mainNavigation/topbar/NoticeButton';

export default function Topbar() {
  return (
    <div className="d-flex justify-content-between pe-3 topbar">
      <div className="d-flex align-items-center flex-wrap gap-2 row-gap-1">
        <InboxButton />
        <SampleTaskSidebarButton />
        <OpenCalendarButton />
        <NoticeButton />
      </div>
      <div className="d-flex align-items-center gap-2 row-gap-1 flex-wrap justify-content-end">
        <ScanCodeButton />
        <SupportMenuButton />
        <UserAuth />
      </div>
    </div>
  );
}
