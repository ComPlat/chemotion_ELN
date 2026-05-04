import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import { TreeSelect } from 'antd';

import {
  buildSelectionTree,
  filterMenuByLayout,
} from '../utils/compareSelectionTree';

const titleFromContainer = (container) => container?.name || 'Compare spectra';

const CompareSpectraHeader = ({
  sample,
  container,
  originalAnalyses,
  showUndo,
  onSelectionChange,
  onUndo,
  onClose,
}) => {
  const { menuItems, selectedFiles } = useMemo(
    () => buildSelectionTree(sample, container),
    [sample, container],
  );

  const refAnalyses = useMemo(
    () => originalAnalyses || container?.extended_metadata?.analyses_compared,
    [originalAnalyses, container],
  );

  const filteredMenu = useMemo(() => {
    if (!Array.isArray(refAnalyses) || refAnalyses.length === 0) return menuItems;
    const selectedLayout = refAnalyses?.[0]?.layout || null;
    return filterMenuByLayout(menuItems, selectedLayout);
  }, [menuItems, refAnalyses]);

  const handleChange = (value, _label, info) => {
    onSelectionChange?.(filteredMenu, value, info);
  };

  return (
    <Modal.Header className="justify-content-between align-items-baseline">
      <span className="fs-3">{titleFromContainer(container)}</span>
      <div className="d-flex gap-1 align-items-center">
        <TreeSelect
          style={{ width: 800 }}
          placeholder="Select spectra to compare"
          treeCheckable
          treeData={filteredMenu}
          value={selectedFiles}
          onChange={handleChange}
          maxTagCount={2}
          getPopupContainer={(triggerNode) => triggerNode.parentNode}
        />
        <Button
          className="ms-auto"
          size="sm"
          variant="danger"
          onClick={onUndo}
          style={{ display: showUndo ? 'inline-block' : 'none' }}
          title="Undo unsaved changes"
        >
          <i className="fa fa-undo" />
        </Button>
      </div>
      <Button variant="danger" size="sm" onClick={onClose}>
        <i className="fa fa-times me-1" />
        Close without Save
      </Button>
    </Modal.Header>
  );
};

CompareSpectraHeader.propTypes = {
  sample: PropTypes.object.isRequired,
  container: PropTypes.object,
  originalAnalyses: PropTypes.array,
  showUndo: PropTypes.bool,
  onSelectionChange: PropTypes.func.isRequired,
  onUndo: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

CompareSpectraHeader.defaultProps = {
  container: null,
  originalAnalyses: null,
  showUndo: false,
};

export default CompareSpectraHeader;
