import React, {useCallback, useState} from 'react';
import {Form} from 'react-bootstrap';

function ToggleSwitch({isChecked, setIsChecked, label}) {

    const handleChange = useCallback(() => {
        setIsChecked(!isChecked);
    });

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
}

const FileTree = ({treeData}) => {
    return (
        <ul style={{overflow: 'auto'}}>
            {treeData.map((node, idx) => (
                <TreeNode key={idx} node={node}/>
            ))}
        </ul>
    );
};

const TreeNode = ({node}) => {
    if (node.marked) {
        return null;
    }
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.isDirectory;

    const handleClick = useCallback(() => setExpanded(!expanded));
    const onDragStart = useCallback((e) => {
        e.dataTransfer.setData("text/plain", node.fullPath);
        // optionally, set a drag image or effect
        e.dataTransfer.effectAllowed = 'move';
    });

    return (
        <li>
            <div
                style={{
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                }}
                draggable
                onDragStart={onDragStart}
                onClick={handleClick}>
                {hasChildren ? (expanded ? '📂' : '📁') : '📄'} {node.name}
            </div>
            {hasChildren && expanded && (
                <ul style={{marginLeft: '1rem'}}>
                    {node.subFiles.map((child, idx) => (
                        <TreeNode key={idx} node={child}/>
                    ))}
                </ul>
            )}
        </li>
    );
};

function DatasetDropZone({droppedPaths, setDroppedPaths}) {

    const onDragOver = useCallback((e) => {
        e.preventDefault();              // allow drop
        e.dataTransfer.dropEffect = 'move';
    });

    const onDrop = useCallback((e) => {
        e.preventDefault();
        const path = e.dataTransfer.getData('text/plain');
        const newDroppedPaths = droppedPaths.filter((p) => !p.startsWith(path))
        if (path) {
            setDroppedPaths([...newDroppedPaths, path]);
        }
    });

    const removePath = useCallback((pathToRemove) => {
        setDroppedPaths(droppedPaths.filter((p) => p !== pathToRemove));
    });

    return (
        <div
            className="dataset-drop-zone"
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <strong>Drop files here:</strong>
            <ul style={{overflow: 'auto'}}>
                {droppedPaths.map((p, i) => (
                    <li key={i}>
                        <span>{p}</span>
                        <button
                            className="dataset-drop-zone-rm-btn"
                            onClick={() => removePath(p)}
                            title="Remove"
                        >
                            ❌
                        </button>

                    </li>
                ))}
            </ul>
        </div>
    );
}

export {
    ToggleSwitch,
    FileTree,
    DatasetDropZone
};