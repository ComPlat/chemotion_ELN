import React from 'react';
import {Button} from 'react-bootstrap';

import PermissionStore from '../stores/PermissionStore';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTopSecret: false
    }

    this.onPermissionChange = this.onPermissionChange.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
  }

  componentDidMount() {
    PermissionStore.listen(this.onPermissionChange);
  }

  componentWillUnmount() {
    PermissionStore.unlisten(this.onPermissionChange);
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

    return (
      <Button bsStyle="info" id="share-btn" disabled={isDisabled}
              onClick={this.handleModalShow}>
        <i className="fa fa-share-alt"></i>
      </Button>
    )
  }
}

ShareButton.propTypes = {
  isDisabled: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
