/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import {
  Button, FormGroup, FormControl, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import ContainerRow from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersDnd';
import {
  HeaderDeleted,
  HeaderNormal,
  AnalysisModeBtn,
} from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersAux';
import Panel from 'src/components/legacyBootstrap/Panel'
import PanelGroup from 'src/components/legacyBootstrap/PanelGroup'

function RndNotAvailable() {
  return (
    <div>
      <p className="noAnalyses-warning">Not available.</p>
    </div>
  );
}

function RndNoAnalyses({ addButton }) {
  return (
    <div>
      <p>{addButton()}</p>
      <p className="noAnalyses-warning">There are currently no Analyses.</p>
    </div>
  );
}

function renderCommentButton(handleCommentButtonClick, disableMode = true) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id="analysisCommentBox">
          general remarks that relate to all analytical data
        </Tooltip>
      )}
    >
      <Button
        size="sm"
        variant="primary"
        style={{ float: 'right', marginRight: '10px' }}
        onClick={handleCommentButtonClick}
        disabled={disableMode}
      >
        Add comment
      </Button>
    </OverlayTrigger>
  );
}

function renderCommentBox(sample, handleCommentTextChange) {
  const { container } = sample;
  return (
    <FormGroup>
      <FormControl
        componentClass="textarea"
        style={{ marginTop: '10px', marginBottom: '10px' }}
        rows={2}
        value={container.description}
        onChange={handleCommentTextChange}
      />
    </FormGroup>
  );
}

function RndOrder({
  sample,
  mode,
  readOnly,
  isDisabled,
  handleRemove,
  handleSubmit,
  handleMove,
  handleUndo,
  handleAccordionOpen,
  toggleAddToReport,
  toggleMode,
  orderContainers,
  addButton,
}) {
  return (
    <div>
      <p style={{
        position: 'sticky',
        top: '0px',
        zIndex: 1000,
        backgroundColor: 'white',

      }}
      >
        {AnalysisModeBtn(mode, toggleMode, isDisabled)}
        {addButton()}
        {renderCommentButton()}
      </p>
      <div style={{
        position: 'relative',
        height: '600px',
        overflowY: 'scroll'
      }}
      >
        {orderContainers.map((container, i) => {
          const id = container.id || `fake_${i}`;
          return (
            <ContainerRow
              sample={sample}
              mode={mode}
              container={container}
              readOnly={readOnly}
              isDisabled={isDisabled}
              key={`${id}CRowOrder`}
              addButton={addButton}
              handleMove={handleMove}
              handleRemove={handleRemove}
              handleSubmit={handleSubmit}
              handleAccordionOpen={handleAccordionOpen}
              handleUndo={handleUndo}
              toggleAddToReport={toggleAddToReport}
            />
          );
        })}
      </div>
    </div>
  );
}

const panelOnSelect = () => { };

function RndEdit({
  sample,
  mode,
  handleRemove,
  handleSubmit,
  handleAccordionOpen,
  toggleAddToReport,
  toggleMode,
  activeAnalysis,
  orderContainers,
  readOnly,
  isDisabled,
  addButton,
  handleChange,
  handleUndo,
  handleCommentTextChange,
}) {
  const headerDeletedFunc = (container) => (
    <HeaderDeleted container={container} handleUndo={handleUndo} mode={mode} />
  );

  const [commentBoxVisible, setCommentBoxVisible] = useState(false);

  useEffect(() => {
    if (sample.container.description && sample.container.description.trim() !== '') {
      setCommentBoxVisible(true);
    } else {
      setCommentBoxVisible(false);
    }
  }, [sample.container.description]);

  const handleCommentButtonClick = () => {
    setCommentBoxVisible(!commentBoxVisible);
  };

  const headerNormalFunc = (container, serial) => (
    <HeaderNormal
      sample={sample}
      container={container}
      mode={mode}
      serial={serial}
      handleUndo={handleUndo}
      readOnly={readOnly}
      isDisabled={isDisabled}
      handleRemove={handleRemove}
      handleSubmit={handleSubmit}
      handleAccordionOpen={handleAccordionOpen}
      toggleAddToReport={toggleAddToReport}
    />
  );

  return (
    <div>
      <p style={{
        position: 'sticky',
        top: '0px',
        zIndex: 1000,
        backgroundColor: 'white',

      }}
      >
        {AnalysisModeBtn(mode, toggleMode, isDisabled)}
        {addButton()}
        {renderCommentButton(handleCommentButtonClick, false)}
        {commentBoxVisible ? renderCommentBox(sample, handleCommentTextChange) : null}
      </p>
      <PanelGroup
        id="editable-analysis-list"
        defaultActiveKey={0}
        activeKey={activeAnalysis}
        onSelect={panelOnSelect}
        accordion
        style={{
          position: 'relative',
          height: '600px',
          overflowY: 'scroll'
        }}
      >
        {orderContainers.map((container, i) => {
          const id = container.id || `fake_${i}`;
          if (container.is_deleted) {
            return (
              <Panel eventKey={id} key={`${id}CRowEdit`}>
                <Panel.Heading>{headerDeletedFunc(container)}</Panel.Heading>
              </Panel>
            );
          }

          return (
            <Panel eventKey={id} key={`${id}CRowEdit`}>
              <Panel.Heading>{headerNormalFunc(container, id)}</Panel.Heading>
              <Panel.Body collapsible>
                <ContainerComponent
                  templateType="sample"
                  readOnly={readOnly}
                  container={container}
                  disabled={isDisabled}
                  onChange={handleChange}
                />
              </Panel.Body>
            </Panel>
          );
        })}
      </PanelGroup>
    </div>
  );
}

export {
  RndNotAvailable, RndNoAnalyses, RndOrder, RndEdit
};
