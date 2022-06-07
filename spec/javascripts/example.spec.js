import React from 'react';
import expect from 'expect';
import Enzyme, { shallow,mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import ImageAnnotationModalSVG from '../../app/packs/src/components/research_plan/ImageAnnotationModalSVG.js';

Enzyme.configure({ adapter: new Adapter() });

beforeEach(() => {

  //

});


afterEach(() => {

  //

});


describe("image annotation modal", () => {

  it("Renders image annotation modal", () => {

    let wrapper= mount((<ImageAnnotationModalSVG
    
    
    /> ));   
    let button=wrapper.find('div');
    console.log(wrapper.debug());
    console.log("------------------");
    console.log(button.debug());
    console.log("------------------");

  });

});
