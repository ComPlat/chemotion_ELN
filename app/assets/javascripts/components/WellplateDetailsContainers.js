import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {PanelGroup, Panel, Button, Row, Col} from 'react-bootstrap';
import Container from './models/Container';
import ContainerComponent from './ContainerComponent';
import PrintCodeButton from './common/PrintCodeButton'

export default class WellplateDetailsContainers extends Component {
  constructor(props) {
    super();
    const {wellplate} = props;
    this.state = {
      wellplate,
      activeContainer: 0
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      wellplate: nextProps.wellplate
    })
  }

  handleChange(container) {
    const {wellplate} = this.state
    this.props.parent.handleWellplateChanged(wellplate)
  }

  handleAdd() {
    const {wellplate} = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";

    wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey = wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    this.props.parent.setState({wellplate: wellplate})
  }

  handleRemove(container) {
    let {wellplate} = this.state;
    container.is_deleted = true;

    this.props.parent.setState({wellplate: wellplate})
  }

  handleUndo(container) {
    let {wellplate} = this.state;
    container.is_deleted = false;

    this.props.parent.setState({wellplate: wellplate})
  }

  handleAccordionOpen(key) {
    this.setState({activeContainer: key});
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
          <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            Add analysis
          </Button>
      )
    }
  }

  render() {
    const {wellplate, activeContainer} = this.state;
    const {readOnly} = this.props;

    let containerHeader = (container) => <div style={{width: '100%'}}>
        {container.name}
        {(container.extended_metadata['kind'] &&
           container.extended_metadata['kind'] != '')
        ? (` - Type: ${container.extended_metadata['kind'].split('|')[1] || container.extended_metadata['kind']}`) : ''}
        {(container.extended_metadata['status'] &&
           container.extended_metadata['status'] != '')
           ? (' - Status: ' + container.extended_metadata['status']) :''}
        <Button bsSize="xsmall" bsStyle="danger"
           className="button-right" disabled={readOnly}
          onClick={() => {if(confirm('Delete the container?')) {
            this.handleRemove(container)}}}>
          <i className="fa fa-trash"></i>
        </Button>
        <PrintCodeButton element={wellplate} analyses={[container]}
          ident={container.id}/>
      </div>

      let containerHeaderDeleted = (container) => <p style={{width: '100%'}}><strike>{container.name}
        {(container.extended_metadata['kind'] &&
            container.extended_metadata['kind'] != '')
          ? (` - Type: ${container.extended_metadata['kind'].split('|')[1] || container.extended_metadata['kind']}`) : ''}
        {(container.extended_metadata['status'] && container.extended_metadata['status'] != '') ? (' - Status: ' + container.extended_metadata['status']) :''}
        </strike>
        <Button className="pull-right" bsSize="xsmall" bsStyle="danger" onClick={() => this.handleUndo(container)}>
          <i className="fa fa-undo"></i>
        </Button>
        </p>

    if(wellplate.container != null){

      var analyses_container = wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'));

      if(analyses_container.length == 1 && analyses_container[0].children.length > 0){
        return (
          <div>
          <p>&nbsp;{this.addButton()}</p>
          <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
          {analyses_container[0].children.map((container, key) => {
            if (container.is_deleted){
              return (
                <Panel eventKey={key}
                    key={key} >
                      <Panel.Heading>{containerHeaderDeleted(container)}</Panel.Heading>
                </Panel>
                  );
                }else {
              return (
                <Panel eventKey={key}
                    key={key} onClick={() => this.handleAccordionOpen(key)}>
                  <Panel.Heading>{containerHeader(container)}</Panel.Heading>
                  <Panel.Body collapsible="true">
                    <ContainerComponent
                      readOnly={readOnly}
                      container={container}
                      onChange={container => this.handleChange(container)}
                    />
                  </Panel.Body>
                </Panel>
              );
            }

            }
          )}
          </PanelGroup>
          </div>
        )
      }else {
        return (
          <div>
            <p className='noAnalyses-warning'>
              There are currently no Analyses.
              {this.addButton()}
            </p>
          </div>
        )
      }

    }else{

      return (
        <div>
          <p className='noAnalyses-warning'>
            There are currently no Analyses.
          </p>
        </div>
      )
    }

  }

}

WellplateDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  parent: PropTypes.object,
};
