import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import Container from './models/Container';
import UIStore from './stores/UIStore';
import ArrayUtils from './utils/ArrayUtils';
import { reOrderArr } from './utils/DndControl';
import { RndNotAvailable, RndNoAnalyses, RndOrder,
  RndEdit } from './SampleDetailsContainersCom';

export default class SampleDetailsContainers extends Component {
  constructor(props) {
    super();
    const { sample } = props;
    this.state = {
      sample,
      activeAnalysis: UIStore.getState().sample.activeAnalysis,
      mode: 'edit',
    };
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.addButton = this.addButton.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.toggleAddToReport = this.toggleAddToReport.bind(this);
    this.toggleMode = this.toggleMode.bind(this);
    this.isEqCId = this.isEqCId.bind(this);
    this.indexedContainers = this.indexedContainers.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      sample: nextProps.sample,
    });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    if (state.sample.activeAnalysis !== this.state.sample.activeAnalysis) {
      this.setState({ activeAnalysis: state.sample.activeAnalysis });
    }
  }

  handleChange(container) {
    const { sample } = this.state;
    const analyses = sample.container.children.find(child => (
      child.container_type === 'analyses'
    ));
    let analysis = analyses.children.find(child => (
      child.container_type === 'analysis' && child.id === container.id
    ));
    if (analysis) analysis = container;

    this.props.handleSampleChanged(sample);
  }

  handleAdd() {
    const { sample } = this.state;
    const container = Container.buildEmpty();
    container.container_type = "analysis";
    container.extended_metadata.content = { "ops": [{ "insert": "" }] }
    container.extended_metadata.index = -1;
    sample.analysesContainers()[0].children.push(container);

    this.props.setState({ sample },
      this.handleAccordionOpen(container.id),
    );
  }

  handleMove(source, target) {
    const { sample } = this.state;
    const containers = sample.analysesContainers()[0].children;
    const sortedConts = ArrayUtils.sortArrByIndex(containers);
    const newContainers = reOrderArr(source, target, this.isEqCId, sortedConts);
    const newIndexedConts = this.indexedContainers(newContainers);

    sample.analysesContainers()[0].children = newIndexedConts;
    this.props.setState({ sample });
  }

  isEqCId(container, tagEl) {
    return container.id === tagEl.cId;
  }

  indexedContainers(containers) {
    return containers.map((c, i) => {
      const container = c;
      container.extended_metadata.index = i;
      return container;
    });
  }

  handleRemove(container) {
    const { sample } = this.state;
    container.is_deleted = true;

    this.props.setState({ sample });
  }

  handleUndo(container) {
    const { sample } = this.state;
    container.is_deleted = false;

    this.props.setState({ sample });
  }

  handleAccordionOpen(newKey) {
    this.setState((prevState) => {
      const prevKey = prevState.activeAnalysis;
      return { ...prevState,
        mode: 'edit',
        activeAnalysis: prevKey === newKey ? 0 : newKey,
      };
    });
  }

  addButton() {
    const { readOnly, sample } = this.props;
    if (readOnly) {
      return null;
    }
    return (
      <Button
        className="button-right"
        bsSize="xsmall"
        bsStyle="success"
        onClick={this.handleAdd}
        disabled={!sample.can_update}
      >
        Add analysis
      </Button>
    );
  }

  toggleAddToReport(container) {
    container.extended_metadata.report = !container.extended_metadata.report;
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

  // analysisHeader(container, readOnly, key) {
  //   const { sample } = this.props;

  //   const confirmDelete = (e) => {
  //     e.stopPropagation()
  //     if (confirm('Delete the analysis?')) {
  //       this.handleRemove(container)
  //     }
  //   };
  //   const kind = container.extended_metadata.kind || ' - ';
  //   const status = container.extended_metadata.status || ' - ';
  //   const inReport = container.extended_metadata.report;
  //   const previewImg = this.PreviewImg(container);
  //   const content = container.extended_metadata.content;

  //   const addToLabelBtn = (
  //     <Checkbox
  //       onClick={e => this.toggleAddToReport(e, container)}
  //       defaultChecked={inReport}
  //       disabled={!sample.can_update}
  //     >
  //       <span>Add to Report</span>
  //     </Checkbox>
  //   );

  //   const btnGroup = () => {
  //     const isDisabled = !this.props.sample.can_update;
  //     return (
  //       <div className="upper-btn">
  //         <Button bsSize="xsmall"
  //                 bsStyle="danger"
  //                 className="button-right"
  //                 disabled={readOnly || isDisabled}
  //                 onClick={confirmDelete}>
  //           <i className="fa fa-trash"></i>
  //         </Button>
  //         <PrintCodeButton
  //           element={this.state.sample}
  //           analyses={[container]}
  //           ident={container.id}
  //         />
  //         <div
  //           role="button"
  //           className="button-right add-to-report"
  //           onClick={e => e.stopPropagation()}
  //         >
  //           <Checkbox
  //             onClick={e => this.toggleAddToReport(e, container)}
  //             defaultChecked={inReport}
  //           >
  //             <span>Add to Report</span>
  //           </Checkbox>
  //         </div>
  //       </div>
  //     )
  //   }

  //   return (
  //     <div
  //       className="analysis-header"
  //       role="presentation"
  //       onClick={() => this.handleAccordionOpen(key)}
  //     >
  //       <div className="preview">
  //         <img alt="preview" src={previewImg} />
  //       </div>
  //       <div className="abstract">
  //         { btnGroup() }
  //         <div className="lower-text">
  //           <div className="main-title">{container.name}</div>
  //           <div className="sub-title">Type: {kind}</div>
  //           <div className="sub-title">Status: {status}</div>

  //           <div className="desc sub-title">
  //             <span style={{ float: 'left', marginRight: '5px' }}>
  //               Content:
  //             </span>
  //             <QuillViewer value={content} preview />
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  toggleMode() {
    const { mode } = this.state;
    if (mode === 'edit') {
      this.setState({ mode: 'order' });
    } else {
      this.setState({ mode: 'edit' });
    }
  }

  render() {
    const { sample, activeAnalysis, mode } = this.state;
    const { readOnly } = this.props;
    const isDisabled = !sample.can_update;

    if (sample.container == null) return <RndNotAvailable />;

    const analyContainer = sample.analysesContainers();

    if (analyContainer.length === 1 && analyContainer[0].children.length > 0) {
      const orderContainers = ArrayUtils.sortArrByIndex(analyContainer[0].children);

      switch (mode) {
        case 'order':
          return (
            <RndOrder
              sample={sample}
              mode={mode}
              orderContainers={orderContainers}
              readOnly={readOnly}
              isDisabled={isDisabled}
              addButton={this.addButton}
              handleRemove={this.handleRemove}
              handleMove={this.handleMove}
              handleAccordionOpen={this.handleAccordionOpen}
              handleUndo={this.handleUndo}
              toggleAddToReport={this.toggleAddToReport}
              toggleMode={this.toggleMode}
            />
          );
        default:
          return (
            <RndEdit
              sample={sample}
              mode={mode}
              orderContainers={orderContainers}
              activeAnalysis={activeAnalysis}
              handleChange={this.handleChange}
              handleUndo={this.handleUndo}
              handleRemove={this.handleRemove}
              handleAccordionOpen={this.handleAccordionOpen}
              toggleAddToReport={this.toggleAddToReport}
              readOnly={readOnly}
              isDisabled={isDisabled}
              addButton={this.addButton}
              toggleMode={this.toggleMode}
            />
          );
      }
    }
    return (
      <RndNoAnalyses
        addButton={this.addButton}
      />
    );
  }
}

SampleDetailsContainers.propTypes = {
  readOnly: React.PropTypes.bool,
  parent: React.PropTypes.object,
  sample: React.PropTypes.object,
};
