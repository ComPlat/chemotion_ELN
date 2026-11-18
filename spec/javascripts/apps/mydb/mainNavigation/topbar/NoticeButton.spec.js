/* eslint-disable import/no-unresolved,no-undef */
import expect from 'expect';
import sinon from 'sinon';
import { onAction } from 'mobx-state-tree';
import { handleNotification } from 'src/apps/mydb/mainNavigation/topbar/NoticeButton';
import { rootStore } from 'src/stores/mobx/RootStore';
import InboxActions from 'src/stores/alt/actions/InboxActions';

// Minimal notification shape handleNotification actually reads: id, sender_name, created_at,
// subject, and content (data/action/silent). Anything else in a real payload is irrelevant here.
const buildNotification = (overrides = {}) => ({
  id: overrides.id ?? 1,
  sender_name: 'Some User',
  created_at: new Date().toString(),
  subject: overrides.subject ?? null,
  content: { data: 'hello', ...overrides.content },
});

const buildContext = () => ({
  collections: { fetchCollections: sinon.spy(), refreshMySharedCollectionShares: sinon.spy() },
});

describe('NoticeButton#handleNotification', () => {
  // notificationsStore is a protected MobX-state-tree node — its actions can't be swapped out
  // via sinon.spy(obj, 'method') (MST blocks redefining action properties directly), so calls are
  // observed the MST way instead, via onAction middleware.
  let actionCalls;
  let disposeActionListener;

  beforeEach(() => {
    actionCalls = [];
    disposeActionListener = onAction(rootStore.notificationsStore, (call) => {
      actionCalls.push(call);
    });
  });

  afterEach(() => {
    disposeActionListener();
  });

  const addCallCount = () => actionCalls.filter((call) => call.name === 'add').length;
  const removeByUidCalls = () => actionCalls.filter((call) => call.name === 'removeByUid');

  describe('the legacy content.action refresh branch (Blocking #1)', () => {
    it('still refreshes the collections tree for a notification carrying only a legacy action, no subject', () => {
      const context = buildContext();
      const n = buildNotification({ content: { action: 'RefreshChemotionCollection' } });

      handleNotification([n], 'add', context);

      expect(context.collections.fetchCollections.callCount).toBe(1);
    });

    it('still refreshes for the other three legacy action strings', () => {
      const legacyActions = [
        'CollectionActions.fetchRemoteCollectionRoots',
        'CollectionActions.fetchSyncInCollectionRoots',
        'CollectionActions.fetchUnsharedCollectionRoots',
      ];

      legacyActions.forEach((action) => {
        const context = buildContext();
        handleNotification([buildNotification({ content: { action } })], 'add', context);
        expect(context.collections.fetchCollections.callCount).toBe(1);
      });
    });
  });

  describe('silent vs. verbose toasts', () => {
    it('skips the toast for a notification flagged content.silent', () => {
      const context = buildContext();
      const n = buildNotification({ subject: 'Shared Collection With Me', content: { silent: true } });

      handleNotification([n], 'add', context);

      expect(addCallCount()).toBe(0);
      // Silent only means "no toast" — the tree still refreshes.
      expect(context.collections.fetchCollections.callCount).toBe(1);
    });

    it('still toasts a verbose (non-silent) notification', () => {
      const context = buildContext();
      const n = buildNotification({ subject: 'Shared Collection With Me' });

      handleNotification([n], 'add', context);

      expect(addCallCount()).toBe(1);
    });
  });

  // Regression coverage: silent notifications never toast, so counting them toward the toast-spam
  // cap made the "You have N more notifications" summary overcount — the reported symptom was a
  // batch showing "5 notifications" while only a couple of actual toasts (or none) ever appeared.
  describe('the "N more notifications" summary cap', () => {
    const addTitles = () => actionCalls.filter((call) => call.name === 'add').map((call) => call.args[0].title);

    it('does not count silent notifications toward the cap or the summary', () => {
      const context = buildContext();
      const nots = [
        ...Array.from({ length: 2 }, (unused, i) => buildNotification({ id: i, subject: 'Shared Collection With Me' })),
        ...Array.from({ length: 5 }, (unused, i) => buildNotification({
          id: 100 + i, subject: 'Shared Collection With Me', content: { silent: true },
        })),
      ];

      handleNotification(nots, 'add', context);

      // 2 verbose toasts, no "N more" summary (verbose count never exceeds 3).
      expect(addCallCount()).toBe(2);
      expect(addTitles().some((title) => title.includes('more notification'))).toBe(false);
    });

    it('still summarizes correctly when every notification in the batch is verbose (regression guard)', () => {
      const context = buildContext();
      const nots = Array.from({ length: 5 }, (unused, i) => buildNotification({ id: i, subject: 'Shared Collection With Me' }));

      handleNotification(nots, 'add', context);

      // First 3 toast individually, plus one summary toast for the remaining 2 — unchanged from
      // before this fix.
      expect(addCallCount()).toBe(4);
      expect(addTitles()).toContain('You have 2 more notifications');
    });

    it('still dispatches a silent notification\'s action even past where the old cap would have hit', () => {
      const context = buildContext();
      const nots = [
        ...Array.from({ length: 4 }, (unused, i) => buildNotification({ id: i, subject: 'Shared Collection With Me' })),
        buildNotification({ id: 200, content: { silent: true, action: 'InboxActions.fetchInbox' } }),
      ];
      const fetchInboxSpy = sinon.stub(InboxActions, 'fetchInbox');

      try {
        handleNotification(nots, 'add', context);

        expect(fetchInboxSpy.called).toBe(true);
      } finally {
        fetchInboxSpy.restore();
      }
    });
  });

  // The toast-spam cap used to `return` out of the loop, which skipped everything after it: an import
  // notification carrying a report is the one that has to refresh the Inbox, and behind three other
  // notifications it never did, so the report silently never surfaced.
  describe('a notification past the toast cap', () => {
    const batchWithReportLast = () => [
      ...Array.from({ length: 4 }, (unused, i) => buildNotification({ id: i, subject: 'Shared Collection With Me' })),
      buildNotification({ id: 300, content: { report_attachment_id: 42 } }),
    ];

    it('still refreshes the Inbox for the report it carries', () => {
      const context = buildContext();
      const fetchInboxSpy = sinon.stub(InboxActions, 'fetchInbox');

      try {
        handleNotification(batchWithReportLast(), 'add', context);

        expect(fetchInboxSpy.called).toBe(true);
      } finally {
        fetchInboxSpy.restore();
      }
    });

    it('still refreshes the collections tree, whose counts the import changed', () => {
      const context = buildContext();
      const fetchInboxSpy = sinon.stub(InboxActions, 'fetchInbox');

      try {
        handleNotification(batchWithReportLast(), 'add', context);

        expect(context.collections.fetchCollections.called).toBe(true);
      } finally {
        fetchInboxSpy.restore();
      }
    });

    it('still shows no toast for it, which is what the cap is for', () => {
      const context = buildContext();
      const fetchInboxSpy = sinon.stub(InboxActions, 'fetchInbox');

      try {
        handleNotification(batchWithReportLast(), 'add', context);

        // Three individual toasts plus the one summary toast, exactly as before.
        expect(addCallCount()).toBe(4);
      } finally {
        fetchInboxSpy.restore();
      }
    });
  });

  describe('refreshing sharee-facing permission info alongside the tree', () => {
    // fetchCollections() never touches the my_collection_shares cache SharedToMeInfosTooltip reads
    // from, so a permission-level change refreshed the tree but left the tooltip stale — this must
    // fire every time the tree refresh does, not as a separate/optional signal.
    it('calls refreshMySharedCollectionShares whenever fetchCollections is called', () => {
      const context = buildContext();
      const n = buildNotification({ subject: 'Shared Collection With Me' });

      handleNotification([n], 'add', context);

      expect(context.collections.fetchCollections.callCount).toBe(1);
      expect(context.collections.refreshMySharedCollectionShares.callCount).toBe(1);
    });

    it('does not call it when nothing in the batch matches', () => {
      const context = buildContext();
      handleNotification([buildNotification()], 'add', context);

      expect(context.collections.refreshMySharedCollectionShares.callCount).toBe(0);
    });
  });

  describe('deduping the collections refresh across a batch', () => {
    it('calls fetchCollections once, not once per matching notification', () => {
      const context = buildContext();
      const nots = [
        buildNotification({ id: 1, subject: 'Shared Collection With Me' }),
        buildNotification({ id: 2, subject: 'Shared Collection With Me' }),
        buildNotification({ id: 3, content: { action: 'RefreshChemotionCollection' } }),
      ];

      handleNotification(nots, 'add', context);

      expect(context.collections.fetchCollections.callCount).toBe(1);
    });

    it('does not refresh at all when nothing in the batch matches', () => {
      const context = buildContext();
      const nots = [buildNotification({ id: 1 }), buildNotification({ id: 2 })];

      handleNotification(nots, 'add', context);

      expect(context.collections.fetchCollections.callCount).toBe(0);
    });
  });

  describe('the first-batch refresh guard', () => {
    it('skips the refresh on the first batch even with a matching notification', () => {
      const context = buildContext();
      const n = buildNotification({ subject: 'Shared Collection With Me' });

      handleNotification([n], 'add', context, true, true);

      expect(context.collections.fetchCollections.callCount).toBe(0);
    });

    it('still shows the toast on the first batch — only the refresh is skipped', () => {
      const context = buildContext();
      const n = buildNotification({ subject: 'Shared Collection With Me' });

      handleNotification([n], 'add', context, true, true);

      expect(addCallCount()).toBe(1);
    });

    it('refreshes normally once isFirstBatch is false', () => {
      const context = buildContext();
      const n = buildNotification({ subject: 'Shared Collection With Me' });

      handleNotification([n], 'add', context, true, false);

      expect(context.collections.fetchCollections.callCount).toBe(1);
    });
  });

  describe('act === "rem"', () => {
    it('removes the toast by uid and never touches the collections refresh', () => {
      const context = buildContext();
      const n = buildNotification({ id: 42, subject: 'Shared Collection With Me' });

      handleNotification([n], 'rem', context);

      expect(removeByUidCalls().some((call) => call.args[0] === 42)).toBe(true);
      expect(context.collections.fetchCollections.callCount).toBe(0);
    });
  });
});
