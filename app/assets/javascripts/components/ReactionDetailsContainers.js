import React, {Component} from 'react';
import {PanelGroup, Panel, Button} from 'react-bootstrap';
import Container from './models/Container';
import ContainerComponent from './ContainerComponent';
import PrintCodeButton from './common/PrintCodeButton'

export default class ReactionDetailsContainers extends Component {
  constructor(props) {
    super();
    const {reaction} = props;
    this.state = {
      reaction,
      activeContainer: 0
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleOnClickRemove = this.handleOnClickRemove.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      reaction: nextProps.reaction,
    });
  }

  handleChange(container) {
    const { reaction } = this.state;

    this.props.parent.handleReactionChange(reaction);
  }

  handleUndo(container) {
    let {reaction} = this.state;
    container.is_deleted = false;

    this.props.parent.setState({reaction: reaction})
  }

  handleAdd() {
    const { reaction } = this.state;
    const container = Container.buildEmpty();
    container.container_type = 'analysis';
    container.extended_metadata.content = { ops: [{ insert: '' }] };

    reaction.container.children.filter(element => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.push(container);

    const newKey = reaction.container.children.filter(element => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    this.props.parent.setState({ reaction: reaction });
  }

  handleOnClickRemove(container) {
    if (confirm('Delete the container?')) {
      this.handleRemove(container);
    }
  }

  handleRemove(container) {
    let { reaction } = this.state;

    container.is_deleted = true;

    this.props.parent.setState({ reaction: reaction });
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  addButton() {
    const { readOnly } = this.props;
    if (!readOnly) {
      return (
        <Button
          className="button-right"
          bsSize="xsmall"
          bsStyle="success"
          onClick={this.handleAdd}
        >
          Add analysis
        </Button>
      );
    }

    return (<span />);
  }

  render() {
    const {reaction, activeContainer} = this.state;
    const {readOnly} = this.props;

    let handleOnClickRemove = this.handleOnClickRemove;
    let containerHeader = (container) => {
      const kind = container.extended_metadata['kind'] && container.extended_metadata['kind'] != '';
      const titleKind = kind ? (' - Type: ' + container.extended_metadata['kind']) : '';

      const status = container.extended_metadata['status'] && container.extended_metadata['status'] != '';
      const titleStatus = status ? (' - Status: ' + container.extended_metadata['status']) : '';

      return (
        <div style={{width: '100%'}}>
          {container.name}
          {titleKind}
          {titleStatus}
          <Button
            bsSize="xsmall"
            bsStyle="danger"
            className="button-right"
            disabled={readOnly}
            onClick={handleOnClickRemove}
          >
            <i className="fa fa-trash" />
          </Button>
          <PrintCodeButton element={reaction} analyses={[container]} ident={container.id} />
        </div>
      )
    };

    let handleUndo = this.handleUndo;
    let containerHeaderDeleted = (container) => {
      const kind = container.extended_metadata['kind'] && container.extended_metadata['kind'] != '';
      const titleKind = kind ? (' - Type: ' + container.extended_metadata['kind']) : '';

      const status = container.extended_metadata['status'] && container.extended_metadata['status'] != '';
      const titleStatus = status ? (' - Status: ' + container.extended_metadata['status']) : '';

      return (
        <div style={{width: '100%'}}>
          <strike>
            {container.name}
            {titleKind}
            {titleStatus}
          </strike>
          <Button className="pull-right" bsSize="xsmall" bsStyle="danger"
                  onClick={handleUndo}>
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      )
    };

    if (reaction.container != null && reaction.container.children) {
      const analyses_container = reaction.container.children.filter(element => (
        ~element.container_type.indexOf('analyses')
      ));

      if (analyses_container.length === 1 && analyses_container[0].children.length > 0) {
        return (
          <div>
            <div style={{ marginBottom: '10px' }}>
              &nbsp;{this.addButton()}
            </div>
            <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
              {analyses_container[0].children.map((container, key) => {
                if (container.is_deleted) {
                  return (
                    <Panel
                      header={containerHeaderDeleted(container)}
                      eventKey={key}
                      key={`reaction_container_deleted_${container.id}`}
                    />
                  );
                }

                return (
                  <Panel
                    header={containerHeader(container)}
                    eventKey={key}
                    key={`reaction_container_${container.id}`}
                    onClick={this.handleAccordionOpen.bind(this, key)}
                  >
                    <ContainerComponent
                      readOnly={readOnly}
                      container={container}
                      onChange={this.handleChange.bind(this, container)}
                    />
                  </Panel>
                );
              })}
            </PanelGroup>
          </div>
        );
      }

      return (
        <div
          style={{ marginBottom: '10px' }}
          className="noAnalyses-warning"
        >
          There are currently no Analyses.
          {this.addButton()}
        </div>
      );
    }

    return (
      <div className="noAnalyses-warning">
        There are currently no Analyses.
      </div>
    );
  }
}

ReactionDetailsContainers.propTypes = {
  readOnly: React.PropTypes.bool,
  parent: React.PropTypes.object,
};
