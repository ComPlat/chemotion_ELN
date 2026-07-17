import React from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';

const Dropzone = ({
  onDrop, onDropAccepted, onDropRejected, accept, multiple = true, className, style, children,
}) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDropAccepted,
    onDropRejected,
    accept,
    multiple,
  });

  return (
    <div {...getRootProps({ className, style })}>
      <input {...getInputProps()} />
      {children}
    </div>
  );
};

Dropzone.propTypes = {
  onDrop: PropTypes.func,
  onDropAccepted: PropTypes.func,
  onDropRejected: PropTypes.func,
  accept: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
  multiple: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.node,
};

export default Dropzone;
