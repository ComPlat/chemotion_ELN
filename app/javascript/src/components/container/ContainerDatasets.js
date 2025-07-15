/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import ContainerDatasetModal from 'src/components/container/ContainerDatasetModal';
import ContainerDatasetField from 'src/components/container/ContainerDatasetField';
import Container from 'src/models/Container';
import AttachmentDropzone from 'src/components/container/AttachmentDropzone';

export default class ContainerDatasets extends Component {
  constructor(props) {
    super(props);
    const { container } = props;
    this.state = {
      container,
      modal: {
        show: false,
        datasetContainer: null,
        selectedIndex: null,
      },
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.container !== prevProps.container) {
      this.setState({
        container: this.props.container,
      });
    }
  }

  handleModalOpen(datasetContainer, index) {
    const { modal } = this.state;
    modal.datasetContainer = datasetContainer || {};
    modal.show = true;
    modal.selectedIndex = index;
    this.setState({ modal });
  }

  handleAdd() {
    const { container, modal } = this.state;
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    container.children.push(datasetContainer);
    const index = container.children.length - 1;
    this.handleModalOpen(datasetContainer, index);
  }

  handleAddWithAttachments(attachments) {
    const { container } = this.state;
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    attachments.forEach((attachment) => {
      datasetContainer.attachments.push(attachment);
    });
    container.children.push(datasetContainer);
    let index = container.children.length - 1;
    this.handleModalOpen(datasetContainer, index);
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

    this.props.onChange(container);
  }

  handleModalHide() {
    const { modal } = this.state;
    modal.show = false;
    modal.datasetContainer = null;
    // modal.selectedIndex = null;
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

  updateContainerState(updatedContainer, shouldClose = false) {
    const { rootContainer, index } = this.props;
    const { modal } = this.state;
    const { datasetContainer } = modal;
    const newChild = updatedContainer?.children?.[0]?.children?.[index];
    if (!newChild || !rootContainer?.children?.[0]) {
      console.log("Invalid container structure");
      return;
    }
    const updatedRoot = { ...rootContainer };
    updatedRoot.children[0].children[index] = newChild;
    if (!shouldClose) {
      const container = updatedContainer.children[0].children[index];
      const selectedIndex = modal?.selectedIndex;
      const attachments = container?.children?.[selectedIndex]?.attachments || [];

      this.setState({
        container,
        modal: {
          ...modal,
          datasetContainer: {
            ...modal.datasetContainer,
            attachments,
          },
        }
      });
    }
    this.props.onChange(updatedRoot);
  }

  render() {
    const { container, modal } = this.state;
    const { disabled, readOnly, rootContainer, } = this.props;
    if (container.children.length > 0) {
      const kind = container.extended_metadata && container.extended_metadata.kind;
      return (
        <div>
          <div className="border rounded p-2 mb-2">
            <div className="list-group">
              {container.children.map((datasetContainer, key) => (
                <div key={key} className="list-group-item" >
                  <ContainerDatasetField
                    kind={kind}
                    datasetContainer={datasetContainer}
                    onChange={() => this.handleChange(datasetContainer)}
                    handleRemove={() => this.handleRemove(datasetContainer)}
                    handleUndo={() => this.handleUndo(datasetContainer)}
                    handleModalOpen={() => this.handleModalOpen(datasetContainer, key)}
                    disabled={disabled}
                    readOnly={readOnly}
                  />
                </div>
              ))}
              <div key="attachmentdropzone" className="list-group-item" >
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
              rootContainer={rootContainer}
              updateContainerState={(cont, shouldClose) => this.updateContainerState(cont, shouldClose)}
              isContainerNew={container?.is_new}
            />
          )}
        </div>
      );
    }
    return (
      <div className='bg-gray-200'>
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
  rootContainer: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
};

ContainerDatasets.defaultProps = {
  readOnly: false,
  disabled: false,
};
