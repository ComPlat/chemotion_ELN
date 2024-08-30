// eslint-disable-next-line max-classes-per-file
import React, { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';
import CustomSizeModal from 'src/apps/mydb/elements/details/wellplates/propertiesTab/CustomSizeModal';

const Option = (width, height) => {
  const size = height * width
  const label = size === 0 ? 'not yet chosen' : `${size} (${width}x${height})`
  const value = `${width} ${height}`

  return (<option key={`${label}-${value}`} label={label} value={value} />)
}

const WellplateSizeDropdown = ({ wellplate, updateWellplate }) => {
  const size = `${wellplate.width} ${wellplate.height}`
  const [showCustomSizeModal, setShowCustomSizeModal] = useState(false)
  const shouldBeDisabled = !wellplate.is_new && wellplate.originalSize > 0

  const onChange = (event) => {
    const values = event.target.value.split(" ").map(x => parseInt(x, 10))
    const width = values[0]
    const height = values[1]

    updateWellplate({ type: 'size', value: { width: width, height: height } });
  }

  const options = [
    Option(0, 0),
    Option(24, 16),
    Option(12, 8),
    Option(6, 4),
    Option(4, 3)
  ]

  return (
    <>
      <CustomSizeModal
        show={showCustomSizeModal}
        wellplate={wellplate}
        updateWellplate={updateWellplate}
        handleClose={() => setShowCustomSizeModal(false)}
        key={`${wellplate.id}-custom-size-modal`}
      />
      <InputGroup>
        <Form.Select
          required={true}
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
    </>
  );
}

WellplateSizeDropdown.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  updateWellplate: PropTypes.func.isRequired,
};

export default WellplateSizeDropdown
