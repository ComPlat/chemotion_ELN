import React from 'react';
import PropTypes from 'prop-types';
import FreeScanDataContainer from './FreeScanDataContainer';

import Container from '../models/Container';



export default class FreeScanBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      modal: {
        show: false,
        datasetContainer: null
      }
    };
  }

  handleFileModalOpen(datasetContainer) {
    const { modal } = this.state;
    modal.datasetContainer = datasetContainer;
    modal.show = true;
    this.setState({ modal });
  }

  handleFileModalHide() {
    const { modal } = this.state;
    modal.datasetContainer = null;
    modal.show = false;
    this.setState({ modal });
  }

  handleUploadButton() {
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';
    this.handleFileModalOpen(datasetContainer);
  }

  render() {
    const { unsorted_box, largerInbox } = this.props;
    const { visible, modal } = this.state;
    const attachments = visible ? unsorted_box.map((attachment) => {
      return (
        <FreeScanDataContainer
          key={`free_scan_${attachment.id}`}
          attachment={attachment}
        />
      );
    })
      :
    <div />;

    const folderClass = `fa fa-folder${visible ? '-open' : ''}`;

    return (
      <div className="tree-view">
        <div className="title">
          <i
            className={folderClass}
            aria-hidden="true"
            onClick={() => this.setState({ visible: !visible })}
          > Free Scan Data
          </i>
          {' '}
        </div>
        <div> {attachments} </div>
      </div>
    );
  }
}

FreeScanBox.propTypes = {
  unsorted_box: PropTypes.array.isRequired,
  largerInbox: PropTypes.bool
};

FreeScanBox.defaultProps = {
  largerInbox: false
};
