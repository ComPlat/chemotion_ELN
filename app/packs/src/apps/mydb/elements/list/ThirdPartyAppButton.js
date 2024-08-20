import React, { useEffect, useState } from 'react';
import {
  Dropdown, MenuItem
} from 'react-bootstrap';
import uuid from 'uuid';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';

const ThirdPartyAppButton = ({ attachment, options, tokenList }) => {

  const handleFetchAttachToken = (option) => {
    const { currentElement } = ElementStore.getState();
    const { currentCollection } = UIStore.getState();
    ThirdPartyAppFetcher.fetchAttachmentToken(currentCollection?.id, attachment.id, option.id, currentElement.id)
      .then((result) => {
        ElementActions.fetchCollectionAttachmentTokens(currentCollection?.id, currentElement.id);
        window.open(result, '_blank');
      });
    // disabled={!isImageFile(attachment.filename) || attachment.isNew}
  };

  const tpaTokenExists = (attachment_id, tpa) => {
    let status = false;
    tokenList?.map((item) => {
      const keySplit = Object.keys(item)[0].split('/');
      const attachment_id_match = keySplit[1] == attachment_id;
      const tpa_id = keySplit[0] == tpa.id;
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