import React, { Component } from 'react';
import { Modal } from 'react-bootstrap';
import LoadingStore from '../stores/LoadingStore';

export default class LoadingModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...LoadingStore.getState(),
    };

    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    LoadingStore.listen(this.onChange);
  }

  componentWillUnmount() {
    LoadingStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  render() {
    const { loading } = this.state;

    return (
      <Modal className="loading-modal" animation show={loading}>
        <i className="fa fa-refresh fa-spin fa-3x fa-fw" />
      </Modal>
    );
  }
}
