import React from 'react';
import {OverlayTrigger, Button, Tooltip} from 'react-bootstrap';

import PermissionStore from '../stores/PermissionStore';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTopSecret: false
    }
  }

  componentDidMount() {
    PermissionStore.listen(this.onPermissionChange.bind(this));
  }

  componentWillUnmount() {
    PermissionStore.unlisten(this.onPermissionChange.bind(this));
  }

  onPermissionChange(state) {
    this.setState({
      isTopSecret: state.is_top_secret
    })
  }

  handleModalShow() {
    this.props.onClick("share")
  }


  render() {
    const {isDisabled} = this.props

    const tooltip = (<Tooltip id="export_button">Share elements</Tooltip>)

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="info" id="share-btn" disabled={isDisabled}
                onClick={() => this.handleModalShow()}>
          <i className="fa fa-share-alt"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

ShareButton.propTypes = {
  isDisabled: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
