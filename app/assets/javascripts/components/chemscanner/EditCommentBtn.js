import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { OverlayTrigger, Popover, FormControl } from 'react-bootstrap';

export default class EditCommentBtn extends React.Component {
  constructor() {
    super();

    this.onChangeComment = this.onChangeComment.bind(this);
  }

  onChangeComment() {
    const comment = ReactDOM.findDOMNode(this.commentRef).value;

    const { onChangeComment, id } = this.props;
    const { uid, cdIdx, idx } = id;
    onChangeComment(uid, cdIdx, idx, comment);
  }

  render() {
    const { comment, id } = this.props;
    const { uid, cdIdx, idx } = id;

    const commentPopover = (
      <Popover id={`${uid}-${cdIdx}-${idx}-comment`} title="Comment">
        <FormControl
          componentClass="textarea"
          defaultValue={comment}
          ref={(r) => { this.commentRef = r; }}
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
          <button type="button" className="clipboardBtn remove-btn btn btn-xs">
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
  id: PropTypes.object.isRequired,
};

EditCommentBtn.defaultProps = {
  comment: ""
};
