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
        <ul>
            {treeData.map((node, idx) => (
                <TreeNode key={idx} node={node}/>
            ))}
        </ul>
    );
};

const TreeNode = ({node}) => {
    if(node.marked) {
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
                draggable
                onDragStart={onDragStart}
                onClick={handleClick} style={{cursor: 'pointer'}}>
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
            onDragOver={onDragOver}
            onDrop={onDrop}
            style={{
                minHeight: '57px',
                border: '2px dashed #bbb',
                borderRadius: '4px',
                padding: '7px',
            }}
        >
            <strong>Drop files here:</strong>
            <ul>
                {droppedPaths.map((p, i) => (
                    <li key={i}>
                        <span>{p}</span>
                        <button
                            onClick={() => removePath(p)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#c00',
                                cursor: 'pointer',
                                fontSize: '1rem',
                            }}
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