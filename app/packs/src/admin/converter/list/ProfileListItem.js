import React, { Component } from 'react';
import { Button, ButtonGroup, OverlayTrigger, Popover } from 'react-bootstrap';

import { ButtonTooltip } from '../../../admin/generic/Utils';

const renderDeleteButton = (deleteProfile) => {
  const popover = (
    <Popover id="popover-positioned-scrolling-left">
      Delete this profile? <br />
      <div className="btn-toolbar">
        <Button bsSize="xsmall" bsStyle="danger" onClick={deleteProfile}>
          Yes
        </Button><span>&nbsp;&nbsp;</span>
        <Button bsSize="xsmall" bsStyle="warning" >
          No
        </Button>
      </div>
    </Popover>
  );

  return (
    <ButtonGroup className="actions">
      <OverlayTrigger
        animation
        placement="right"
        root
        trigger="focus"
        overlay={popover}
      >
        <Button bsSize="xsmall" >
          <i className="fa fa-trash-o" />
        </Button>
      </OverlayTrigger>
    </ButtonGroup>
  );
};

const ProfileListItem = (props) => {
  const {
    // eslint-disable-next-line react/prop-types
    key, id, title, description, profile, deleteProfile, editProfile, downloadProfile
  } = props;

  // eslint-disable-next-line react/prop-types
  const header = (profile && profile.tables && profile.tables[0] && profile.tables[0].header) || {};

  return (
    <tr key={`row_${key}`} id={`row_${id}`}>
      <td>
        <ButtonTooltip tip="Download" fnClick={downloadProfile} place="bottom" fa="fa-download" />&nbsp;
        <ButtonTooltip tip="Edit" fnClick={editProfile} place="bottom" fa="fa-pencil-square-o" />&nbsp;
        {renderDeleteButton(deleteProfile)}

      </td>
      <td>{title}</td>
      <td>{description}</td>
      <td>{header['DATA TYPE']}</td>
      <td>{header['DATA CLASS']}</td>
      <td>{header.XUNITS}</td>
      <td>{header.YUNITS}</td>
      <td><code className="mr-2">{id}</code></td>
    </tr>
  );
};

export default ProfileListItem;
