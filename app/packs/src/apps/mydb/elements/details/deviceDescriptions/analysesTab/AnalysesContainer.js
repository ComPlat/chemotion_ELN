import React, { useContext } from 'react';
import { PanelGroup, Panel, Button, OverlayTrigger, Tooltip, FormGroup, FormControl } from 'react-bootstrap';

import ContainerComponent from 'src/components/container/ContainerComponent';
import AnalysisHeader from './AnalysisHeader';
import AnalysisDragNDropRow from './AnalysisDragNDropRow';
// import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
// import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AnalysesContainer = ({ readonly }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const deviceDescription = deviceDescriptionsStore.device_description;
  const containers = deviceDescription.container.children[0].children;

  const addEmptyAnalysis = () => {
    deviceDescriptionsStore.addEmptyAnalysisContainer();
  }

  const changeMode = () => {
    const newMode = deviceDescriptionsStore.analysis_mode == 'edit' ? 'order' : 'edit';
    deviceDescriptionsStore.changeAnalysisMode(newMode);
  }

  const toggleCommentBox = () => {
    deviceDescriptionsStore.toggleAnalysisCommentBox();
  }

  const handleCommentTextChange = (e) => {
    deviceDescriptionsStore.changeAnalysisComment(e.target.value);
  }

  const changeOpenPanelStatus = (containerId) => {
    const openPanel = deviceDescriptionsStore.analysis_open_panel === containerId ? 'none' : containerId;
    deviceDescriptionsStore.changeAnalysisOpenPanel(openPanel);
  }

  const handleContainerChanged = (container) => {
    deviceDescriptionsStore.changeAnalysisContainerContent(container);
  }

  const handleMove = (children) => {
    deviceDescriptionsStore.changeAnalysisContainer(children);
  }

  const addButton = () => {
    return (
      <div className="add-button">
        <Button
          bsSize="xsmall"
          bsStyle="success"
          onClick={() => addEmptyAnalysis()}
          disabled={readonly}
        >
          <i className="fa fa-plus icon-margin-right" />
          Add analysis
        </Button>
      </div>
    );
  }

  const modeButton = () => {
    if (containers.length <= 0) { return '' }

    const buttonText = deviceDescriptionsStore.analysis_mode === 'order' ? 'Order mode' : 'Edit mode';
    const buttonIcon = deviceDescriptionsStore.analysis_mode === 'order' ? 'fa fa-reorder' : 'fa fa-edit';
    const styleClass = deviceDescriptionsStore.analysis_mode === 'order' ? 'success' : 'primary';
    return (
      <div className="order-mode-button">
        <Button
          disabled={readonly}
          bsSize="xsmall"
          bsStyle={styleClass}
          onClick={() => changeMode()}
        >
          <i className={`${buttonIcon} icon-margin-right`} aria-hidden="true" />
          {buttonText}
        </Button>
      </div>
    );
  }

  const commentButton = () => {
    if (containers.length <= 0) { return '' }

    const disableMode = deviceDescriptionsStore.analysis_mode === 'order' ? true : false;
    return (
      <div className="comment-button">
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id="analysisCommentBox">
              general remarks that relate to all analytical data
            </Tooltip>
          )}
        >
          <Button
            bsSize="xsmall"
            bsStyle="primary"
            style={{ float: 'right', marginRight: '10px' }}
            onClick={() => toggleCommentBox()}
            disabled={disableMode}
          >
            Add comment
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  const commentBox = () => {
    if (containers.length <= 0) { return '' }
    if (!deviceDescriptionsStore.analysis_comment_box) { return '' }

    return (
      <FormGroup className="small-comment-form">
        <FormControl
          componentClass="textarea"
          style={{ marginTop: '10px', marginBottom: '10px' }}
          rows={2}
          value={deviceDescription.container.description}
          onChange={(e) => handleCommentTextChange(e)}
        />
      </FormGroup>
    );
  }

  const analysisContainer = () => {
    let panels = [];

    containers.forEach((container) => {
      panels.push(
        <Panel
          eventKey={container.id}
          key={container.id}
        >
          <Panel.Heading onClick={() => changeOpenPanelStatus(container.id)}>
            <AnalysisHeader container={container} readonly={readonly} />
          </Panel.Heading>
          <Panel.Body collapsible>
            <ContainerComponent
              templateType="deviceDescription"
              readOnly={readonly}
              container={container}
              onChange={() => handleContainerChanged(container)}
            />
          </Panel.Body>
        </Panel>
      );
    });
    return panels;
  }

  // <ViewSpectra
  //   sample={this.props.researchPlan}
  //   handleSampleChanged={this.handleSpChange}
  //   handleSubmit={this.props.handleSubmit}
  // />
  // <NMRiumDisplayer
  //   sample={this.props.researchPlan}
  //   handleSampleChanged={this.handleSpChange}
  //   handleSubmit={this.props.handleSubmit}
  // />

  const analysisOrderContainer = () => {
    let panels = [];

    containers.forEach((container) => {
      panels.push(
        <AnalysisDragNDropRow
          container={container}
          readonly={readonly}
          deviceDescription={deviceDescription}
          handleMove={handleMove}
        />
      );
    });
    return panels;
  }

  const containerPanels = () => {
    const containerId = deviceDescriptionsStore.analysis_open_panel;
    const analysisRow = deviceDescriptionsStore.analysis_mode == 'edit' ? analysisContainer() : analysisOrderContainer();
    if (containers.length > 0) {
      return (
        <div className="device-description-analyses">
          <PanelGroup
            id={`deviceDescriptionAnalysisPanelGroupOf:${deviceDescription.id}`}
            defaultActiveKey="none"
            activeKey={containerId}
            accordion
            onSelect={() => {}}
          >
            {analysisRow}
          </PanelGroup>
        </div>
      );
    }
    return <div className="no-analyses-panel">There are currently no analyses</div>;
  }

  return (
    <div className="form-fields">
      <div style={{ height: '34px' }}>
        {modeButton()}
        {addButton()}
        {commentButton()}
      </div>
      {commentBox()}
      {containerPanels()}
    </div>
  );
}

export default observer(AnalysesContainer);
