import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function HeaderCommentSection(props) {
  const { showCommentSection, headerSection } = props;
  const selectedComments = props.getSectionComments(headerSection);

  return (
    <span>
      <OverlayTrigger
        key="ot_comments"
        placement="top"
        overlay={<Tooltip id="showComments">Show/Add Comments</Tooltip>}
      >
        <Button
          bsStyle={selectedComments && selectedComments.length > 0 ? 'success' : 'default'}
          onClick={() => {
            props.setCommentSection(headerSection);
            props.toggleCommentModal(true);
          }}
        >
          <i className="fa fa-comments" />&nbsp;
          Comments
        </Button>
      </OverlayTrigger>
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="toggleComments">Show/Hide Comments</Tooltip>}
      >
        <Button
          bsSize="xsmall"
          // bsStyle="primary"
          onClick={props.toggleCommentSection}
          style={{ marginLeft: 5 }}
        >
          <span>
            <i className={showCommentSection ? 'fa fa-angle-down' : 'fa fa-angle-up'} />
          </span>
        </Button>
      </OverlayTrigger>
    </span>
  );
}


HeaderCommentSection.propTypes = {
  showCommentSection: PropTypes.bool.isRequired,
  headerSection: PropTypes.string,
  getSectionComments: PropTypes.func.isRequired,
  setCommentSection: PropTypes.func.isRequired,
  toggleCommentModal: PropTypes.func.isRequired,
  toggleCommentSection: PropTypes.func.isRequired,
};

HeaderCommentSection.defaultProps = {
  headerSection: 'sample_header',
};
