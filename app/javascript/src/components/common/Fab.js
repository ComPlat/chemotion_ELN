import React, { useState } from 'react';
import { Button, OverlayTrigger, Tooltip, Modal } from 'react-bootstrap';

export default function FabBootstrap(props) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mode, setMode] = useState(true);

  const { currentTab, onSave, onClose, disableSave } = props;

  const handleToggle = () => {
    if (isOpen) {
      setIsAnimating(true); // Start reverse animation
      setTimeout(() => {
        setIsAnimating(false); // End animation
        setIsOpen(false);      // Hide buttons
      }, 200); // match CSS transition duration
    } else {
      setIsOpen(true);
    }
  };

  const actions = [
    {
      icon: mode ? 'fa-edit' : 'fa-reorder',
      label: mode ? 'Edit' : 'Order Mode',
      onClick: () => setMode(prev => !prev),
      variant: 'warning',
    },
    {
      icon: 'fa-comment',
      label: 'Add Comment',
      onClick: () => alert('Comment clicked'),
      variant: 'primary',
    },
    {
      icon: 'fa-plus',
      label: 'Add Analysis',
      onClick: () => alert('add clicked'),
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
          currentTab === "analyses" &&
          <Button
            variant="success"
            className={`fab-main ${isOpen ? 'rotate' : ''}`}
            size="xsm"
            onClick={handleToggle}
          >
            <i className="fa fa-list" />
          </Button>
        }
        <div className="fab-static-buttons">
          <Button variant="warning" className="fab-static-button" onClick={onSave} disabled={disableSave}>
            <i className="fa fa-floppy-o" />
          </Button>
          <Button variant="danger" className="fab-static-button" onClick={onClose}  >
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
