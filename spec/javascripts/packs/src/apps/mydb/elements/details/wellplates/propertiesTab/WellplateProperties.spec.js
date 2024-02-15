/* global describe, context, it, beforeEach, afterEach */

import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';


import _ from 'lodash';
import { ButtonToolbar, DropdownButton, MenuItem, OverlayTrigger, Popover, Button } from 'react-bootstrap';

import QuillEditor from 'src/components/QuillEditor';

 import WellplateProperties from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateProperties';
 import sinon from 'sinon';
Enzyme.configure({
    adapter: new Adapter(),
});

describe('WellplateProperties', async () => {
    describe('constructor()', async () => {
        context('when wellplate is of size 3x5', async () => {
            const wrapper = shallow(<WellplateProperties 
                changeProperties={()=>{}}
                handleAddReadout={()=>{}}
                handleRemoveReadout={()=>{}}
                name="MyWellPlate"
                size="15"
                description="MyDescription"
                readoutTitles={[]}
                
                />);


            it('component is correct initialized', async () => {
                //console.log(wrapper.html());
            });
        });
    });
});