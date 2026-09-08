# frozen_string_literal: true

describe Chemotion::CollectionShareAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:third_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:collection_share) { create(:collection_share, shared_with: other_user, collection: collection) }

  # Notifying a sharee (see POST/PUT/DELETE below) reuses this channel — seeded in production by a
  # data migration that db:schema:load never runs, so specs that exercise it seed it themselves too.
  before { create(:channel, subject: Channel::SHARED_COLLECTION_WITH_ME, channel_type: 8) }

  describe 'POST /api/v1/collection_shares' do
    let(:create_params) do
      {
        collection_id: collection.id,
        user_ids: [other_user.id, third_user.id],
        permission_level: CollectionShare.permission_level(:manage_shares),
        celllinesample_detail_level: 5,
        devicedescription_detail_level: 5,
        element_detail_level: 5,
        reaction_detail_level: 5,
        researchplan_detail_level: 5,
        sample_detail_level: 5,
        screen_detail_level: 5,
        sequencebasedmacromoleculesample_detail_level: 5,
        wellplate_detail_level: 5,
      }
    end

    it 'creates a new share for the collection' do
      expect do
        post '/api/v1/collection_shares/', params: create_params
        collection.reload
      end.to change(CollectionShare, :count).by(create_params[:user_ids].length)
         .and change(collection, :shared?).from(false).to(true)
    end

    # Emitted server-side so it fires regardless of which client created the share, unlike the old
    # client-side createSharingMessage this replaces.
    it 'notifies every recipient so their collection tree refreshes' do
      expect do
        post '/api/v1/collection_shares/', params: create_params
      end.to change(Notification, :count).by(create_params[:user_ids].length)

      expect(Notification.where(user_id: other_user.id)).to exist
      expect(Notification.where(user_id: third_user.id)).to exist
    end

    # A new share is the one event a sharee should be interrupted for — unlike an update/revoke/rename,
    # which are delivered silently (see the PUT/DELETE specs below).
    it 'notifies verbosely, not silently' do
      post '/api/v1/collection_shares/', params: create_params

      expect(Message.last.content['silent']).to be(false)
    end

    context 'with apply_to_subcollections' do
      let(:child) { create(:collection, user: user, parent: collection) }

      before { child }

      it 'also shares the descendant collections' do
        post '/api/v1/collection_shares/', params: create_params.merge(apply_to_subcollections: true)

        expect(CollectionShare.exists?(collection: collection, shared_with_id: other_user.id)).to be true
        expect(CollectionShare.exists?(collection: child, shared_with_id: other_user.id)).to be true
      end

      it 'leaves descendants untouched when the flag is false' do
        post '/api/v1/collection_shares/', params: create_params.merge(apply_to_subcollections: false)

        expect(CollectionShare.exists?(collection: child, shared_with_id: other_user.id)).to be false
      end

      # A pass_ownership share is an offer; accepting it transfers the whole subtree atomically, so
      # the offer itself must land only on the root — cascading it would mint an independent
      # take-ownership offer on every sub-collection.
      it 'does not cascade a pass_ownership offer to descendants' do
        post '/api/v1/collection_shares/',
             params: create_params.merge(user_ids: [other_user.id],
                                         permission_level: CollectionShare.permission_level(:pass_ownership),
                                         apply_to_subcollections: true)

        expect(CollectionShare.exists?(collection: collection, shared_with_id: other_user.id)).to be true
        expect(CollectionShare.exists?(collection: child, shared_with_id: other_user.id)).to be false
      end
    end

    context 'when a share write fails mid-cascade (transactional, 422 not 500)' do
      let(:child) { create(:collection, user: user, parent: collection) }

      before { child }

      it 'rolls the whole cascade back and responds 422 when a user_id has no matching user' do
        bogus_id = other_user.id + 1_000 # no such user (ids are sequential and nowhere near this)

        expect do
          post '/api/v1/collection_shares/',
               params: create_params.merge(user_ids: [other_user.id, bogus_id], apply_to_subcollections: true)
        end.not_to change(CollectionShare, :count)

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'PUT /api/v1/collection_shares' do
    let(:update_params) do
      {
        permission_level: CollectionShare.permission_level(:pass_ownership),
        celllinesample_detail_level: 5,
        devicedescription_detail_level: 5,
        element_detail_level: 5,
        reaction_detail_level: 5,
        researchplan_detail_level: 5,
        sample_detail_level: 5,
        screen_detail_level: 5,
        sequencebasedmacromoleculesample_detail_level: 5,
        wellplate_detail_level: 5,
      }
    end

    before { collection_share }

    it 'updates an existing share correctly' do
      put "/api/v1/collection_shares/#{collection_share.id}", params: update_params

      result = parsed_json_response['collection_share']
      expected_result = update_params.dup.stringify_keys

      expect(result).to include(expected_result)
    end

    # Without this, the sharee's "Shared with me" tree only ever reflects a permission change after
    # a manual reload — their poll only refetches on seeing a new notification (see NoticeButton.js).
    it 'notifies the sharee so their collection tree refreshes' do
      expect do
        put "/api/v1/collection_shares/#{collection_share.id}", params: update_params
      end.to change(Notification.where(user_id: other_user.id), :count).by(1)
    end

    # A permission change is housekeeping, not something worth interrupting the sharee for — the
    # tree still refreshes (see the spec above), it just doesn't pop a dismiss-required toast.
    it 'notifies silently' do
      put "/api/v1/collection_shares/#{collection_share.id}", params: update_params

      expect(Message.last.content['silent']).to be(true)
    end

    context 'with apply_to_subcollections' do
      let(:child) { create(:collection, user: user, parent: collection) }

      before { child }

      it 'cascades the edit to a descendant already shared with the same sharee' do
        create(:collection_share, collection: child, shared_with: other_user,
                                  permission_level: CollectionShare.permission_level(:read_elements))

        put "/api/v1/collection_shares/#{collection_share.id}",
            params: update_params.merge(permission_level: CollectionShare.permission_level(:manage_shares),
                                        apply_to_subcollections: true)

        child_share = CollectionShare.find_by(collection: child, shared_with_id: other_user.id)
        expect(child_share.permission_level).to eq(CollectionShare.permission_level(:manage_shares))
      end

      # By default an edit propagates to existing sub-collection shares only — it never grants NEW
      # access to a sub-collection the sharee was not already on (that would be a silent over-grant).
      it 'does not mint a new share on a descendant that was not already shared with the sharee' do
        put "/api/v1/collection_shares/#{collection_share.id}",
            params: update_params.merge(permission_level: CollectionShare.permission_level(:manage_shares),
                                        apply_to_subcollections: true)

        expect(CollectionShare.exists?(collection: child, shared_with_id: other_user.id)).to be false
      end

      # include_new_subcollections is the explicit opt-in out of that default: it makes the edit
      # cascade mint shares too, mirroring the create cascade.
      it 'mints a new share on a descendant that was not already shared, when include_new_subcollections is set' do
        put "/api/v1/collection_shares/#{collection_share.id}",
            params: update_params.merge(permission_level: CollectionShare.permission_level(:manage_shares),
                                        apply_to_subcollections: true,
                                        include_new_subcollections: true)

        child_share = CollectionShare.find_by(collection: child, shared_with_id: other_user.id)
        expect(child_share).not_to be_nil
        expect(child_share.permission_level).to eq(CollectionShare.permission_level(:manage_shares))
      end

      # Mirrors the create-path pass_ownership test: an offer is never cascaded, whatever the
      # cascade flags say — include_new_subcollections does not override that guard.
      it 'does not cascade a pass_ownership offer to descendants even with include_new_subcollections' do
        put "/api/v1/collection_shares/#{collection_share.id}",
            params: update_params.merge(permission_level: CollectionShare.permission_level(:pass_ownership),
                                        apply_to_subcollections: true,
                                        include_new_subcollections: true)

        expect(CollectionShare.exists?(collection: child, shared_with_id: other_user.id)).to be false
      end

      # cascade_requested? used to compare permission_level != pass_ownership, so omitting the
      # (optional) param entirely — nil — read as "not pass_ownership" even when the share being
      # edited already IS pass_ownership (as the factory default is here), letting the offer cascade
      # after all and mint a new one on a descendant that never had any share for this recipient.
      it 'does not cascade an existing pass_ownership share when permission_level is omitted from the request' do
        put "/api/v1/collection_shares/#{collection_share.id}",
            params: { apply_to_subcollections: true, include_new_subcollections: true }

        expect(CollectionShare.exists?(collection: child, shared_with_id: other_user.id)).to be false
      end

      # write_shares! is a partial-update writer (include_missing: false) — safe for an existing
      # share, whose unset columns keep their current value, but a genuinely new one has no current
      # value to keep. Without a backfill it would fall back to the schema default (0) for every
      # column this partial request doesn't mention, rather than mirroring the root share.
      it 'backfills a newly minted descendant share from the root, not the schema default, on a partial edit' do
        put "/api/v1/collection_shares/#{collection_share.id}",
            params: { permission_level: CollectionShare.permission_level(:manage_shares),
                      apply_to_subcollections: true,
                      include_new_subcollections: true }

        child_share = CollectionShare.find_by(collection: child, shared_with_id: other_user.id)
        expect(child_share.permission_level).to eq(CollectionShare.permission_level(:manage_shares))
        # sample_detail_level was never part of this request — it must mirror the root share's actual
        # value (10, from the factory), not the schema default (0).
        expect(child_share.sample_detail_level).to eq(10)
      end
    end
  end

  describe 'DELETE /api/v1/collection_shares/:id' do
    before do
      collection_share
      collection.update(shared: true)
    end

    it 'deletes the collection id' do
      expect do
        delete "/api/v1/collection_shares/#{collection_share.id}"
      end.to change(CollectionShare, :count).by(-1)
    end

    it 'responds 204 No Content with an empty body' do
      delete "/api/v1/collection_shares/#{collection_share.id}"
      expect(response).to have_http_status(:no_content)
      expect(response.body).to be_blank
    end

    it 'updates the collections shared flag if that was the last share' do
      expect(collection.collection_shares.count).to eq 1
      expect do
        delete "/api/v1/collection_shares/#{collection_share.id}"
        collection.reload
      end.to change(CollectionShare, :count).by(-1)
         .and change(collection, :shared?).from(true).to(false)
    end

    # Revoking is the case a stale sharee tree hurts most: the collection stays visible on their
    # side yet the server no longer serves it. Without a notification here, only a page reload would
    # ever tell them.
    it 'notifies the revoked sharee so their collection tree refreshes' do
      expect do
        delete "/api/v1/collection_shares/#{collection_share.id}"
      end.to change(Notification.where(user_id: other_user.id), :count).by(1)
    end

    it 'notifies silently' do
      delete "/api/v1/collection_shares/#{collection_share.id}"

      expect(Message.last.content['silent']).to be(true)
    end

    context 'when the share belongs to one of the requesters groups' do
      let(:collection) { create(:collection, user: other_user) }
      let(:group) { create(:group, users: [user]) }
      # Below :manage_shares on purpose — a group share at or above that rung would make every member
      # a delegated administrator of the collection, which is a different situation entirely.
      let(:group_share) do
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      before { group_share }

      # The group's share is not the requester's to reject: destroying it would revoke the collection
      # for every other member. To drop group-derived access the user leaves the group.
      it 'refuses to delete it' do
        expect { delete "/api/v1/collection_shares/#{group_share.id}" }
          .not_to change(CollectionShare, :count)

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when the share is neither the requesters nor on a collection they own' do
      let(:foreign_share) do
        create(:collection_share, collection: create(:collection, user: other_user), shared_with: third_user)
      end

      before { foreign_share }

      it 'responds 403 rather than raising' do
        expect { delete "/api/v1/collection_shares/#{foreign_share.id}" }
          .not_to change(CollectionShare, :count)

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when the requester rejects their own direct share' do
      let(:collection) { create(:collection, user: other_user) }
      let(:own_share) { create(:collection_share, collection: collection, shared_with: user) }

      before { own_share }

      it 'deletes it' do
        expect { delete "/api/v1/collection_shares/#{own_share.id}" }
          .to change(CollectionShare, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end

      it 'does not notify the requester about their own action' do
        expect { delete "/api/v1/collection_shares/#{own_share.id}" }
          .not_to change(Notification, :count)
      end
    end
  end

  # Nothing purges collection_shares when an account is deleted, and collections.shared stays
  # true, so the owner keeps seeing the share icon. Listing the share must survive the sharee
  # being gone — hovering that icon used to 500 on the entity dereferencing a nil association.
  describe 'GET /api/v1/collection_shares with a deleted sharee' do
    subject(:list) do
      get "/api/v1/collection_shares?collection_id=#{collection.id}"
      response
    end

    before { collection_share }

    context 'when the sharee account is soft-deleted' do
      before { other_user.destroy }

      it 'still lists the share, naming the deleted user' do
        expect(list).to have_http_status(:ok)
        expect(parsed_json_response['collection_shares']).to contain_exactly(
          include('shared_with' => "#{other_user.name} (#{other_user.name_abbreviation})",
                  'shared_with_type' => 'Person'),
        )
      end
    end

    it 'cannot be reached by a hard destroy — the FK to users forbids it' do
      expect { other_user.really_destroy! }.to raise_error(ActiveRecord::InvalidForeignKey)
    end
  end

  describe 'GET /api/v1/collection_shares/for_me' do
    subject(:shares) do
      get "/api/v1/collection_shares/for_me?collection_id=#{collection.id}"
      parsed_json_response['collection_shares']
    end

    let(:collection) { create(:collection, user: other_user) }
    let(:group) { create(:group, users: [user]) }

    context 'when the collection is shared to the user directly' do
      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      it 'returns the direct share with its type and permission level' do
        expect(shares).to contain_exactly(
          include('shared_with_type' => 'Person',
                  'permission_level' => CollectionShare.permission_level(:read_elements)),
        )
      end
    end

    context 'when the collection reaches the user through a group' do
      before do
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:edit_elements))
      end

      it 'returns the group share' do
        expect(shares).to contain_exactly(include('shared_with_type' => 'Group'))
      end
    end

    context 'when the collection is shared both directly and through a group' do
      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:read_elements))
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:edit_elements))
      end

      it 'returns both contributing shares' do
        expect(shares.pluck('shared_with_type')).to contain_exactly('Person', 'Group')
      end
    end

    context 'when the user has no share on the collection' do
      before do
        create(:collection_share, collection: collection, shared_with: third_user,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      # The load-bearing privacy check: a user must never see another recipient's share.
      it 'returns nothing and does not leak the other recipients share' do
        expect(shares).to be_empty
      end
    end
  end

  describe 'permission_level validation' do
    it 'rejects a level that is not on the ladder' do
      post '/api/v1/collection_shares/',
           params: { collection_id: collection.id, user_ids: [other_user.id], permission_level: 42 }

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe 'sharing a collection with its own owner' do
    it 'is refused' do
      post '/api/v1/collection_shares/', params: { collection_id: collection.id, user_ids: [user.id] }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  # `user` (the authenticated requester) is not the owner here — they hold a delegated
  # :manage_shares share on another user's collection.
  describe 'delegated share management (:manage_shares)' do
    let(:collection) { create(:collection, user: other_user) }
    let(:manage_shares) { CollectionShare.permission_level(:manage_shares) }

    before do
      create(:collection_share, collection: collection, shared_with: user, permission_level: manage_shares)
    end

    it 'lets the delegate list the collection shares' do
      get '/api/v1/collection_shares', params: { collection_id: collection.id }

      expect(response).to have_http_status(:ok)
    end

    it 'lets the delegate share the collection onward at or below their own level' do
      expect do
        post '/api/v1/collection_shares/',
             params: { collection_id: collection.id, user_ids: [third_user.id], permission_level: manage_shares }
      end.to change(CollectionShare, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it 'refuses to let the delegate grant a level above their own' do
      expect do
        post '/api/v1/collection_shares/',
             params: {
               collection_id: collection.id,
               user_ids: [third_user.id],
               permission_level: CollectionShare.permission_level(:pass_ownership),
             }
      end.not_to change(CollectionShare, :count)

      expect(response).to have_http_status(:forbidden)
    end

    it 'refuses to let the delegate revoke a share that outranks them' do
      superior = create(
        :collection_share,
        collection: collection,
        shared_with: third_user,
        permission_level: CollectionShare.permission_level(:pass_ownership),
      )

      expect { delete "/api/v1/collection_shares/#{superior.id}" }.not_to change(CollectionShare, :count)
      expect(response).to have_http_status(:forbidden)
    end

    it 'still lets any sharee reject their own share, whatever its level' do
      own_share = CollectionShare.find_by(collection: collection, shared_with: user)

      expect { delete "/api/v1/collection_shares/#{own_share.id}" }.to change(CollectionShare, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end

  # A delegate may edit a root share and cascade it, but the cascade must not let them overwrite a
  # sub-collection share that outranks their own level there — the same guard the root PUT applies.
  describe 'delegated cascade cannot overwrite a superior descendant share' do
    let(:collection) { create(:collection, user: other_user) }
    let(:child) { create(:collection, user: other_user, parent: collection) }
    let(:manage_shares) { CollectionShare.permission_level(:manage_shares) }
    # third_user holds a pass_ownership share on the child — above the delegate's own level there.
    let(:child_superior_share) do
      create(:collection_share, collection: child, shared_with: third_user,
                                permission_level: CollectionShare.permission_level(:pass_ownership))
    end
    # the root share the delegate is about to edit and cascade
    let(:root_share) do
      create(:collection_share, collection: collection, shared_with: third_user,
                                permission_level: CollectionShare.permission_level(:read_elements))
    end

    before do
      # `user` is a manage_shares delegate on both the root and the child.
      create(:collection_share, collection: collection, shared_with: user, permission_level: manage_shares)
      create(:collection_share, collection: child, shared_with: user, permission_level: manage_shares)
      child_superior_share
    end

    it 'refuses (403) and leaves the superior descendant share untouched' do
      expect do
        put "/api/v1/collection_shares/#{root_share.id}",
            params: { permission_level: CollectionShare.permission_level(:edit_elements),
                      apply_to_subcollections: true }
      end.not_to(change { child_superior_share.reload.permission_level })

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'a sharee below :manage_shares' do
    let(:collection) { create(:collection, user: other_user) }

    before do
      create(
        :collection_share,
        collection: collection,
        shared_with: user,
        permission_level: CollectionShare.permission_level(:remove_elements),
      )
    end

    it 'cannot administrate the share list' do
      post '/api/v1/collection_shares/', params: { collection_id: collection.id, user_ids: [third_user.id] }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'offering ownership (pass_ownership share)' do
    let(:pass_ownership) { CollectionShare.permission_level(:pass_ownership) }

    it 'refuses to offer ownership to a group' do
      collection = create(:collection, user: user)
      group = create(:group)

      post '/api/v1/collection_shares/',
           params: { collection_id: collection.id, user_ids: [group.id], permission_level: pass_ownership }

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'refuses a manage_shares delegate offering ownership (above their own level)' do
      collection = create(:collection, user: other_user)
      create(:collection_share, collection: collection, shared_with: user,
                                permission_level: CollectionShare.permission_level(:manage_shares))

      post '/api/v1/collection_shares/',
           params: { collection_id: collection.id, user_ids: [third_user.id], permission_level: pass_ownership }

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'POST /api/v1/collection_shares/take_ownership/:collection_id' do
    let(:collection) { create(:collection, user: other_user) }

    context 'when the user holds a pass-ownership offer' do
      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:pass_ownership))
      end

      it 'transfers ownership to the user and demotes the former owner' do
        post "/api/v1/collection_shares/take_ownership/#{collection.id}"

        expect(response).to have_http_status(:created)
        expect(collection.reload.user_id).to eq(user.id)
        expect(CollectionShare.find_by(collection: collection, shared_with_id: other_user.id).permission_level)
          .to eq(CollectionShare.permission_level(:manage_shares))
      end
    end

    context 'without an offer' do
      it 'is forbidden' do
        expect { post "/api/v1/collection_shares/take_ownership/#{collection.id}" }
          .not_to(change { collection.reload.user_id })

        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
