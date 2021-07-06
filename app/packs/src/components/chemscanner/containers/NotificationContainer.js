import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Alert } from 'react-bootstrap';

import { scanFile } from '../actions/fileActions';
import * as types from '../actions/ActionTypes';

class Notification extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      show: !(props.notification.trim() === '')
    };

    this.handleDismiss = this.handleDismiss.bind(this);
  }

  componentWillReceiveProps(newProps) {
    this.setState({
      show: !(newProps.notification.trim() === '')
    });
  }

  handleDismiss() {
    this.setState({ show: false });
  }

  render() {
    const { notification } = this.props;
    const { show } = this.state;

    if (!show) return <span />;

    return (
      <Alert
        bsStyle="danger"
        className="chemscanner-alert-notification"
        onDismiss={this.handleDismiss}
      >
        {notification}
      </Alert>
    );
  }
}

Notification.propTypes = {
  notification: PropTypes.string
};

Notification.defaultProps = {
  notification: ''
};

const NotificationContainer = props => <Notification {...props} />;

const mapStateToProps = state => ({
  notification: state.get('ui').get('notification'),
});

const mapDispatchToProps = dispatch => ({
  scanFile: (files, getMol) => {
    dispatch({ type: types.SET_LOADING });
    dispatch(scanFile(files, getMol)).then(() => dispatch({
      type: types.UNSET_LOADING
    }));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotificationContainer);
