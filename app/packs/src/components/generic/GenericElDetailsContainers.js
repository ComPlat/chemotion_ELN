/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-array-index-key */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Badge, Button } from 'react-bootstrap';
import Container from 'src/models/Container';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import GenericContainerSet from 'src/components/generic/GenericContainerSet';

export default class GenericElDetailsContainers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeContainer: 0
    };
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleSpChange = this.handleSpChange.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
  }

  componentDidMount() {
    const { genericEl } = this.props;
    TextTemplateActions.fetchTextTemplates(genericEl.type);
  }

  handleChange() {
    const { genericEl, handleElChanged } = this.props;
    handleElChanged(genericEl);
  }

  handleSpChange(genericEl, cb) {
    const { handleElChanged } = this.props;
    handleElChanged(genericEl);
    cb();
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  handleAdd() {
    const { genericEl, handleElChanged } = this.props;
    const container = Container.buildEmpty();
    container.container_type = 'analysis';
    container.extended_metadata.content = { ops: [{ insert: '' }] };

    if (genericEl.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      genericEl.container.children.push(analyses);
    }

    genericEl.container.children
      // eslint-disable-next-line no-bitwise
      .filter((element) => ~element.container_type.indexOf("analyses"))[0]
      .children.push(container);

    const newKey = genericEl.container.children.filter(
      // eslint-disable-next-line no-bitwise
      (element) => ~element.container_type.indexOf('analyses')
    )[0].children.length - 1;

    this.handleAccordionOpen(newKey);
    handleElChanged(genericEl);
  }

  handleRemove(container) {
    const { genericEl, handleElChanged } = this.props;
    container.is_deleted = true;
    handleElChanged(genericEl);
  }

  handleUndo(container) {
    const { genericEl, handleElChanged } = this.props;
    container.is_deleted = false;
    handleElChanged(genericEl);
  }

  addButton() {
    const { readOnly } = this.props;
    if (!readOnly) {
      return (
        <div className="mt-2">
          <Button size="sm" variant="success" onClick={this.handleAdd}>
            <i className="fa fa-plus" aria-hidden="true" />
            &nbsp; Add analysis
          </Button>
        </div>
      );
    }
    return null;
  }

  renderNoAct(genericEl, readOnly) {
    const { linkedAis, handleSubmit } = this.props;
    if (linkedAis.length < 1) return null; // if layer has no linked analyses
    if (genericEl.container != null) {
      const analysesContainer = genericEl.container.children.filter(
        // eslint-disable-next-line no-bitwise
        (element) => ~element.container_type.indexOf("analyses")
      );
      if (analysesContainer.length === 1 && analysesContainer[0].children.length > 0) {
        return (
          <div className="gen_linked_container_group">
            <h4><Badge bg="dark">Linked Analyses</Badge></h4>
            <div className="mb-2 me-1 d-flex justify-content-between align-items-center">
              <GenericContainerSet
                ae={analysesContainer}
                readOnly={readOnly}
                generic={genericEl}
                fnChange={this.handleChange}
                fnUndo={this.handleUndo}
                fnRemove={this.handleRemove}
                noAct
                linkedAis={linkedAis}
                handleSubmit={handleSubmit}
              />
            </div>
          </div>
        );
      }
      return null;
    }
    return null;
  }

  render() {
    const {
      genericEl, readOnly, noAct, handleSubmit
    } = this.props;
    const { activeContainer } = this.state;

    if (noAct) return this.renderNoAct(genericEl, readOnly);

    if (genericEl.container != null && genericEl.container.children) {
      const analysesContainer = genericEl.container.children.filter(
        // eslint-disable-next-line no-bitwise
        (element) => ~element.container_type.indexOf("analyses")
      );
      if (analysesContainer.length === 1 && analysesContainer[0].children.length > 0) {
        return (
          <div>
            <div className="mb-2 me-1 d-flex justify-content-end">
              {this.addButton()}
            </div>
            <GenericContainerSet
              ae={analysesContainer}
              readOnly={readOnly}
              generic={genericEl}
              fnChange={this.handleChange}
              fnSelect={this.handleAccordionOpen}
              fnUndo={this.handleUndo}
              fnRemove={this.handleRemove}
              handleSubmit={handleSubmit}
              activeKey={activeContainer}
            />
          </div>
        );
      }
      return (
        <div className="d-flex align-items-center justify-content-between mb-2 mt-4 mx-3">
          <span className="ms-3"> There are currently no Analyses. </span>
          <div>{this.addButton()}</div>
        </div>
      );
    }
    return (
      <div className="d-flex align-items-center justify-content-between mb-2 mt-4 mx-3">
        <span className="ms-3"> There are currently no Analyses. </span>
        <div>{this.addButton()}</div>
      </div>
    );
  }
}

GenericElDetailsContainers.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  genericEl: PropTypes.object.isRequired,
  handleElChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  noAct: PropTypes.bool,
  linkedAis: PropTypes.array
};
GenericElDetailsContainers.defaultProps = { noAct: false, linkedAis: [] };
