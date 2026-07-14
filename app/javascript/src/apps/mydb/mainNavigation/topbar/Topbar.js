import React from 'react';
import ScanCodeButton from 'src/components/navigation/ScanCodeButton';
import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import UserAuth from 'src/components/navigation/UserAuth';
import InboxButton from 'src/apps/mydb/mainNavigation/topbar/InboxButton';
import SampleTaskSidebarButton from 'src/components/sampleTaskInbox/SampleTaskSidebarButton';
import useWeighingTasksEnabled from 'src/components/sampleTaskInbox/useWeighingTasksEnabled';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import NoticeButton from 'src/apps/mydb/mainNavigation/topbar/NoticeButton';

const Topbar = () => {
  const hasWeighingTasks = useWeighingTasksEnabled();

  return (
    <div className="d-flex justify-content-between pe-3 ps-2 topbar">
      <div className="d-flex align-items-center gap-2">
        <InboxButton />
        {hasWeighingTasks && <SampleTaskSidebarButton />}
        <OpenCalendarButton />
        <NoticeButton />
      </div>
      <div className="d-flex align-items-center gap-2">
        <ScanCodeButton />
        <SupportMenuButton />
        <UserAuth />
      </div>
    </div>
  );
};

export default Topbar;
