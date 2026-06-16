import React from 'react';

import { ButtonToolbar } from 'react-bootstrap';

import DetailCardButton from 'src/apps/mydb/elements/details/DetailCardButton';

export default function HeaderCommentSection() {
  return (
    <ButtonToolbar>
      <DetailCardButton
        key="comments-button"
        label="Show/Add Comments"
        iconClass="fa fa-comments"
        active
        header
      />
      <DetailCardButton
        key="toggle-button"
        label="Show/Hide Section Comments"
        iconClass="fa fa-angle-down"
        header
      />
    </ButtonToolbar>
  );
}
