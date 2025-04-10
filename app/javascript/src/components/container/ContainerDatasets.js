/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import ContainerDatasetModal from 'src/components/container/ContainerDatasetModal';
import ContainerDatasetField from 'src/components/container/ContainerDatasetField';
import Container from 'src/models/Container';
import AttachmentDropzone from 'src/components/container/AttachmentDropzone';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';

export default class ContainerDatasets extends Component {
  constructor(props) {
    super(props);
    const { container } = props;
    this.state = {
      container,
      modal: {
        show: false,
        datasetContainer: null,
      },
      datasetIndex: null
    };
    this.updateContainerUpload = this.updateContainerUpload.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.container !== prevProps.container) {
      this.setState({
        container: this.props.container,
      });
    }
  }

  handleModalOpen(datasetContainer) {
    const { modal } = this.state;
    modal.datasetContainer = datasetContainer || {};
    modal.show = true;
    this.setState({ modal });
  }

  handleAdd() {
    const { container } = this.state;
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    container.children.push(datasetContainer);
    this.setState({
      datasetIndex: container.children.length - 1
    });
    this.handleModalOpen(datasetContainer);
    this.props.onChange(container);
  }

  handleAddWithAttachments(attachments) {
    const { container } = this.state;
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    attachments.forEach((attachment) => {
      datasetContainer.attachments.push(attachment);
    });
    container.children.push(datasetContainer);

    this.handleModalOpen(datasetContainer);
    this.props.onChange(container);
  }

  handleRemove(datasetContainer) {
    const { container } = this.state;

    datasetContainer.is_deleted = true;
    this.props.onChange(container);
  }

  handleUndo(datasetContainer) {
    const { container } = this.state;

    datasetContainer.is_deleted = false;
    this.props.onChange(container);
  }

  handleChange(datasetContainer) {
    const { container } = this.state;

    container.children.find((dataset) => {
      if (dataset.id === datasetContainer.id) {
        const datasetId = container.children.indexOf(dataset);
        container.children[datasetId] = datasetContainer;
      }
    });
    this.updateContainerUpload(container);
    this.props.onChange(container);
  }

  handleModalHide() {
    const { modal } = this.state;
    modal.show = false;
    modal.datasetContainer = null;
    this.setState({ modal });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  addButton() {
    const { readOnly, disabled } = this.props;
    
    if (!readOnly && !disabled) {
      return (
        <div className="d-flex justify-content-end mt-2 mb-0">
          <Button size="sm" variant="success" onClick={() => this.handleAdd()}>
            <i className="fa fa-plus" />
          </Button>
        </div>
      );
    }
    return null;
  }

  updateContainerUpload(container) {
    console.log('Logging Reference: ', this.constructor.name, this.state.datasetIndex);
    // ?.maps(a => console.log(a.is_pending));
    const reactionFiles = AttachmentFetcher.getFileListfrom(container);
    if (reactionFiles.length > 0) {
      const tasks = [];
      reactionFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      Promise.all(tasks).then(() => {
        fetch('/api/v1/containers/container/me', {
          method: 'Put',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            container
          })
        })
          .then((response) => response.json())
          .then((data) => {
            console.log('Container updated successfully:', data);
            const { children } = container;
            console.log("Data here: ", this.state.datasetIndex)
            const cont = children[this.state.datasetIndex]?.attachments.map((a) => ({
              ...a,
              ...(a.hasOwnProperty('is_pending') && { is_pending: false }),
            }));
            container.children[this.state.datasetIndex].attachments = cont;
            this.setState({ container });
          })
          .catch((error) => {
            console.error('Error updating container:', error);
          });
      });
    }
  }

  render() {
    const { container, modal } = this.state;
    const { disabled, readOnly } = this.props;

    if (container.children.length > 0) {
      const kind = container.extended_metadata && container.extended_metadata.kind;
      return (
        <div>
          <div className="border rounded p-2 mb-2">
            <div className="list-group">
              {container.children.map((datasetContainer, key) => (
                <div key={key} className="list-group-item">
                  <ContainerDatasetField
                    kind={kind}
                    datasetContainer={datasetContainer}
                    onChange={() => this.handleChange(datasetContainer)}
                    handleRemove={() => this.handleRemove(datasetContainer)}
                    handleUndo={() => this.handleUndo(datasetContainer)}
                    handleModalOpen={() => {
                      console.log({ key });
                      this.handleModalOpen(datasetContainer),
                        this.setState({ datasetIndex: key });
                    }}
                    disabled={disabled}
                    readOnly={readOnly}
                  />
                </div>
              ))}
              <div key="attachmentdropzone" className="list-group-item">
                <AttachmentDropzone
                  handleAddWithAttachments={(attachments) => this.handleAddWithAttachments(attachments)}
                />
              </div>
            </div>
            {this.addButton()}
          </div>
          {modal.show && modal.datasetContainer && (
            <ContainerDatasetModal
              onHide={() => this.handleModalHide()}
              onChange={(datasetContainer) => this.handleChange(datasetContainer)}
              kind={kind}
              show={modal.show}
              readOnly={this.props.readOnly}
              datasetContainer={modal.datasetContainer}
              analysisContainer={modal.analysisContainer}
              disabled={disabled}
            />
          )}
        </div>
      );
    }
    return (
      <div className="bg-gray-200">
        <div className="border rounded p-2 mb-2">
          <p>There are currently no Datasets.</p>
          <div className="list-group">
            <div key="attachmentdropzone" className="list-group-item">
              <AttachmentDropzone
                handleAddWithAttachments={(attachments) => this.handleAddWithAttachments(attachments)}
              />
            </div>
          </div>
          {this.addButton()}
        </div>
      </div>
    );
  }
}

ContainerDatasets.propTypes = {
  container: PropTypes.object.isRequired,
  reaction: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
};

ContainerDatasets.defaultProps = {
  readOnly: false,
  disabled: false,
  reaction: null
};
