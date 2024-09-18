import React from 'react';
import {
  Dropdown, MenuItem
} from 'react-bootstrap';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';
import uuid from 'uuid';

const ThirdPartyAppButton = ({ attachment, options, tokenList, onChangeRecall }) => {

  const handleFetchAttachToken = (option) => {
    ThirdPartyAppFetcher.fetchAttachmentToken(attachment.id, option.id)
      .then((result) => {
        onChangeRecall();
        window.open(result, '_blank');
      });
  };

  const tpaTokenExists = (attachment_id, tpa) => {
    let status = false;
    tokenList?.map((item) => {
      const keySplit = Object.keys(item)[0].split('/');
      const attachment_id_match = keySplit[0] == attachment_id;
      const tpa_id = keySplit[1] == tpa.id;
      if (tpa_id) {
        if (attachment_id_match) {
          status = true;
        }
      }
    });
    return status;
  };

  return (
    <Dropdown id={`dropdown-TPA-attachment${attachment.id}`} style={{ float: 'right' }}>
      <Dropdown.Toggle style={{ height: '30px' }} bsSize="xs" bsStyle="primary">
        <i className="fa  fa-external-link " aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {options.map((option) => {
          const status = tpaTokenExists(attachment.id, option);
          return (
            < MenuItem
              key={uuid.v4()}
              eventKey={option.id}
              onClick={() => handleFetchAttachToken(option)}
            >
              <div style={{ display: 'flex' }}>
                <div style={{ width: '90%' }}>{option.name}</div>
                {status && <i className="fa fa-key" />}
              </div>
            </MenuItem>
          );
        })}
      </Dropdown.Menu>
    </Dropdown >
  );
};

export default ThirdPartyAppButton;