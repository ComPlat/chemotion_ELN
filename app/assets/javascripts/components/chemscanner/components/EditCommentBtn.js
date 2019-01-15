import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Popover, FormControl } from 'react-bootstrap';

export default class EditCommentBtn extends React.Component {
  constructor() {
    super();

    this.onChangeComment = this.onChangeComment.bind(this);
  }

  onChangeComment() {
    const comment = this.commentRef.value;

    const {
      onChangeComment, cdUid, itemId
    } = this.props;
    onChangeComment(cdUid, itemId, comment);
  }

  render() {
    const {
      comment, cdUid, itemId
    } = this.props;

    const commentPopover = (
      <Popover id={`${cdUid}-${itemId}-comment`} title="Comment">
        <FormControl
          componentClass="textarea"
          defaultValue={comment}
          inputRef={(r) => { this.commentRef = r; }}
          rows={6}
        />
      </Popover>
    );

    return (
      <div>
        <OverlayTrigger
          trigger="click"
          placement="left"
          rootClose
          onExit={this.onChangeComment}
          overlay={commentPopover}
          container={this}
        >
          <button type="button" className="clipboardBtn right-btn btn btn-xs">
            <i className="fa fa-comment" />
          </button>
        </OverlayTrigger>
      </div>
    );
  }
}

EditCommentBtn.propTypes = {
  onChangeComment: PropTypes.func.isRequired,
  comment: PropTypes.string.isRequired,
  itemId: PropTypes.number.isRequired,
  cdUid: PropTypes.string.isRequired,
};
