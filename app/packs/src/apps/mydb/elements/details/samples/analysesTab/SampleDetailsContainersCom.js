/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import {
  Button, Form, OverlayTrigger, Tooltip, ButtonToolbar, Accordion
} from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import ContainerRow from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersDnd';
import {
  AnalysesHeader,
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

function ReactionsDisplay({
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
  handleAccordionOpen,
  activeAnalysis,
  handleChange,
  handleCommentTextChange,
}) {
  const [commentBoxVisible, setCommentBoxVisible] = useState(false);

  useEffect(() => {
    if (sample.container.description && sample.container.description.trim() !== '') {
      setCommentBoxVisible(true);
    } else {
      setCommentBoxVisible(false);
    }
  }, [sample.container.description]);

  const renderCommentButton = (disable = false) => {
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
          onClick={() => {setCommentBoxVisible(!commentBoxVisible)}}
          disabled={disable}
        >
          Add comment
        </Button>
      </OverlayTrigger>
    );
  }
  
  const renderCommentBox = (sample, handleCommentTextChange) => {
    const { container } = sample;
    return (
      <Form.Group>
        <Form.Control
          as="textarea"
          style={{ height: '80px' }}
          value={container.description}
          onChange={handleCommentTextChange}
          className="my-3"
        />
      </Form.Group>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        {AnalysisModeBtn(mode, toggleMode, isDisabled)}
        <ButtonToolbar className="gap-2">
          {renderCommentButton()}
          {addButton()}
        </ButtonToolbar>
      </div>
      {commentBoxVisible && renderCommentBox(sample, handleCommentTextChange)}
      {mode === 'edit' ? (
        <Accordion
          id="editable-analysis-list"
          onSelect={handleAccordionOpen}
          activeKey={activeAnalysis}
        >
          {orderContainers.map((container, i) => {
            const id = container.id || `fake_${i}`;
            return (
              <Accordion.Item eventKey={id} key={`${id}CRowEdit`}>
                <Accordion.Header>
                  <AnalysesHeader
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
                </Accordion.Header>
                {!container.is_deleted && (
                  <Accordion.Body>
                    <ContainerComponent
                      templateType="sample"
                      readOnly={readOnly}
                      container={container}
                      disabled={isDisabled}
                      onChange={handleChange}
                    />
                  </Accordion.Body>
                )}
              </Accordion.Item>
            );
          })}
        </Accordion>
      ) : (
        <div>
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
      )}
    </div>
  );
}

export {
  RndNotAvailable, RndNoAnalyses, ReactionsDisplay
};
