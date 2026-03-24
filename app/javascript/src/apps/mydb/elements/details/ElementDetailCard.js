import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Overlay,
  Tooltip,
  ButtonToolbar,
} from 'react-bootstrap';
import ElementIcon from 'src/components/common/ElementIcon';
import CopyElementModal from 'src/components/common/CopyElementModal';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { ShowUserLabels } from 'src/components/UserLabels';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import {
  detailHeaderButton,
  detailFooterButton,
} from 'src/apps/mydb/elements/details/DetailCardButton';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';

export default function ElementDetailCard({
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
  saveDisabled,
  showPrintCode,
  showCalendar,
  showUserLabels,
  showHeaderCommentSection,
}) {
  const [showCloseOverlay, setShowCloseOverlay] = React.useState(false);
  const [closeOverlayTarget, setCloseOverlayTarget] = React.useState(null);
  const [closeOverlayPlacement, setCloseOverlayPlacement] = React.useState('bottom');

  // Get the correct eventableType for calendar API
  const getEventableType = (el) => {
    // Map element types to calendar API eventableType values
    const typeMap = {
      sample: 'Sample',
      reaction: 'Reaction',
      screen: 'Screen',
      wellplate: 'Wellplate',
      research_plan: 'ResearchPlan',
      cell_line: 'CellLine',
      device: 'DeviceDescription',
      // Generic elements use a different pattern
    };

    const elementType = el.type || el.element_type;

    // Handle generic elements (Labimotion)
    if (el.element_klass) {
      return 'Labimotion::Element';
    }

    // Handle sequence-based macromolecule samples
    if (elementType === 'sequence_based_macromolecule_sample') {
      return 'SequenceBasedMacromoleculeSample';
    }

    return typeMap[elementType] || elementType;
  };

  const pendingToSave = typeof isPendingToSave === 'boolean'
    ? isPendingToSave
    : !!(element.isPendingToSave || element.changed);

  const inferredSaveLabel = element.isNew ? 'Create' : 'Save';
  const canCopy = !!(element.can_copy && !element.isNew);

  const handleClose = (forceClose = false) => {
    setShowCloseOverlay(false);
    if (onClose) {
      onClose();
    }
    DetailActions.close(element, forceClose);
  };

  const handleSaveClose = () => {
    setShowCloseOverlay(false);
    onSave();
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
    <Overlay
      target={closeOverlayTarget}
      show={showCloseOverlay}
      placement={closeOverlayPlacement}
      rootClose
      onHide={() => setShowCloseOverlay(false)}
    >
      <Tooltip id="detail-card-close-overlay">
        <div className="p2">
          You have unsaved changes. Save before closing?
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
    </Overlay>
  );

  // Build title icon with ElementIcon
  const titleIcon = <ElementIcon element={element} />;

  // Build title appendix with element labels + user labels + original appendix
  const elementTitleAppendix = (
    <>
      {!element.isNew && <ElementCollectionLabels element={element} placement="right" />}
      {showUserLabels && <ShowUserLabels element={element} />}
      {titleAppendix}
    </>
  );

  // Build header toolbar with header comment + print/calendar buttons + copy + save buttons + original toolbar
  const elementHeaderToolbar = (
    <>
      {showHeaderCommentSection && <HeaderCommentSection element={element} />}
      {headerToolbar}
      {showPrintCode && <PrintCodeButton element={element} />}
      {showCalendar && !element.isNew && (
        <OpenCalendarButton
          isPanelHeader
          eventableId={element.id}
          eventableType={getEventableType(element)}
        />
      )}
      {canCopy && (
        <CopyElementModal element={element} />
      )}
      {pendingToSave && (
        <>
          {detailHeaderButton(saveCloseButtonProps)}
          {detailHeaderButton(saveButtonProps)}
        </>
      )}
    </>
  );

  // Build footer toolbar with close + save buttons + original toolbar
  const elementFooterToolbar = (
    <>
      <Button
        onClick={(event) => requestClose(event, false, 'top')}
        variant="ghost"
      >
        Close
      </Button>
      {footerToolbar}
      {detailFooterButton(footerSaveButtonProps)}
    </>
  );

  return (
    <DetailCard
      title={title}
      titleIcon={titleIcon}
      titleTooltip={titleTooltip}
      titleAppendix={elementTitleAppendix}
      headerToolbar={elementHeaderToolbar}
      footerToolbar={elementFooterToolbar}
      onClose={(event) => requestClose(event, false, 'bottom')}
      className={pendingToSave ? 'detail-card--unsaved' : ''}
    >
      {children}
      {closeOverlay}
    </DetailCard>
  );
}

ElementDetailCard.propTypes = {
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
  }).isRequired,
  isPendingToSave: PropTypes.bool,
  title: PropTypes.string.isRequired,
  titleTooltip: PropTypes.string,
  titleAppendix: PropTypes.node,
  headerToolbar: PropTypes.node,
  footerToolbar: PropTypes.node,
  onClose: PropTypes.func,
  onSave: PropTypes.func.isRequired,
  saveDisabled: PropTypes.bool,
  showPrintCode: PropTypes.bool,
  showCalendar: PropTypes.bool,
  showUserLabels: PropTypes.bool,
  showHeaderCommentSection: PropTypes.bool,
};

ElementDetailCard.defaultProps = {
  isPendingToSave: undefined,
  titleTooltip: null,
  titleAppendix: null,
  headerToolbar: null,
  footerToolbar: null,
  onClose: null,
  saveDisabled: false,
  showPrintCode: false,
  showCalendar: false,
  showUserLabels: true,
  showHeaderCommentSection: true,
};
