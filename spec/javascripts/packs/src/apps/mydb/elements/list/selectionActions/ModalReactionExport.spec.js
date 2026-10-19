import expect from 'expect';
import sinon from 'sinon';
import { List } from 'immutable';
import { describe, it, afterEach } from 'mocha';
import ModalReactionExport from 'src/apps/mydb/elements/list/selectionActions/ModalReactionExport';
import UIStore from 'src/stores/alt/stores/UIStore';
import ReportsFetcher from 'src/fetchers/ReportsFetcher';

const selection = (checkedAll) => ({ checkedIds: List(), uncheckedIds: List([7]), checkedAll });

describe('ModalReactionExport', () => {
  afterEach(() => sinon.restore());

  it('sends the list filters with a select-all reaction SMILES export', () => {
    sinon.stub(UIStore, 'getState').returns({
      currentCollection: { id: 3 },
      sample: selection(false),
      reaction: selection(true),
      wellplate: selection(false),
      userLabel: 5,
      fromDate: '2026-01-02T00:00:00Z',
      toDate: null,
      filterCreatedAt: true,
      productOnly: false,
    });
    const download = sinon.stub(ReportsFetcher, 'createDownloadFile');

    new ModalReactionExport({ onHide: () => {} }).handleClick();

    const { uiState } = download.firstCall.args[0];
    expect(uiState).toMatchObject({
      reaction: { checkedIds: [], uncheckedIds: [7], checkedAll: true },
      currentCollection: 3,
      userLabel: 5,
      fromDate: Date.UTC(2026, 0, 2) / 1000,
      toDate: null,
      filterCreatedAt: true,
      productOnly: false,
    });
    expect(download.firstCall.args[2]).toEqual('export_reactions_from_selections');
  });
});
