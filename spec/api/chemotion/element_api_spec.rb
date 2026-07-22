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

      it 'deletes the selected element and omits locked_sample_ids when nothing is locked' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .to change(Sample, :count).by(-1)

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response).not_to have_key('locked_sample_ids')
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

    context 'when the sample is connected to a reaction in the same collection' do
      let(:collection) { create(:collection, user: user) }
      let(:reaction) { create(:reaction, creator: user, collections: [collection]) }

      before { ReactionsReactantSample.create!(reaction: reaction, sample: sample, reference: false) }

      it 'keeps the sample and reports it as locked by its reaction' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .not_to change(Sample, :count)

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['locked_sample_ids']).to contain_exactly(sample.id)
      end
    end

    # Pins the partition in WithdrawElements: the locked sample goes to locked_sample_ids while the
    # free one goes to `removed`, which drives the `selecteds` filter. If a locked id leaked into
    # `removed`, the still-existing sample's detail tab would be closed.
    context 'with a mix of a locked sample and a free sample' do
      let(:collection) { create(:collection, user: user) }
      let(:free_sample) { create(:sample, collections: [collection]) }
      let(:reaction) { create(:reaction, creator: user, collections: [collection]) }
      let(:params) do
        {
          currentCollection: { id: collection.id },
          options: { deleteSubsamples: false },
          sample: { checkedAll: false, checkedIds: [sample.id, free_sample.id], uncheckedIds: [] },
          selecteds: [
            { type: 'sample', id: sample.id },
            { type: 'sample', id: free_sample.id },
          ],
        }
      end

      before do
        free_sample
        ReactionsReactantSample.create!(reaction: reaction, sample: sample, reference: false)
      end

      it 'removes only the free sample, reports the locked one, and keeps its tab open' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .to change(Sample, :count).by(-1)

        aggregate_failures do
          expect(response).to have_http_status(:ok)
          expect(parsed_json_response['locked_sample_ids']).to contain_exactly(sample.id)
          expect(collection.reload.samples).to contain_exactly(sample)
          # only the removed (free) sample's tab is closed; the locked sample, which still exists,
          # stays in `selecteds`
          # rubocop:disable Rails/Pluck -- selecteds is parsed JSON (Array of Hash), not an AR relation
          expect(parsed_json_response['selecteds'].map { |s| s['id'] }).to contain_exactly(sample.id)
          # rubocop:enable Rails/Pluck
        end
      end
    end

    # Destroying the element records themselves is owner-only: a sharee unlinks them from the
    # collection instead (Usecases::Collections::RemoveElements). No rung on the ladder grants this.
    CollectionShare::PERMISSION_LEVELS.each_key do |level_key|
      context "when the collection is only shared with the user at :#{level_key}" do
        let(:collection) { create(:collection, user: other_user) }

        before do
          create(:collection_share, collection: collection, shared_with: user,
                                    permission_level: CollectionShare.permission_level(level_key))
        end

        it 'is forbidden' do
          expect { delete '/api/v1/ui_state/', params: params, as: :json }
            .not_to change(Sample, :count)

          expect(response).to have_http_status(:forbidden)
        end
      end
    end

    context 'when the user holds both a direct and a group share, at the highest rung' do
      let(:collection) { create(:collection, user: other_user) }

      before do
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:read_elements))
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:pass_ownership))
      end

      it 'is still forbidden — no share destroys the owner\'s records' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .not_to change(Sample, :count)

        expect(response).to have_http_status(:forbidden)
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
