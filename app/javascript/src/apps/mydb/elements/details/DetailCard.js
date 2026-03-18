import React from 'react';
import PropTypes from 'prop-types';
import { Card, CloseButton, Button } from 'react-bootstrap';
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
  titleText,
  titleAppendix,
  headerToolbar,
  footerToolbar,
  onClose,
  onSave,
  onSaveClose,
  onCopy,
  saveDisabled,
  saveLabel,
  confirmOnHeaderClose,
}) {
  const pendingToSave = typeof isPendingToSave === 'boolean'
    ? isPendingToSave
    : !!(element && (element.isPendingToSave || element.changed));
  const className = `detail-card${pendingToSave ? ' detail-card--unsaved' : ''}`;
  const hasSave = typeof onSave === 'function';
  const shouldConfirmOnHeaderClose = typeof confirmOnHeaderClose === 'boolean'
    ? confirmOnHeaderClose
    : hasSave;
  const inferredSaveLabel = saveLabel || (element && element.isNew ? 'Create' : 'Save');
  const canUseStandardCopy = !!(element && element.can_copy && !element.isNew);

  const handleClose = (forceClose = false) => {
    if (onClose) {
      onClose();
    }
    if (element) {
      DetailActions.close(element, forceClose);
    }
  };

  const handleSaveClose = () => {
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

  const saveCloseButtonProps = {
    onClick: handleSaveClose,
    disabled: saveDisabled,
    label: `${inferredSaveLabel} and Close`,
    iconClass: 'fa fa-floppy-o combi-icon-close',
  };

  const copyButtonProps = {
    id: 'copy-element-btn',
    onClick: onCopy,
    iconClass: 'fa fa-clone',
  };

  return (
    <Card className={className}>
      <Card.Header>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              {element && <ElementIcon element={element} className="me-1" />}
              <span>{titleText}</span>
            </div>
            {element && !element.isNew && <ElementCollectionLabels element={element} placement="right" />}
            {titleAppendix}
          </div>
          <div className="d-flex gap-1 align-items-center">
            {headerToolbar}
            {canUseStandardCopy && (
              <CopyElementModal element={element} onCopyComplete={onCopy} />
            )}
            {hasSave && (
              <>
                {detailHeaderButton(saveCloseButtonProps)}
                {detailHeaderButton(saveButtonProps)}
              </>
            )}
            {!canUseStandardCopy && typeof onCopy === 'function' && (
              detailHeaderButton(copyButtonProps)
            )}
            <CloseButton onClick={() => handleClose(!shouldConfirmOnHeaderClose)} />
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
                onClick={handleClose}
                variant="ghost"
              >
                Close
              </Button>
              {hasSave && (
                detailFooterButton(saveButtonProps)
              )}
              {footerToolbar}
            </div>
          </Card.Footer>
        )}
      </div>
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
  titleText: PropTypes.string.isRequired,
  titleAppendix: PropTypes.node,
  headerToolbar: PropTypes.node,
  footerToolbar: PropTypes.node,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  onSaveClose: PropTypes.func,
  onCopy: PropTypes.func,
  saveDisabled: PropTypes.bool,
  saveLabel: PropTypes.string,
  confirmOnHeaderClose: PropTypes.bool,
};

DetailCard.defaultProps = {
  element: null,
  isPendingToSave: undefined,
  titleAppendix: null,
  headerToolbar: null,
  footerToolbar: null,
  onClose: null,
  onSave: null,
  onSaveClose: null,
  onCopy: null,
  saveDisabled: false,
  saveLabel: null,
  confirmOnHeaderClose: undefined,
};
