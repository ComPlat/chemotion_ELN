// eslint-disable-next-line max-classes-per-file
import React, { useState } from 'react';
import {
  Button, Form, InputGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';
import CustomSizeModal from 'src/apps/mydb/elements/details/wellplates/propertiesTab/CustomSizeModal';

const STANDARD_SIZES = [[0, 0], [24, 16], [12, 8], [6, 4], [4, 3]];

const Option = (width, height, wellplate) => {
  const size = height * width;
  const baseLabel = size === 0 ? 'Define later' : `${size} (${width}x${height})`;
  const value = `${width} ${height}`;
  // Offering a size that would silently delete filled wells is the whole
  // hazard here - "Define later" in particular used to wipe every placed
  // sample without a word.
  const wouldDropData = wellplate.occupiedWellsOutside(width, height).length > 0;
  const label = wouldDropData ? `${baseLabel} - would delete filled wells` : baseLabel;

  return (<option key={`${label}-${value}`} label={label} value={value} disabled={wouldDropData} />);
};

const WellplateSizeDropdown = ({ wellplate, updateWellplate }) => {
  const size = `${wellplate.width} ${wellplate.height}`;
  const [showCustomSizeModal, setShowCustomSizeModal] = useState(false);
  // Resizing a saved wellplate is its own persisted step: the server
  // reconciles the well rows and hands back a fresh wellplate that replaces
  // this one, so ANY unsaved edit would be discarded by it - not just an edit
  // to the wells. A wellplate that is not saved yet resizes in memory, with
  // nothing to lose.
  const hasUnsavedChanges = !wellplate.isNew && (wellplate.isEdited || wellplate.changed === true);
  const shouldBeDisabled = wellplate.isReadOnly || hasUnsavedChanges;

  const unsavedReason = wellplate.hasPendingWellChanges
    ? 'Save your changes to the wells before changing the size.'
    : 'Save your changes before changing the size.';
  const disabledReason = wellplate.isReadOnly ? 'You cannot edit this wellplate.' : unsavedReason;

  const onChange = (event) => {
    if (shouldBeDisabled) { return; }

    const values = event.target.value.split(' ').map((x) => parseInt(x, 10));
    const width = values[0];
    const height = values[1];

    updateWellplate({ type: 'size', value: { width, height } });
  };

  const isStandardSize = STANDARD_SIZES.some(([w, h]) => w === wellplate.width && h === wellplate.height);

  const options = STANDARD_SIZES.map(([w, h]) => Option(w, h, wellplate));
  if (!isStandardSize) {
    options.push(Option(wellplate.width, wellplate.height, wellplate));
  }

  const inputGroup = (
    // A disabled control emits no mouse events and they do not bubble, so the
    // OverlayTrigger below would never fire on it. Muting pointer events here
    // lets the hover land on the wrapper span instead.
    <InputGroup style={shouldBeDisabled ? { pointerEvents: 'none' } : undefined}>
      <Form.Select
        required
        value={size}
        onChange={onChange}
        disabled={shouldBeDisabled}
      >
        {options}
      </Form.Select>
      <Button
        className="create-own-size-button"
        disabled={shouldBeDisabled}
        onClick={() => setShowCustomSizeModal(true)}
      >
        <i className="fa fa-braille" />
      </Button>
    </InputGroup>
  );

  return (
    <>
      <CustomSizeModal
        show={showCustomSizeModal}
        wellplate={wellplate}
        updateWellplate={updateWellplate}
        handleClose={() => setShowCustomSizeModal(false)}
        key={`${wellplate.id}-custom-size-modal`}
      />
      {shouldBeDisabled ? (
        <OverlayTrigger
          placement="bottom"
          overlay={(
            <Tooltip id={`wellplate-${wellplate.id}-size-locked-tooltip`}>
              {disabledReason}
            </Tooltip>
          )}
        >
          {/* The wrapper has to be focusable so keyboard users can reach the
              explanation too; the control it describes is disabled and cannot
              take focus itself. This is the standard recipe for a tooltip on a
              disabled control. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <span className="d-inline-block w-100" tabIndex={0}>
            {inputGroup}
          </span>
        </OverlayTrigger>
      ) : inputGroup}
    </>
  );
};

WellplateSizeDropdown.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  updateWellplate: PropTypes.func.isRequired,
};

export default WellplateSizeDropdown;
