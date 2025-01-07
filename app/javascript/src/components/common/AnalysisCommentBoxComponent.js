import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Form,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';

function CommentButton({ toggleCommentBox, size }) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="analysisCommentBox">General remarks related to all analytical data</Tooltip>}
    >
      <Button
        size={size}
        variant="primary"
        onClick={toggleCommentBox}
      >
        Add comment
      </Button>
    </OverlayTrigger>
  );
}

CommentButton.propTypes = {
  toggleCommentBox: PropTypes.func.isRequired,
  size: PropTypes.string.isRequired,
};

function CommentBox({ isVisible, value, handleCommentTextChange }) {
  return isVisible && (
    <Form.Group>
      <Form.Control
        as="textarea"
        style={{ height: '50px' }}
        value={value}
        onChange={handleCommentTextChange}
        className="my-3"
        placeholder="Add a comment here"
      />
    </Form.Group>
  );
}

CommentBox.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  value: PropTypes.string.isRequired,
  handleCommentTextChange: PropTypes.func.isRequired,
};

export {
  CommentBox,
  CommentButton
};
