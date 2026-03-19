import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CloseButton,
  Button,
  Overlay,
  OverlayTrigger,
  Tooltip,
  ButtonToolbar,
} from 'react-bootstrap';
import ElementIcon from 'src/components/common/ElementIcon';
import CopyElementModal from 'src/components/common/CopyElementModal';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import {
  detailHeaderButton,
  detailFooterButton,
} from 'src/apps/mydb/elements/details/DetailCardButton';

export default function DetailCard({
  children,
  element,
  isPendingToSave,
  title,
  titleTooltip,
  titleAppendix,
  headerToolbar,
  footerToolbar,
  onClose,
  onSave,
  onSaveClose,
  showSave,
  saveDisabled,
  saveLabel,
}) {
  const [showCloseOverlay, setShowCloseOverlay] = React.useState(false);
  const [closeOverlayTarget, setCloseOverlayTarget] = React.useState(null);
  const [closeOverlayPlacement, setCloseOverlayPlacement] = React.useState('bottom');
  const pendingToSave = typeof isPendingToSave === 'boolean'
    ? isPendingToSave
    : !!(element && (element.isPendingToSave || element.changed));
  const className = `detail-card${pendingToSave ? ' detail-card--unsaved' : ''}`;
  const hasSave = typeof onSave === 'function';
  const inferredSaveLabel = saveLabel || (element && element.isNew ? 'Create' : 'Save');
  const canCopy = !!(element && element.can_copy && !element.isNew);
  const shouldShowSave = typeof showSave === 'boolean' ? showSave : hasSave;

  const handleClose = (forceClose = false) => {
    setShowCloseOverlay(false);
    if (onClose) {
      onClose();
    }
    if (element) {
      DetailActions.close(element, forceClose);
    }
  };

  const handleSaveClose = () => {
    setShowCloseOverlay(false);
    if (onSaveClose) {
      onSaveClose();
      return;
    }
    if (onSave) {
      onSave();
    }
    handleClose();
  };

  const saveButtonProps = {
    iconClass: 'fa fa-floppy-o',
    onClick: onSave,
    variant: 'primary',
    disabled: saveDisabled,
    label: inferredSaveLabel,
  };

  const footerSaveButtonProps = {
    ...saveButtonProps,
    disabled: !pendingToSave || saveDisabled,
  };

  const saveCloseButtonProps = {
    onClick: handleSaveClose,
    disabled: saveDisabled,
    label: `${inferredSaveLabel} and Close`,
    iconClass: 'fa fa-floppy-o combi-icon-close',
  };

  const requestClose = (event, forceClose = false, placement = 'bottom') => {
    if (pendingToSave && !forceClose) {
      setCloseOverlayTarget(event.currentTarget);
      setCloseOverlayPlacement(placement);
      setShowCloseOverlay(true);
      return;
    }

    handleClose(forceClose);
  };

  const closeOverlay = (
    <Tooltip id="detail-card-close-overlay">
      <div className="p2">
        {hasSave ? 'You have unsaved changes. Save before closing?' : 'Unsaved data will be lost. Close anyway?'}
        <ButtonToolbar className="justify-content-end mt-2">
          <Button
            variant="danger"
            size="xsm"
            onClick={() => handleClose(true)}
          >
            Discard
          </Button>
          <Button
            variant="ghost"
            size="xsm"
            onClick={() => setShowCloseOverlay(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="xsm"
            onClick={handleSaveClose}
            disabled={saveDisabled}
          >
            Save and Close
          </Button>
        </ButtonToolbar>
      </div>
    </Tooltip>
  );

  return (
    <Card className={className}>
      <Card.Header>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center me-2">
              {element && <ElementIcon element={element} className="me-1" />}
              {titleTooltip ? (
                <OverlayTrigger
                  placement="bottom"
                  overlay={<Tooltip id="detail-card-title-tooltip">{titleTooltip}</Tooltip>}
                >
                  <span>{title}</span>
                </OverlayTrigger>
              ) : (
                <span>{title}</span>
              )}
            </div>
            {element && !element.isNew && <ElementCollectionLabels element={element} placement="right" />}
            {titleAppendix}
          </div>
          <div className="d-flex gap-1 align-items-center">
            {headerToolbar}
            {canCopy && (
              <CopyElementModal element={element} />
            )}
            {shouldShowSave && (
              <>
                {detailHeaderButton(saveCloseButtonProps)}
                {detailHeaderButton(saveButtonProps)}
              </>
            )}
            <CloseButton onClick={(event) => requestClose(event, false, 'bottom')} />
          </div>
        </div>
      </Card.Header>
      <div className="detail-card__scroll-container">
        <Card.Body>
          {children}
        </Card.Body>
        {(footerToolbar || hasSave) && (
          <Card.Footer className="py-3">
            <div className="d-flex justify-content-end gap-1">
              <Button
                onClick={(event) => requestClose(event, false, 'top')}
                variant="ghost"
              >
                Close
              </Button>
              {footerToolbar}
              {hasSave && (
                detailFooterButton(footerSaveButtonProps)
              )}
            </div>
          </Card.Footer>
        )}
      </div>
      <Overlay
        target={closeOverlayTarget}
        show={showCloseOverlay}
        placement={closeOverlayPlacement}
        rootClose
        onHide={() => setShowCloseOverlay(false)}
      >
        {closeOverlay}
      </Overlay>
    </Card>
  );
}

DetailCard.propTypes = {
  children: PropTypes.node.isRequired,
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    element_type: PropTypes.string,
    icon_name: PropTypes.string,
    changed: PropTypes.bool,
    isPendingToSave: PropTypes.bool,
    isNew: PropTypes.bool,
    can_copy: PropTypes.bool,
    tag: PropTypes.shape({
      taggable_data: PropTypes.shape({
        collection_labels: PropTypes.arrayOf(PropTypes.shape({})),
      }),
    }),
    element_klass: PropTypes.shape({
      icon_name: PropTypes.string,
    }),
  }),
  isPendingToSave: PropTypes.bool,
  title: PropTypes.string.isRequired,
  titleTooltip: PropTypes.string,
  titleAppendix: PropTypes.node,
  headerToolbar: PropTypes.node,
  footerToolbar: PropTypes.node,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  onSaveClose: PropTypes.func,
  showSave: PropTypes.bool,
  saveDisabled: PropTypes.bool,
  saveLabel: PropTypes.string,
};

DetailCard.defaultProps = {
  element: null,
  isPendingToSave: undefined,
  titleTooltip: null,
  titleAppendix: null,
  headerToolbar: null,
  footerToolbar: null,
  onClose: null,
  onSave: null,
  onSaveClose: null,
  showSave: undefined,
  saveDisabled: false,
  saveLabel: null,
};
