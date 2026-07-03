import React, { useState } from 'react';
import BaseNavigation from 'src/components/navigation/BaseNavigation';
import TreeViewItem from 'src/components/common/TreeViewItem';
import Notifications from 'src/components/Notifications';
import AdminDashboard from 'src/apps/admin/AdminDashboard';
import UserManagement from 'src/apps/admin/UserManagement';
import GroupsDevices from 'src/apps/admin/GroupsDevices';
import MessagePublish from 'src/apps/admin/MessagePublish';
import OlsTerms from 'src/apps/admin/OlsTerms';
import MatrixManagement from 'src/apps/admin/MatrixManagement';
import DelayedJobs from 'src/apps/admin/DelayedJobs';
import ChemSpectraLayouts from 'src/apps/admin/ChemSpectraLayouts';
import DevicesList from 'src/apps/admin/devices/DevicesList';
// import TemplateManagement from 'src/apps/admin/TemplateManagement';
import ThirdPartyApp from 'src/apps/admin/ThirdPartyApp';
import InfoSupportLinks from 'src/apps/admin/InfoSupportLinks';

const ADMIN_PAGES = [
  { key: 0, label: 'Dashboard', component: AdminDashboard },
  { key: 1, label: 'User Management', component: UserManagement },
  { key: 9, label: 'Devices', component: DevicesList },
  { key: 4, label: 'Groups', component: GroupsDevices },
  { key: 7, label: 'UI features', component: MatrixManagement },
  { key: 2, label: 'Message Publish', component: MessagePublish },
  { key: 5, label: 'Load OLS Terms', component: OlsTerms },
  // { key: 12, label: 'Report-template Management', component: TemplateManagement },
  { key: 13, label: 'Delayed Jobs', component: DelayedJobs },
  { key: 14, label: 'ChemSpectra Layouts', component: ChemSpectraLayouts },
  { key: 15, label: 'Third Party Apps', component: ThirdPartyApp },
  { key: 16, label: 'Info & Support Links', component: InfoSupportLinks },
];

export default function AdminHome() {
  const [pageIndex, setPageIndex] = useState(0);

  const handleSelect = (nextPageIndex) => {
    setPageIndex(Number(nextPageIndex));
  };

  const currentPage = ADMIN_PAGES.find(({ key }) => key === pageIndex);
  const PageComponent = currentPage?.component;

  return (
    <div className="d-flex flex-column vh-100">
      <BaseNavigation />
      <div className="d-flex flex-grow-1 align-items-stretch">
        <div className="sidebar">
          <div className="sidebar-content">
            <div className="tree-view__container">
              {ADMIN_PAGES.map(({ key, label }) => (
                <TreeViewItem
                  key={key}
                  title={label}
                  selected={pageIndex === key}
                  onClick={() => handleSelect(key)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-grow-1 p-4">
          {PageComponent ? <PageComponent /> : null}
        </div>
      </div>
      <Notifications />
    </div>
  );
}
