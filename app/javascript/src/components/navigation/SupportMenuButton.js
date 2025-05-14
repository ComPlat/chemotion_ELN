import React, { useState, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

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

export default function SupportMenuButton({ linkToEln = false }) {
  const [version, setVersion] = useState({});
  useEffect(() => {
    const onUiStoreChange = (state) => setVersion(state.version);
    UIStore.listen(onUiStoreChange);
    onUiStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);
  const hasVersions = version && Object.keys(version).length > 1;

  return (
    <Dropdown>
      <Dropdown.Toggle variant="light">
        <i className="fa fa-info-circle me-1" />
        Info & Support
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <ExternalItem title="Chemotion.net" href="https://www.chemotion.net" />
        <ExternalItem title="Chemotion-Repository.net" href="https://www.chemotion-repository.net" />
        <Dropdown.Divider />
        <ExternalItem title="Search documentation" href="https://chemotion.net/search" />
        <ExternalItem title="Helpdesk - Contact Us" href="https://chemotion.net/helpdesk" />
        <ExternalItem title="Report an issue on Github" href="https://github.com/ComPlat/chemotion_ELN/issues" />
        <ExternalItem title="Styleguide" href="/styleguide" />
        <Dropdown.Divider />

        {linkToEln
          ? <Dropdown.Item href="/mydb">ELN</Dropdown.Item>
          : <Dropdown.Item href="/home">Home</Dropdown.Item>}

        {hasVersions && (
          <Dropdown.ItemText className="d-flex flex-column text-muted">
            {Object.entries(version).map(([k, v]) => (
              <span key={k} className="d-flex justify-content-between">
                <span>
                  {k}
                  :
                </span>
                <span style={{ userSelect: 'text' }}>
                  {k === 'version' ? v : (v ?? '').substring(0, 8)}
                </span>
              </span>
            ))}
          </Dropdown.ItemText>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
