import React, { Component } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';

const CollapseButton = (props) => {
    const { openTab, setOpenTab } = props;
    const arrow = openTab
        ? <i className="fa fa-angle-double-up" />
        : <i className="fa fa-angle-double-down" />;
    return (
        <ButtonGroup vertical block>
        <Button
            id={props.name}
            bsSize="xsmall"
            style={{ backgroundColor: '#ddd' }}
            onClick={() =>  props.setOpenTab(!openTab)}
        >
            {arrow}
            &nbsp; {props.name}
        </Button>
        </ButtonGroup>
    );
}
export default CollapseButton;
