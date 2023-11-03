/* global describe, context, it */

import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import Attachment from 'src/models/Attachment';

Enzyme.configure({ adapter: new Adapter() });

describe('ImageAnnotationEditButton', () => {
  const pngAttachment = new Attachment({ filename: 'example.png' });
  const gifAttachment = new Attachment({ filename: 'example.gif' });
  const parent = {};

  describe('.render()', () => {
    context('with not persisted attachment(png)', () => {
      pngAttachment.isNew = true;
      const wrapper = shallow(<ImageAnnotationEditButton attachment={pngAttachment} parent={parent} />);

      it('button is rendered but disabled', () => {
        expect(wrapper.html())
          .toEqual('<span class=""><button disabled="" type="button" '
           + 'class="btn btn-xs btn-warning"><i class="fa fa-pencil" aria-hidden="true"></i></button></span>');
      });
    });

    context('with persisted attachment(png)', () => {
      pngAttachment.isNew = false;
      const wrapper = shallow(<ImageAnnotationEditButton attachment={pngAttachment} parent={parent} />);

      it('button is rendered and not disabled', () => {
        expect(wrapper.html())
          .toEqual('<button type="button" class="btn btn-xs btn-warning">'
           + '<i class="fa fa-pencil" aria-hidden="true"></i></button>');
      });
    });

    context('with no attachment', () => {
      const wrapper = shallow(<ImageAnnotationEditButton attachment={null} parent={parent} />);

      it('button is not rendered', () => {
        expect(wrapper.html()).toEqual(null);
      });
    });

    context('with not supported image type(gif)', () => {
      const wrapper = shallow(<ImageAnnotationEditButton attachment={gifAttachment} parent={parent} />);

      it('button is not rendered', () => {
        expect(wrapper.html()).toEqual(null);
      });
    });
  });
});
