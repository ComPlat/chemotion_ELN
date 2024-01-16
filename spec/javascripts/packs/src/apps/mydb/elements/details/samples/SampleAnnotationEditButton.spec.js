import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import SampleAnnotationEditButton from 'src/apps/mydb/elements/details/samples/SampleAnnotationEditButton';

import SampleFactory from 'factories/SampleFactory';

Enzyme.configure({ adapter: new Adapter() });

describe('SampleAnnotationEditButton', () => {
  const sample = SampleFactory.build('water_100g');
  sample.sample_svg_file = 'some-file'
  sample.isNew = false
  const clickHandler = () => {};

  describe('.render()', () => {
    context('with not persisted sample', () => {
      sample.isNew = true
      const wrapper = shallow(<SampleAnnotationEditButton sample={sample} clickHandler={clickHandler} />);

      it('renders a disabled button', () => {
        expect(wrapper.html())
          .toEqual('<span class=""><button disabled="" style="pointer-events:none" type="button" '
            + 'class="btn btn-xs btn-warning"><i class="fa fa-pencil" aria-hidden="true"></i></button></span>');
      });
    });

    context('with persisted sample', () => {
      sample.isNew = false
      const wrapper = shallow(<SampleAnnotationEditButton sample={sample} clickHandler={clickHandler} />);

      it('renders an enabled button', () => {
        expect(wrapper.html())
          .toEqual('<button type="button" class="btn btn-xs btn-warning">'
            + '<i class="fa fa-pencil" aria-hidden="true"></i></button>');
      });
    });

    context('with no sample', () => {
      const wrapper = shallow(<SampleAnnotationEditButton sample={null} clickHandler={clickHandler} />);

      it('renders nothing', () => {
        expect(wrapper.html()).toEqual(null);
      });
    });

    context('without sample_svg_file', () => {
      sample.sample_svg_file = null
      const wrapper = shallow(<SampleAnnotationEditButton sample={sample} clickHandler={clickHandler} />);

      it('renders nothing', () => {
        expect(wrapper.html()).toEqual(null);
      });
    });
  });
});
