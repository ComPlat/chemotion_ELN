# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Collections::UpdateTree do
  let(:user) { create(:person) }
  let(:usecase) { described_class.new(user) }
  # Every Person gets this locked root from User#create_chemotion_public_collection.
  let(:repository_root) do
    Collection.find_by!(user_id: user.id, label: 'chemotion-repository.net', is_locked: true)
  end

  describe '#perform!' do
    let!(:first) { create(:collection, user: user, label: 'First', position: 1) }
    let!(:second) { create(:collection, user: user, label: 'Second', position: 2) }

    it 'reparents and renumbers the collections it is given' do
      usecase.perform!(collections: [{ id: first.id, label: 'First', children: [{ id: second.id, label: 'Second' }] }])

      expect(second.reload).to have_attributes(parent_id: first.id, position: 1)
    end

    it 'refuses a payload containing a locked collection' do
      expect do
        usecase.perform!(collections: [{ id: repository_root.id, label: 'chemotion-repository.net' }])
      end.to raise_error(Usecases::Collections::Errors::UpdateForbidden)
    end

    context 'with a collection nested inside a locked one' do
      # The "transferred" node a gate transfer creates. A tree payload positions a collection by
      # nesting, so accepting it here would be enough to lift it out of the repository subtree.
      let!(:transferred) do
        create(:collection, user: user, label: 'transferred', parent: repository_root, is_locked: true)
      end
      let!(:unlocked_child) do
        create(:collection, user: user, label: 'Legacy child', parent: repository_root)
      end

      it 'refuses to move the locked child' do
        expect do
          usecase.perform!(collections: [{ id: transferred.id, label: 'transferred' }])
        end.to raise_error(Usecases::Collections::Errors::UpdateForbidden)
      end

      it 'refuses to move an unlocked child out of the locked container' do
        expect do
          usecase.perform!(collections: [{ id: unlocked_child.id, label: 'Legacy child' }])
        end.to raise_error(Usecases::Collections::Errors::UpdateForbidden)
      end

      it 'refuses to move a grandchild out of the locked container' do
        grandchild = create(:collection, user: user, label: 'Notes', parent: unlocked_child)

        expect do
          usecase.perform!(collections: [{ id: grandchild.id, label: 'Notes' }])
        end.to raise_error(Usecases::Collections::Errors::UpdateForbidden)
      end

      it 'still accepts an ordinary collection' do
        expect { usecase.perform!(collections: [{ id: first.id, label: 'First' }]) }.not_to raise_error
      end
    end

    context 'when a renamed collection is shared with someone' do
      let(:sharee) { create(:person) }

      before do
        create(:collection_share, collection: first, shared_with: sharee)
        # Notifying a sharee reuses this channel — seeded in production by a data migration that
        # db:schema:load never runs, so it has to be seeded here too.
        create(:channel, subject: Channel::SHARED_COLLECTION_WITH_ME, channel_type: 8)
      end

      # Without this, the sharee's "Shared with me" tree keeps showing the old label until they
      # reload the page — their poll only refetches on seeing a new notification (NoticeButton.js).
      it 'notifies the sharee so their collection tree refreshes' do
        expect do
          usecase.perform!(collections: [{ id: first.id, label: 'Renamed' }])
        end.to change(Notification.where(user_id: sharee.id), :count).by(1)
      end

      # A rename is housekeeping, not something worth interrupting the sharee for — the tree still
      # refreshes (see the spec above), it just doesn't pop a dismiss-required toast.
      it 'notifies silently' do
        usecase.perform!(collections: [{ id: first.id, label: 'Renamed' }])

        expect(Message.last.content['silent']).to be(true)
      end

      # Reparenting/reordering an unshared sibling (second) must not spuriously notify the sharee
      # about `first`, which is genuinely untouched by this save.
      it 'does not notify when the shared collection itself is unchanged (only an unshared sibling moves)' do
        payload = [{ id: first.id, label: 'First', children: [{ id: second.id, label: 'Second' }] }]

        expect { usecase.perform!(collections: payload) }.not_to change(Notification, :count)
      end

      it 'does not notify when nothing about the shared collection changes' do
        payload = [{ id: first.id, label: 'First' }, { id: second.id, label: 'Second' }]

        expect { usecase.perform!(collections: payload) }.not_to change(Notification, :count)
      end

      # The sharee's tree is rebuilt from live ancestry/position on every refetch (see
      # CollectionsStore.jsx), so a reparent needs the same "please refetch" signal a rename gets —
      # without it, nesting silently drifts out of sync until an unrelated notification (or a page
      # reload) happens to trigger a refresh.
      it 'notifies when only the ancestry changes (a reparent, no rename)' do
        container = create(:collection, user: user, label: 'Container')
        payload = [{ id: container.id, label: 'Container', children: [{ id: first.id, label: 'First' }] }]

        expect do
          usecase.perform!(collections: payload)
        end.to change(Notification.where(user_id: sharee.id), :count).by(1)
      end

      it 'notifies when only the position changes (a reorder, no rename or reparent)' do
        payload = [{ id: second.id, label: 'Second' }, { id: first.id, label: 'First' }]

        expect do
          usecase.perform!(collections: payload)
        end.to change(Notification.where(user_id: sharee.id), :count).by(1)
      end
    end

    it 'does not notify anyone when the renamed collection has no shares' do
      expect do
        usecase.perform!(collections: [{ id: first.id, label: 'Renamed' }])
      end.not_to change(Notification, :count)
    end
  end
end
