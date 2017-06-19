import React, {Component} from 'react';
import {PanelGroup, Panel, Button, Label, Checkbox} from 'react-bootstrap';
import Container from './models/Container';
import ContainerComponent from './ContainerComponent';
import PrintCodeButton from './common/PrintCodeButton'
import UIStore from './stores/UIStore';

export default class SampleDetailsContainers extends Component {
  constructor(props) {
    super();
    const {sample} = props;
    this.state = {
      sample,
      activeAnalysis: UIStore.getState().sample.activeAnalysis,
    };
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      sample: nextProps.sample,
    })
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange)
  }

  onUIStoreChange(state) {
    if (state.sample.activeAnalysis != this.state.sample.activeAnalysis){
      this.setState({
        activeAnalysis: state.sample.activeAnalysis
      })
    }
  }

  handleChange(container) {
    const {sample} = this.state

    let analyses = sample.container.children.find((child) => { return child.container_type == "analyses"})
    let analysis = analyses.children.find((child) => {
      return child.container_type == "analysis" && child.id == container.id
    })
    if (analysis) analysis = container;

    this.props.handleSampleChanged(sample)
  }

  handleAdd() {
    const {sample} = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";
    container.extended_metadata.content = { "ops": [{ "insert": "" }] }

    sample.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    this.props.setState({sample: sample},
      this.handleAccordionOpen(container.id)
    )
  }

  handleRemove(container) {
    let {sample} = this.state;
    container.is_deleted = true;

    this.props.setState({sample: sample})
  }

  handleUndo(container) {
    let {sample} = this.state;
    container.is_deleted = false;

    this.props.setState({sample: sample})
  }

  handleAccordionOpen(newKey) {
    this.setState((prevState)=>{
      let prevKey = prevState.activeAnalysis
      return {...prevState,activeAnalysis: prevKey == newKey ? 0 : newKey}
    });
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

  toggleAddToReport(e, container) {
    e.stopPropagation();
    container.extended_metadata['report'] = !container.extended_metadata['report'];
    this.handleChange(container);
  }

  PreviewImg(container) {
    const rawImg = container.preview_img
    const noAttSvg = '/images/wild_card/no_attachment.svg'
    const noAvaSvg = '/images/wild_card/not_available.svg'
    switch(rawImg) {
      case null:
      case undefined:
          return noAttSvg
          break;
      case 'not available':
          return noAvaSvg
          break;
      default:
          return `data:image/png;base64,${rawImg}`
    }
  }

  analysisHeader(container, readOnly, key) {
    const confirmDelete = (e) => {
      e.stopPropagation()
      if(confirm('Delete the analysis?')) {
        this.handleRemove(container)
      }
    };
    const kind = container.extended_metadata['kind'] || ' - '
    const status = container.extended_metadata['status'] || ' - '
    const description = container.description || ' - '
    const inReport = container.extended_metadata['report']
    const previewImg = this.PreviewImg(container)

    const btnGroup = () => {
      return (
        <div className="upper-btn">
          <Button bsSize="xsmall"
                  bsStyle="danger"
                  className="button-right"
                  disabled={readOnly}
                  onClick={confirmDelete}>
            <i className="fa fa-trash"></i>
          </Button>
          <PrintCodeButton element={this.state.sample}
                            analyses={[container]}
                            ident={container.id}/>
          <div className="button-right add-to-report"
                onClick={e => e.stopPropagation()}>
            <Checkbox onClick={(e) => this.toggleAddToReport(e, container)}
                      defaultChecked={inReport} >
              <span>Add to Report</span>
            </Checkbox>
          </div>
        </div>
      )
    }

    return (
      <div className="analysis-header"
            onClick={() => this.handleAccordionOpen(key)}>
        <div className="preview">
          <img src={previewImg} />
        </div>
        <div className="abstract">
          { btnGroup() }
          <div className="lower-text">
            <div className="main-title">{container.name}</div>
            <div className="sub-title">Type: {kind}</div>
            <div className="sub-title">Status: {status}</div>
            <div className="desc">Description: {description}</div>
          </div>
        </div>
      </div>
    );
  }

  analysisHeaderDeleted(container, readOnly) {

    const kind = (container.extended_metadata['kind'] && container.extended_metadata['kind'] != '')
      ? (' - Type: ' + container.extended_metadata['kind'])
      : ''
    const status = (container.extended_metadata['status'] && container.extended_metadata['status'] != '')
      ? (' - Status: ' + container.extended_metadata['status'])
      :''

    return (
      <div style={{width: '100%'}}>
        <strike>{container.name}
        {kind}
        {status}</strike>
        <div className="button-right">
          <Button className="pull-right" bsSize="xsmall" bsStyle="danger" onClick={() => this.handleUndo(container)}>
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const {sample, activeAnalysis} = this.state;
    const {readOnly} = this.props;

    if (sample.container == null) {
      return (
        <div><p className='noAnalyses-warning'>Not available.</p></div>
      )
    }

    let analyses_container =
      sample.container.children.filter(element => ~element.container_type.indexOf('analyses'));

    if (analyses_container.length == 1 && analyses_container[0].children.length > 0) {
      return (
        <div>
          <p>&nbsp;{this.addButton()}</p>
          <PanelGroup defaultActiveKey={0} activeKey={activeAnalysis} accordion>
          {analyses_container[0].children.map((container,i) => {
            let key = container.id || `fake_${i}`
            if (container.is_deleted) {
              return (
                <Panel header={this.analysisHeaderDeleted(container, readOnly)}
                       eventKey={key} key={key + "_analysis"} >
                </Panel>
              );
            }

            return (
              <Panel header={this.analysisHeader(container, readOnly, key)}
                eventKey={key} key={key + "_analysis"}>
                <ContainerComponent
                  readOnly={readOnly}
                  container={container}
                  onChange={container => this.handleChange(container)}
                />
              </Panel>
            );
          })}
          </PanelGroup>
        </div>
      )
    } else {
      return (
        <div>
          <p className='noAnalyses-warning'>
            There are currently no Analyses.
            {this.addButton()}
          </p>
        </div>
      )
    }
  }

}

SampleDetailsContainers.propTypes = {
  readOnly: React.PropTypes.bool,
  parent: React.PropTypes.object,
};