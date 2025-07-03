import { set } from 'immutable';
import React, { useState } from 'react';
import {
  Button, OverlayTrigger, Tooltip, Modal
} from 'react-bootstrap';

export default function Fab(props) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);

  const {
    currentTab,
    onSave,
    onClose,
    disableSave,
    handleToggleMode,
    onAddAnalysis,
    onAddComment,
    hasAnalyses
  } = props;

  const handleToggle = () => {
    if (isOpen) {
      setIsAnimating(true); // Start reverse animation
      setTimeout(() => {
        setIsAnimating(false); // End animation
        setIsOpen(false); // Hide buttons
      }, 200); // match CSS transition duration
    } else {
      setIsOpen(true);
    }
  };

  const actions = [
    ...(hasAnalyses
      ? [{
        icon: previewMode ? 'fa-edit' : 'fa-reorder',
        label: previewMode ? 'Edit Mode' : 'View Mode',
        onClick: () => {
          setPreviewMode(!previewMode);
          handleToggleMode(previewMode ? 'view' : 'edit');
        },
        variant: 'warning',
      },
      {
        icon: 'fa-comment',
        label: 'Add Comment',
        onClick: onAddComment,
        variant: 'primary',
      }]
      : []),
    {
      icon: 'fa-plus',
      label: 'Add Analysis',
      onClick: onAddAnalysis,
      variant: 'success',
    },

  ];

  return (
    <>
      <div className="fab-container">
        <div className={`fab-actions ${isOpen || isAnimating ? 'fab-actions-open' : ''}`}>
          {actions.map((action, index) => (
            <OverlayTrigger
              key={index}
              placement="left"
              overlay={<Tooltip>{action.label}</Tooltip>}
            >
              <Button
                variant={action.variant}
                className="fab-action-button"
                onClick={action.onClick}
                size="sm"
                style={{
                  transitionDelay: `${index * 60}ms`,
                  bottom: `${120 + index * 40}px`, // 👈 dynamically calculate
                  opacity: 1,
                }}
              >
                <i className={`fa ${action.icon}`} />
              </Button>
            </OverlayTrigger>
          ))}
        </div>
        {
          currentTab === 'analyses' && (
            <OverlayTrigger
              key={123}
              placement="left"
              overlay={<Tooltip>Analyses actions</Tooltip>}
            >
              <Button
                variant="success"
                className={`fab-main ${isOpen ? 'rotate' : ''}`}
                size="xsm"
                onClick={handleToggle}
              >
                <i className="fa fa-list" />
              </Button>
            </OverlayTrigger>
          )
        }
        <div className="fab-static-buttons">
          <Button variant="warning" className="fab-static-button" onClick={onSave} disabled={disableSave}>
            <i className="fa fa-floppy-o" />
          </Button>
          <Button variant="danger" className="fab-static-button" onClick={onClose}>
            <i className="fa fa-times" />
          </Button>
        </div>
      </div>

      <Modal
        show={modalVisible}
        onHide={() => setModalVisible(false)}
        centered
        animation
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Something</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Here is a Modal.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalVisible(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
Fab.defaultProps = {
  currentTab: 'analyses',
  onSave: () => { },
  onClose: () => { },
  disableSave: false,
  handleToggleMode: () => { },
  onAddAnalysis: () => { },
  onAddComment: () => { },
  hasAnalyses: false
};
