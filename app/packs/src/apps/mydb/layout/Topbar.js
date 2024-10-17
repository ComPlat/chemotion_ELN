import React, { useState, useEffect } from 'react';
import { ButtonGroup, Dropdown, DropdownButton } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';
import Search from 'src/components/navigation/search/Search';
import CreateButton from 'src/components/contextActions/CreateButton';
import SplitElementButton from 'src/components/contextActions/SplitElementButton';
import ReportUtilButton from 'src/components/contextActions/ReportUtilButton';
import ExportImportButton from 'src/components/contextActions/ExportImportButton';
import ScanCodeButton from 'src/components/contextActions/ScanCodeButton';
import UserAuth from 'src/components/navigation/UserAuth';

function ExternalItem({ title, href }) {
  return (
    <Dropdown.Item
      className="d-flex gap-3 align-items-baseline justify-content-between"
      href={href}
      target="_blank"
    >
      {title}
      <i className="fa fa-external-link" />
    </Dropdown.Item>
  );
}

export default function Topbar() {
  const [version, setVersion] = useState({});
  const onUiStoreChange = ({ version }) => setVersion(version);
  useEffect(() => {
    UIStore.listen(onUiStoreChange);
    onUiStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);
  const hasVersions = version && Object.keys(version).length > 1;

  return (
    <div className="d-flex justify-content-between py-3">
      <Search />

      <div className="d-flex align-items-center gap-2">
        <ButtonGroup className="d-flex align-items-center">
          <SplitElementButton />
          <CreateButton />
        </ButtonGroup>

        <ExportImportButton />
        <ReportUtilButton />
        <ScanCodeButton />


        <DropdownButton title="Info & Support" variant="light">
          <ExternalItem title="Chemotion.net" href="https://www.chemotion.net" />
          <ExternalItem title="Chemotion-Repository.net" href="https://www.chemotion-repository.net" />
          <Dropdown.Divider />
          <ExternalItem title="Search documentation" href="https://chemotion.net/search" />
          <ExternalItem title="Helpdesk - Contact Us" href="https://chemotion.net/helpdesk" />
          <ExternalItem title="Report an issue on Github" href="https://github.com/ComPlat/chemotion_ELN/issues" />
          {hasVersions && (
            <>
              <Dropdown.Divider />
              <Dropdown.ItemText className="d-flex flex-column text-muted">
                {Object.entries(version).map(([k, v]) => (
                  <span key={k} className="d-flex justify-content-between">
                    <span>{k}:</span>
                    <span style={{userSelect: 'text'}}>
                      {k == 'version' ? v : v.substring(0, 8)}
                    </span>
                  </span>
                ))}
              </Dropdown.ItemText>
            </>
          )}
        </DropdownButton>

        <UserAuth />
      </div>
    </div>
  );
}
