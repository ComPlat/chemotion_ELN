/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-array-index-key */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import Container from 'src/models/Container';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import GenericContainerGroup from './GenericContainerGroup';

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
    TextTemplateActions.fetchTextTemplates(this.props.genericEl.type);
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

    genericEl.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey = genericEl.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

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
        <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
          Add analysis
        </Button>
      );
    }
    return <div />;
  }

  renderNoAct(genericEl, readOnly) {
    const { linkedAis, handleSubmit } = this.props;
    if (linkedAis.length < 1) return null; // if layer has no linked analyses
    if (genericEl.container != null) {
      const analysesContainer = genericEl.container.children.filter(element => ~element.container_type.indexOf('analyses'));
      if (analysesContainer.length === 1 && analysesContainer[0].children.length > 0) {
        return (
          <div className="gen_linked_container_group">
            <h5>Linked Analyses</h5>
            <GenericContainerGroup
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
    if (noAct) return this.renderNoAct(genericEl, readOnly);
    if (genericEl.container != null) {
      const analysesContainer = genericEl.container.children.filter(element => ~element.container_type.indexOf('analyses'));
      if (analysesContainer.length === 1 && analysesContainer[0].children.length > 0) {
        return (
          <div>
            <p>&nbsp;{this.addButton()}</p>
            <GenericContainerGroup
              ae={analysesContainer}
              readOnly={readOnly}
              generic={genericEl}
              fnChange={this.handleChange}
              fnUndo={this.handleUndo}
              fnRemove={this.handleRemove}
              handleSubmit={handleSubmit}
            />
          </div>
        );
      }
      return (
        <div>
          <p className="noAnalyses-warning">
            There are currently no Analyses.
            {this.addButton()}
          </p>
        </div>
      );
    }
    return (
      <div>
        <p className="noAnalyses-warning">
          There are currently no Analyses.
        </p>
      </div>
    );
  }
}

GenericElDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  parent: PropTypes.object,
  genericEl: PropTypes.object.isRequired,
  handleElChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  noAct: PropTypes.bool,
  linkedAis: PropTypes.array
};
GenericElDetailsContainers.defaultProps = { noAct: false, linkedAis: [] };
