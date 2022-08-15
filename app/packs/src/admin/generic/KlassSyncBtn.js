/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import GenericSgsFetcher from '../../components/fetchers/GenericSgsFetcher';

const delay = (n) => {
  return new Promise((resolve) => { setTimeout(resolve, n * 1000); });
};

const KlassSyncBtn = (props) => {
  const { data } = props;
  const [show, setShow] = useState(false);

  const handleImported = (_params) => {
    console.log(_params);
    setShow(true);

    GenericSgsFetcher.syncTemplate({ identifier: _params.identifier }).then((result) => {
      console.log(result);
      setShow(false);
    }).catch((error) => {
      console.log(error);
    });
  };

  return (
    <div>
      <OverlayTrigger placement="top" overlay={<Tooltip id="_tooltip_sync_template">Click to import ELN</Tooltip>}>
        {
          !show ? <Button bsSize="xs" onClick={() => handleImported(data)}><i className="fa fa-reply" aria-hidden="true" /></Button> :
          <Button bsSize="xs" bsStyle="info"><i className="fa fa-refresh fa-spin" aria-hidden="true" /></Button>
        }
      </OverlayTrigger>
    </div>
  );
};

export default KlassSyncBtn;
