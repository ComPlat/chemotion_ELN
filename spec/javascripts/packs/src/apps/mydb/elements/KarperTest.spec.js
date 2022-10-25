import ResearchPlanFactory from 'factories/ResearchPlanFactory';
import sinon from 'sinon';
import toMatchSnapshot from 'expect-mocha-snapshot';
import expect from 'expect';
import PseudoRandomUUIDGenerator from 'factories/PseudoRandomUUIDGenerator';
import Element from '../../../../../../../app/packs/src/models/Element';

describe('KarperTest', () => {
  it('gekarpert', async function () {
    const rp1 = await ResearchPlanFactory.build('with_not_image_body_field', {}, { reset: true });

    expect.extend({ toMatchSnapshot });
    expect(rp1).toMatchSnapshot(this);
  });
});
