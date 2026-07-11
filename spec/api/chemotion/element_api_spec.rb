# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ElementAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:group) { create(:group, users: [user]) }
  let(:sample) { create(:sample, collections: [collection]) }

  let(:params) do
    {
      currentCollection: { id: collection.id },
      options: { deleteSubsamples: false },
      sample: { checkedAll: false, checkedIds: [sample.id], uncheckedIds: [] },
      selecteds: [],
    }
  end

  describe 'DELETE /api/v1/ui_state/' do
    before { sample }

    context 'when the collection belongs to the user' do
      let(:collection) { create(:collection, user: user) }

      it 'deletes the selected element' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .to change(Sample, :count).by(-1)
      end
    end

    # own_collections_for spans group_ids, so a group's collection is its members'. The gate used to
    # ask `current_user.collections`, miss it, and fall through to the share lookup.
    context 'when the collection belongs to a group the user is a member of' do
      let(:collection) { create(:collection, user: group) }

      it 'deletes the selected element' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .to change(Sample, :count).by(-1)
      end
    end

    context 'when the collection is shared with the user above the threshold' do
      let(:collection) { create(:collection, user: other_user) }

      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:share_collection))
      end

      it 'deletes the selected element' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .to change(Sample, :count).by(-1)
      end
    end

    context 'when the collection is shared with the user below the threshold' do
      let(:collection) { create(:collection, user: other_user) }

      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:write_elements))
      end

      it 'is forbidden' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .not_to change(Sample, :count)

        expect(response).to have_http_status(:forbidden)
      end
    end

    # The user holds two shares. The permissive one is their own; the group's alone would forbid the
    # request. Resolving to the maximum makes the outcome independent of which row the DB returns
    # first — previously a bare find_by picked either.
    context 'when the user holds both a permissive direct share and a restrictive group share' do
      let(:collection) { create(:collection, user: other_user) }

      before do
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:read_elements))
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:import_elements))
      end

      it 'deletes the selected element, whichever share the database yields first' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .to change(Sample, :count).by(-1)
      end
    end

    context 'when the user has no access to the collection at all' do
      let(:collection) { create(:collection, user: other_user) }

      it 'responds 404' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .not_to change(Sample, :count)

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'POST /api/v1/ui_state/load_report' do
    let(:collection) { create(:collection, user: other_user) }
    let(:report_params) do
      { currentCollection: { id: collection.id }, sample: { checkedAll: false, checkedIds: [sample.id] } }
    end

    before do
      sample
      create(:collection_share, collection: collection, shared_with: group,
                                permission_level: CollectionShare.permission_level(:read_elements))
    end

    # Reading a report only ever needed a share to exist; the gate spelled that as `>= -1`.
    it 'is allowed for a read-only share held through a group' do
      post '/api/v1/ui_state/load_report', params: report_params, as: :json

      expect(response).to have_http_status(:created)
    end
  end
end
