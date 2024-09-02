import React from 'react';
import { Button } from 'react-bootstrap';

const CollapseButton = (props) => {
    const { openTab, setOpenTab } = props;
    const arrow = openTab
        ? <i className="fa fa-angle-double-up me-1" />
        : <i className="fa fa-angle-double-down me-1" />;
    return (
        <Button
            id={props.name}
            size="xxsm"
            className="w-100 bg-gray-200 text-dark"
            onClick={() =>  setOpenTab(!openTab)}
        >
            {arrow}
            {props.name}
        </Button>
    );
}
export default CollapseButton;
