/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import {
  Button, Form, OverlayTrigger, Tooltip, ButtonToolbar, Accordion
} from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import ContainerRow from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersDnd';
import {
  HeaderDeleted,
  HeaderNormal,
  AnalysisModeBtn,
} from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersAux';

function RndNotAvailable() {
  return (
    <p className="m-0">Not available.</p>
  );
}

function RndNoAnalyses({ addButton }) {
  return (
    <div className='d-flex justify-content-between align-items-center'>
      <p className='m-0'>There are currently no Analyses.</p>
      {addButton()}
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
        size="xsm"
        variant="primary"
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
    <Form.Group>
      <Form.Control
        componentClass="textarea"
        style={{ marginTop: '10px', marginBottom: '10px' }}
        rows={2}
        value={container.description}
        onChange={handleCommentTextChange}
      />
    </Form.Group>
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
  toggleAddToReport,
  toggleMode,
  orderContainers,
  addButton,
}) {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        {AnalysisModeBtn(mode, toggleMode, isDisabled)}
        <ButtonToolbar className="gap-2">
          {renderCommentButton()}
          {addButton()}
        </ButtonToolbar>
      </div>
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
              handleUndo={handleUndo}
              toggleAddToReport={toggleAddToReport}
            />
          );
        })}
      </div>
    </div>
  );
}

function RndEdit({
  sample,
  mode,
  handleRemove,
  handleSubmit,
  handleAccordionOpen,
  toggleAddToReport,
  toggleMode,
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

  const headerNormalFunc = (container) => (
    <HeaderNormal
      sample={sample}
      container={container}
      mode={mode}
      handleUndo={handleUndo}
      readOnly={readOnly}
      isDisabled={isDisabled}
      handleRemove={handleRemove}
      handleSubmit={handleSubmit}
      toggleAddToReport={toggleAddToReport}
    />
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        {AnalysisModeBtn(mode, toggleMode, isDisabled)}
        <ButtonToolbar className="gap-2">
          {renderCommentButton()}
          {addButton()}
          {commentBoxVisible && renderCommentBox(sample, handleCommentTextChange)}
        </ButtonToolbar>
      </div>
      <Accordion
        id="editable-analysis-list"
        defaultActiveKey={0}
        onSelect={handleAccordionOpen}
      >
        {orderContainers.map((container, i) => {
          const id = container.id || `fake_${i}`;
          return (
            <Accordion.Item eventKey={id} key={`${id}CRowEdit`}>
              <Accordion.Header>
                {headerNormalFunc(container, id)}
              </Accordion.Header>
              <Accordion.Body>
                Test
                {!container.is_deleted && (
                  <ContainerComponent
                    templateType="sample"
                    readOnly={readOnly}
                    container={container}
                    disabled={isDisabled}
                    onChange={handleChange}
                  />
                )}
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
}

export {
  RndNotAvailable, RndNoAnalyses, RndOrder, RndEdit
};
