import React, { Component } from 'react';
import { ProgressBar } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import LoadingStore from 'src/stores/alt/stores/LoadingStore';

export default class ProgressModal extends Component {
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
    const { loadingWithProgress, filePool } = this.state;

    const progressValue = [];
    if (filePool) {
      filePool.forEach((file) => {
        const item = (
          <div key={file.filename}>
            <i>
              Uploading
              {' '}
              {file.filename}
            </i>
            <ProgressBar animated now={file.progress * 100} />
          </div>
        );
        progressValue.push(item);
      });
    }

    return (
      <AppModal
        title="Uploading"
        show={loadingWithProgress}
        showFooter={false}
      >
        {progressValue}
      </AppModal>
    );
  }
}
