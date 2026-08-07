import React, { useCallback, useState } from 'react';
import { Button, Form } from 'react-bootstrap';

const ToggleSwitch = ({ isChecked, setIsChecked, label }) => {
  const handleChange = useCallback(() => {
    setIsChecked(!isChecked);
  }, [isChecked, setIsChecked]);

  return (
    <Form>
      <Form.Check
        type="switch"
        id="custom-switch"
        label={label}
        checked={isChecked}
        onChange={handleChange}
      />
    </Form>
  );
};

const TreeNode = ({ node }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.isDirectory;

  const handleClick = useCallback(() => setExpanded((prev) => !prev), []);
  const onDragStart = useCallback((e) => {
    e.dataTransfer.setData('text/plain', node.fullPath);
    e.dataTransfer.effectAllowed = 'move';
  }, [node.fullPath]);

  if (node.marked) {
    return null;
  }

  return (
    <li>
      <div
        role="button"
        draggable
        onDragStart={onDragStart}
        onClick={handleClick}
      >
        {hasChildren
          ? (expanded ? <i className="fa fa-folder-open me-1" /> : <i className="fa fa-folder me-1" />)
          : <i className="fa fa-file me-1" />}
        {node.name}
      </div>
      {hasChildren && expanded && (
        <ul style={{ marginLeft: '1rem' }}>
          {node.subFiles.map((child, idx) => (
            <TreeNode key={idx} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

const FileTree = ({ treeData }) => (
  <ul style={{ overflow: 'auto' }}>
    {treeData.map((node, idx) => (
      <TreeNode key={idx} node={node} />
    ))}
  </ul>
);

const DatasetDropZone = ({ droppedPaths, setDroppedPaths }) => {
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const path = e.dataTransfer.getData('text/plain');
    const newDroppedPaths = droppedPaths.filter((p) => !p.startsWith(path));
    if (path) {
      setDroppedPaths([...newDroppedPaths, path]);
    }
  }, [droppedPaths, setDroppedPaths]);

  const removePath = useCallback((pathToRemove) => {
    setDroppedPaths(droppedPaths.filter((p) => p !== pathToRemove));
  }, [droppedPaths, setDroppedPaths]);

  return (
    <div
      className="dataset-drop-zone"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <strong>Drop files and/or folders here</strong>
      <ul style={{ overflow: 'auto' }}>
        {droppedPaths.map((p, i) => (
          <li key={i}>
            <span>{p}</span>
            <Button
              variant="danger"
              size="xxsm"
              className="dataset-drop-zone-rm-btn"
              onClick={() => removePath(p)}
              title="Remove"
            >
              <i className="fa fa-close" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export {
  ToggleSwitch,
  FileTree,
  DatasetDropZone
};
