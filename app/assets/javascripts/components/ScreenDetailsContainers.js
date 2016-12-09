import React, {Component} from 'react';
import {PanelGroup, Panel, Button, Row, Col} from 'react-bootstrap';
import Container from './models/Container';
import ContainerComponent from './ContainerComponent';

export default class ScreenDetailsContainers extends Component {
  constructor(props) {
    super();
    const {screen} = props;
    this.state = {
      screen,
      activeContainer: 0
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      screen: nextProps.screen
    })
  }

  handleChange(container) {
    const {screen} = this.state
    this.props.parent.handleScreenChanged(screen)
  }

  handleAdd() {
    const {screen} = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";

    screen.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey = screen.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    this.props.parent.setState({screen: screen})
  }

  handleRemove(container) {
    let {screen} = this.state;
    container.is_deleted = true;

    this.props.parent.setState({screen: screen})
  }

  handleUndo(container) {
    let {screen} = this.state;
    container.is_deleted = false;

    this.props.parent.setState({screen: screen})
  }

  handleAccordionOpen(key) {
    this.setState({activeContainer: key});
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
        //<div className="button-right" >
          <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            Add analysis
          </Button>
        //</div>
      )
    }
  }

  render() {
    const {screen, activeContainer} = this.state;
    const {readOnly} = this.props;

    let containerHeader = (container) => <p style={{width: '100%'}}>{container.name}
      {(container.extended_metadata['kind'] && container.extended_metadata['kind'] != '') ? (' - Type: ' + container.extended_metadata['kind']) : ''}
      {(container.extended_metadata['status'] && container.extended_metadata['status'] != '') ? (' - Status: ' + container.extended_metadata['status']) :''}
      <Button bsSize="xsmall" bsStyle="danger"
         className="button-right" disabled={readOnly}
        onClick={() => {if(confirm('Delete the container?')) {this.handleRemove(container)}}}>
        <i className="fa fa-trash"></i>
      </Button></p>

      let containerHeaderDeleted = (container) => <p style={{width: '100%'}}><strike>{container.name}
        {(container.extended_metadata['kind'] && container.extended_metadata['kind'] != '') ? (' - Type: ' + container.extended_metadata['kind']) : ''}
        {(container.extended_metadata['status'] && container.extended_metadata['status'] != '') ? (' - Status: ' + container.extended_metadata['status']) :''}
        </strike>
        <Button className="pull-right" bsSize="xsmall" bsStyle="danger" onClick={() => this.handleUndo(container)}>
          <i className="fa fa-undo"></i>
        </Button>
        </p>

    if(screen.container != null){

      var analyses_container = screen.container.children.filter(element => ~element.container_type.indexOf('analyses'));

      if(analyses_container.length == 1 && analyses_container[0].children.length > 0){
        return (
          <div>
          <p>&nbsp;{this.addButton()}</p>
          <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
          {analyses_container[0].children.map((container, key) => {
            if (container.is_deleted){
              return (
                <Panel header={containerHeaderDeleted(container)} eventKey={key}
                    key={key} >
                    </Panel>
                  );
                }else {
              return (
                <Panel header={containerHeader(container)} eventKey={key}
                    key={key} onClick={() => this.handleAccordionOpen(key)}>
                  <ContainerComponent
                    readOnly={readOnly}
                    container={container}
                    onChange={container => this.handleChange(container)}
                  />
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

ScreenDetailsContainers.propTypes = {
  readOnly: React.PropTypes.bool,
  parent: React.PropTypes.object,
};
