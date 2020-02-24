import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Well, Panel, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, Tooltip, OverlayTrigger, Col, Row
} from 'react-bootstrap';
import Barcode from 'react-barcode';
import SVG from 'react-inlinesvg';

import ElementCollectionLabels from './ElementCollectionLabels';
import ElementActions from './actions/ElementActions';
import DetailActions from './actions/DetailActions';
import CollectionActions from './actions/CollectionActions';
import Wellplate from './Wellplate';
import WellplateList from './WellplateList';
import WellplateProperties from './WellplateProperties';
import WellplateDetailsContainers from './WellplateDetailsContainers';
import PrintCodeButton from './common/PrintCodeButton'
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ConfirmClose from './common/ConfirmClose';

const cols = 12;

export default class WellplateDetails extends Component {
  constructor(props) {
    super(props);
    const {wellplate} = props;
    this.state = {
      wellplate,
      activeTab: UIStore.getState().wellplate.activeTab,
      showWellplate: true,
      qrCodeSVG: ""
    }
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange)
  }

  onUIStoreChange(state) {
    if (state.wellplate.activeTab != this.state.activeTab){
      this.setState({
        activeTab: state.wellplate.activeTab
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    const {wellplate} = this.state;
    const nextWellplate = nextProps.wellplate;
    if (nextWellplate.id != wellplate.id || nextWellplate.updated_at != wellplate.updated_at) {
      this.setState({
        wellplate: nextWellplate
      });
    }
  }

  handleSubmit() {
    const {currentCollection} = UIStore.getState();
    const {wellplate} = this.state;

    if(wellplate.isNew) {
      ElementActions.createWellplate(wellplate.serialize());
    } else {
      ElementActions.updateWellplate(wellplate.serialize());
    }
    if(wellplate.is_new) {
      const force = true;
      DetailActions.close(wellplate, force);
    }
  }

  handleWellplateChanged(wellplate) {
    this.setState({
      wellplate
    });
  }

  handleWellsChange(wells) {
    let {wellplate} = this.state;
    wellplate.wells = wells;
    this.setState({ wellplate });
  }

  handleChangeProperties(change) {
    let {wellplate} = this.state;
    let {type, value} = change;

    switch (type) {
      case 'name':
        wellplate.name = value === '' ? 'New Wellplate' : value;
        break;
      case 'description':
        wellplate.description = value;
        break;
    }

    this.setState({ wellplate });
  }

  handleTabChange(eventKey) {
    let showWellplate = (eventKey == 0) ? true : false;
    this.setState((previousState) => {
       return { ...previousState, activeTab: eventKey, showWellplate}})
    UIActions.selectTab({tabKey: eventKey, type: 'wellplate'});
  }

  wellplateHeader(wellplate) {

    let saveBtnDisplay = wellplate.isEdited ? '' : 'none'
    const datetp = `Created at: ${wellplate.created_at} \n Updated at: ${wellplate.updated_at}`;
    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="screenDatesx">{datetp}</Tooltip>}>
          <span>
            <i className="icon-wellplate" />
            &nbsp; <span>{wellplate.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={wellplate} placement="right"/>
        <ConfirmClose el={wellplate} />
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveWellplate">Save Wellplate</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
                  onClick={() => this.handleSubmit()}
                  style={{display: saveBtnDisplay}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right"
          onClick={() => this.props.toggleFullScreen()}>
          <i className="fa fa-expand"></i>
          </Button>
        </OverlayTrigger>
        <PrintCodeButton element={wellplate}/>
      </div>
    )
  }

  render() {
    const {wellplate, activeTab, showWellplate} = this.state;
    const {wells, name, size, description} = wellplate;
    const submitLabel = wellplate.isNew ? "Create" : "Save";
    const properties = {
      name,
      size,
      description
    };

    return (
      <Panel bsStyle={wellplate.isPendingToSave ? 'info' : 'primary'}
        className="eln-panel-detail">
        <Panel.Heading>{this.wellplateHeader(wellplate)}</Panel.Heading>
        <Panel.Body>
        <Tabs activeKey={activeTab} onSelect={event => this.handleTabChange(event)}
              id="wellplateDetailsTab">
          <Tab eventKey={0} title={'Designer'}>
            <Row className="wellplate-detail">
              <Col md={10}>
                <Well>
                  <Wellplate
                    show={showWellplate}
                    size={size}
                    wells={wells}
                    handleWellsChange={(wells) => this.handleWellsChange(wells)}
                    cols={cols}
                    width={60}
                    />
                </Well>
              </Col>
            </Row>
          </Tab>
          <Tab eventKey={1} title={'List'}>
            <Well>
              <WellplateList
                wells={wells}
                handleWellsChange={(wells) => this.handleWellsChange(wells)}
                />
            </Well>
          </Tab>
          <Tab eventKey={2} title={'Properties'}>
            <WellplateProperties
              {...properties}
              changeProperties={(change) => this.handleChangeProperties(change)}
              />
          </Tab>
          <Tab eventKey={3} title={'Analyses'}>
            <ListGroupItem style={{paddingBottom: 20}}>
              <WellplateDetailsContainers
                wellplate={wellplate}
                parent={this}
              />
            </ListGroupItem>
          </Tab>
        </Tabs>
        <ButtonToolbar>
          <Button
            bsStyle="primary"
            onClick={() => DetailActions.close(wellplate)}
            >
            Close
          </Button>
          <Button
            bsStyle="warning"
            onClick={() => this.handleSubmit()}
            >
            {submitLabel}
          </Button>

          <Button
            bsStyle="default"
            onClick={() => CollectionActions.downloadReportWellplate(wellplate.id)}
            >
            Export samples
          </Button>
        </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

WellplateDetails.propTypes = {
  wellplate: PropTypes.object.isRequired,
  toggleFullScreen: PropTypes.func,
};
