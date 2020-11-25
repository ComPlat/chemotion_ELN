import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PanelGroup, Panel, Button } from 'react-bootstrap';
import Container from '../models/Container';
import ContainerComponent from '../ContainerComponent';
import PrintCodeButton from '../common/PrintCodeButton';

export default class GenericElDetailsContainers extends Component {
  constructor(props) {
    super();
    const { genericEl } = props;
    this.state = {
      genericEl,
      activeContainer: 0
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      genericEl: nextProps.genericEl
    })
  }

  handleChange() {
    const { genericEl } = this.state;
    this.props.parent.handleGenericElChanged(genericEl);
  }

  handleAdd() {
    const { genericEl } = this.state;
    const container = Container.buildEmpty();
    container.container_type = 'analysis';

    genericEl.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey = genericEl.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    this.props.parent.setState({ genericEl });
  }

  handleRemove(container) {
    const { genericEl } = this.state;
    container.is_deleted = true;
    this.props.parent.setState({ genericEl });
  }

  handleUndo(container) {
    const { genericEl } = this.state;
    container.is_deleted = false;
    this.props.parent.setState({ genericEl });
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
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

  render() {
    const { genericEl, activeContainer } = this.state;
    const { readOnly } = this.props;

    const containerHeader = container => (
      <p style={{ width: '100%' }}>
        {container.name}
        {(container.extended_metadata['kind'] && container.extended_metadata['kind'] !== '') ?
          (` - Type: ${container.extended_metadata['kind'].split('|')[1] || container.extended_metadata['kind']}`) : ''}
        {(container.extended_metadata['status'] && container.extended_metadata['status'] !== '') ? (` - Status: ${container.extended_metadata['status']}`) : ''}
        <Button
          bsSize="xsmall"
          bsStyle="danger"
          className="button-right"
          disabled={readOnly}
          onClick={() => { if (confirm('Delete the container?')) { this.handleRemove(container); } }}
        >
          <i className="fa fa-trash" />
        </Button>
        {/* <PrintCodeButton element={genericEl} analyses={[container]} ident={container.id} /> */}
      </p>
    );

    const containerHeaderDeleted = container => (
      <p style={{ width: '100%' }}>
        <strike>{container.name}
          {(container.extended_metadata['kind'] && container.extended_metadata['kind'] !== '') ?
          (` - Type: ${container.extended_metadata['kind'].split('|')[1] || container.extended_metadata['kind']}`) : ''}
          {(container.extended_metadata['status'] && container.extended_metadata['status'] !== '') ? (` - Status: ${container.extended_metadata['status']}`) : ''}
        </strike>
        <Button className="pull-right" bsSize="xsmall" bsStyle="danger" onClick={() => this.handleUndo(container)}>
          <i className="fa fa-undo" />
        </Button>
      </p>);

    if (genericEl.container != null) {
      var analyses_container = genericEl.container.children.filter(element => ~element.container_type.indexOf('analyses'));

      if (analyses_container.length === 1 && analyses_container[0].children.length > 0) {
        return (
          <div>
            <p>&nbsp;{this.addButton()}</p>
            <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
              {analyses_container[0].children.map((container, key) => {
                if (container.is_deleted) {
                  return (
                    <Panel eventKey={key} key={key}>
                      <Panel.Heading>{containerHeaderDeleted(container)}</Panel.Heading>
                    </Panel>
                      );
                    }
                  return (
                    <Panel eventKey={key} key={key} onClick={() => this.handleAccordionOpen(key)}>
                      <Panel.Heading>{containerHeader(container)}</Panel.Heading>
                      <Panel.Body collapsible="true">
                        <ContainerComponent
                          readOnly={readOnly}
                          container={container}
                          onChange={c => this.handleChange(c)}
                        />
                      </Panel.Body>
                    </Panel>
                  );
                }
              )}
            </PanelGroup>
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
  genericEl: PropTypes.object,
};
