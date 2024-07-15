import React, { useEffect, useState } from 'react';
import {
  Dropdown, MenuItem
} from 'react-bootstrap';
import uuid from 'uuid';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';

const { currentCollection } = UIStore.getState();
const { currentElement } = ElementStore.getState();

const ThirdPartyAppButton = ({ attachment, options, attachmentsData }) => {
  const fetchListOfTokens = async () => {
    await ElementActions.fetchCollectionAttachmentTokens(currentCollection?.id, currentElement?.id);
  };

  const handleFetchAttachToken = (option) => {
    ThirdPartyAppFetcher.fetchAttachmentToken(currentCollection?.id, attachment.id, option.id, currentElement?.id)
      .then((result) => {
        fetchListOfTokens();
        window.open(result, '_blank');
      });
    // disabled={!isImageFile(attachment.filename) || attachment.isNew}
  };

  return (
    <Dropdown id={`dropdown-TPA-attachment${attachment.id}`} style={{ float: 'right' }}>
      <Dropdown.Toggle style={{ height: '30px' }} bsSize="xs" bsStyle="primary">
        <i className="fa  fa-external-link " aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {options.map((option) => {
          return (
            < MenuItem
              key={uuid.v4()}
              eventKey={option.id}
              onClick={() => handleFetchAttachToken(option)}
            >
              {option.name}
            </MenuItem>
          );
        })}
      </Dropdown.Menu>
    </Dropdown >
  );
};


export default ThirdPartyAppButton;