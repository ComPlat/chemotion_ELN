import expect from 'expect';
import { twoSampleState } from '../../fixture/elementStore';
import alt from 'src/stores/alt/alt';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';

const ElementStore = alt.createStore({}, 'ElementStore');

describe('UItStore', () => {
  beforeEach(() => {
    alt.flush();
    // ElementStore.dispathToken = alt.dispatcher.register(ElementStore.getState);
    ElementStore.getState = () => twoSampleState;
  });

  it('should handleCheckAllElements', () => {
    const payload = {
      type: 'sample',
      range: 'all'
    };
    const { sample } = UIStore.getState();
    const previousCheckedAll = sample.checkedAll;
    UIActions.checkAllElements(payload);
    const newCheckedAll = UIStore.getState().sample.checkedAll;
    expect(previousCheckedAll).toEqual(false);
    expect(newCheckedAll).toEqual(true);
  });
});
