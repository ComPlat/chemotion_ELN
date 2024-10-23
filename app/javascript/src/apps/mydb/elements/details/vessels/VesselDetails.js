import React, { useState, useContext, useEffect } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import CollectionUtils from 'src/models/collection/CollectionUtils';

import {
    ButtonToolbar, Button, Card,
    Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import GeneralProperties from 'src/apps/mydb/elements/details/cellLines/propertiesTab/GeneralProperties';
import AnalysesContainer from 'src/apps/mydb/elements/details/cellLines/analysesTab/AnalysesContainer';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';

const VesselDetails = ({ cellLineItem, toggleFullScreen }) => {
    const context = useContext(StoreContext);

    const [activeTab, setActiveTab] = useState('tab1');
    const [readOnly, setReadOnly] = useState(isReadOnly());

    useEffect(() => {
        context.cellLineDetailsStore.convertCellLineToModel(cellLineItem);
        setReadOnly(isReadOnly());
    }, [cellLineItem]);

    const handleSubmit = (cellLineItem) => {
        const mobXItem = context.cellLineDetailsStore.cellLines(cellLineItem.id);
        cellLineItem.adoptPropsFromMobXModel(mobXItem);

        if (cellLineItem.is_new) {
            DetailActions.close(cellLineItem, true);
            ElementActions.createCellLine(cellLineItem);
        } else {
            ElementActions.updateCellLine(cellLineItem);
        }
        mobXItem.setChanged(false);
    };

    const handleClose = (cellLineItem) => {
        const { cellLineDetailsStore } = context;
        const mobXItem = cellLineDetailsStore.cellLines(cellLineItem.id);
        if (!mobXItem.changed || window.confirm('Unsaved data will be lost. Close sample?')) {
            cellLineDetailsStore.removeCellLineFromStore(cellLineItem.id);
            DetailActions.close(cellLineItem, true);
        }
    };

    const handleTabChange = (eventKey) => {
        setActiveTab(eventKey);
    };

    const isReadOnly = () => {
        const { currentCollection, isSync } = UIStore.getState();
        const { currentUser } = UserStore.getState();
        return CollectionUtils.isReadOnly(currentCollection, currentUser.id, isSync);
    };

    const renderHeaderContent = () => (
        <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex gap-2">
                <span>
                    <i className="icon-cell_line me-1" />
                    {cellLineItem.short_label}
                </span>
                <ElementCollectionLabels
                    className="collection-label"
                    element={cellLineItem}
                    key={cellLineItem.id}
                    placement="right"
                />
            </div>
            <div className="d-flex gap-1">
                {renderSaveButton(true)}
                {renderSaveButton()}
                {renderEnlargenButton()}
                {renderCloseHeaderButton()}
            </div>
        </div>
    );

    const renderEnlargenButton = () => (
        <Button
            variant="info"
            size="xxsm"
            onClick={toggleFullScreen}
        >
            <i className="fa fa-expand" />
        </Button>
    );

    const renderSaveButton = (closeAfterClick = false) => {
        const { cellLineDetailsStore } = context;
        const mobXItem = cellLineDetailsStore.cellLines(cellLineItem.id);
        const validationInfo = cellLineDetailsStore.checkInputValidity(cellLineItem.id);
        const disabled = validationInfo.length > 0 || !mobXItem.changed;
        if (disabled) { return null; }

        const action = closeAfterClick
            ? () => { handleSubmit(cellLineItem); DetailActions.close(cellLineItem, true); }
            : () => { handleSubmit(cellLineItem); };

        const toolTipMessage = closeAfterClick ? 'save and close' : 'save';
        const icons = closeAfterClick
            ? (
                <div>
                    <i className="fa fa-floppy-o" />
                    <i className="fa fa-times" />
                </div>
            )
            : <i className="fa fa-floppy-o" />;

        return (
            <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip>{toolTipMessage}</Tooltip>}
            >
                <Button disabled={disabled} variant="warning" size="xxsm" onClick={action}>
                    {icons}
                </Button>
            </OverlayTrigger>
        );
    };

    const renderCloseHeaderButton = () => (
        <Button
            variant="danger"
            size="xxsm"
            onClick={() => { handleClose(cellLineItem); }}
        >
            <i className="fa fa-times" />
        </Button>
    );

    const renderSubmitButton = () => {
        const { cellLineDetailsStore } = context;
        const mobXItem = cellLineDetailsStore.cellLines(cellLineItem.id);
        const validationInfo = cellLineDetailsStore.checkInputValidity(cellLineItem.id);
        const disabled = validationInfo.length > 0 || !mobXItem.changed;
        const buttonText = cellLineItem.is_new ? 'Create' : 'Save';

        return (
            <Button
                variant="warning"
                disabled={disabled}
                onClick={() => { handleSubmit(cellLineItem); }}
            >
                {buttonText}
            </Button>
        );
    };

    if (!cellLineItem) return null;

    return (
        <Card className="detail-card">
            <Card.Header>
                {renderHeaderContent()}
            </Card.Header>
            <Card.Body>
                <div className="tabs-container--with-borders">
                    <Tabs activeKey={activeTab} onSelect={handleTabChange} id="cell-line-details-tab">
                        <Tab eventKey="tab1" title="Properties" key="tab1">
                            <GeneralProperties item={cellLineItem} readOnly={readOnly} />
                        </Tab>
                        <Tab eventKey="tab2" title="Analyses" key="tab2">
                            <AnalysesContainer item={cellLineItem} readOnly={readOnly} />
                        </Tab>
                        <Tab eventKey="tab3" title="References" key="tab3" disabled={cellLineItem.is_new}>
                            <DetailsTabLiteratures
                                readOnly={readOnly}
                                element={cellLineItem}
                                literatures={cellLineItem.is_new ? cellLineItem.literatures : null}
                            />
                        </Tab>
                    </Tabs>
                </div>
                <ButtonToolbar className="d-flex gap-1">
                    <Button variant="primary" onClick={() => { handleClose(cellLineItem); }}>
                        Close
                    </Button>
                    {renderSubmitButton()}
                </ButtonToolbar>
            </Card.Body>
        </Card>
    );
};

VesselDetails.propTypes = {
    cellLineItem: PropTypes.shape({
        id: PropTypes.string.isRequired,
        itemName: PropTypes.string.isRequired,
        cellLineName: PropTypes.string.isRequired,
        short_label: PropTypes.string.isRequired,
        is_new: PropTypes.bool.isRequired,
        literatures: PropTypes.arrayOf(PropTypes.object),
        disease: PropTypes.string.isRequired
    }).isRequired,
    toggleFullScreen: PropTypes.func.isRequired
};

export default observer(VesselDetails);
