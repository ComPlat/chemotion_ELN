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

    # Membership is not ownership: a group's collection is the group's. This endpoint withdraws the
    # selection from the user's *own* collections, so a member has nothing here to withdraw and
    # falls through to the shared-collection branch, which refuses DELETE outright.
    context 'when the collection belongs to a group the user is a member of' do
      let(:collection) { create(:collection, user: group) }

      it 'does not resolve the collection at all when nothing is shared' do
        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .not_to change(Sample, :count)

        expect(response).to have_http_status(:not_found)
      end

      it 'refuses the delete when the collection is shared to the group' do
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:remove_elements))

        expect { delete '/api/v1/ui_state/', params: params, as: :json }
          .not_to change(Sample, :count)

        expect(response).to have_http_status(:forbidden)
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

  describe 'POST /api/v1/ui_state/load_report detail levels' do
    let(:own_collection) { create(:collection, user: user) }

    def load_report(collection_id, sample_ids: [], reaction_ids: [], load_type: nil)
      report = { currentCollection: { id: collection_id } }
      report[:sample] = { checkedAll: false, checkedIds: sample_ids } if sample_ids.any?
      report[:reaction] = { checkedAll: false, checkedIds: reaction_ids } if reaction_ids.any?
      report[:loadType] = load_type if load_type
      post '/api/v1/ui_state/load_report', params: report, as: :json
    end

    # ElementDetailLevelCalculator#user_collections_with_element probes each element's collection
    # membership with `SELECT 1 AS one FROM collections INNER JOIN collections_<type> ...`. The old
    # per-element instantiation fired this once (or more) per element; the batched for_collection
    # call resolves the whole page from @collection, so the probe count must not grow with page size.
    # Counts both sample and reaction probes so a regression on either loop is caught.
    def count_membership_probes(&block)
      count = 0
      counter = lambda do |_name, _start, _finish, _id, payload|
        sql = payload[:sql]
        next unless sql.include?('1 AS one')

        count += 1 if sql.include?('collections_samples') || sql.include?('collections_reactions')
      end
      ActiveSupport::Notifications.subscribed(counter, 'sql.active_record', &block)
      count
    end

    it 'renders samples from an owned collection at full detail' do
      own_sample = create(:sample, collections: [own_collection])
      load_report(own_collection.id, sample_ids: [own_sample.id])

      expect(response).to have_http_status(:created)
      returned = parsed_json_response['samples'].first
      # molfile is exposed at detail level >= 1; is_top_secret only at the owner level (10), where it
      # is the real boolean rather than the '***' placeholder. Asserting both pins the owner level.
      expect(returned['molfile']).to eq(own_sample.molfile)
      expect(returned['is_top_secret']).to eq(own_sample.is_top_secret)
    end

    # Guards all four hoisted call sites: samples and reactions, in both the 'lists' and the
    # non-'lists' (full report) branch. The invariant is that the probe count does not scale with
    # page size, not that it is any particular value: a correct single-query design stays green,
    # only a per-element N+1 fails.
    [nil, 'lists'].each do |load_type|
      it "resolves detail levels once per page, not once per element (no N+1, load_type=#{load_type.inspect})" do
        samples = create_list(:sample, 3, collections: [own_collection])
        reactions = create_list(:reaction, 3, collections: [own_collection])

        one = count_membership_probes do
          load_report(own_collection.id, sample_ids: [samples.first.id], reaction_ids: [reactions.first.id],
                                         load_type: load_type)
        end
        many = count_membership_probes do
          load_report(own_collection.id, sample_ids: samples.map(&:id), reaction_ids: reactions.map(&:id),
                                         load_type: load_type)
        end

        expect(many).to eq(one)
      end
    end

    # The report reflects the level granted on the collection it was run from, by design: even when
    # the same element is fully accessible through another collection, a report drawn from a
    # restricted share renders it at the share's (lower) level. This documents that intentional
    # trade-off, and guards that a shared-collection report still redacts fields it should.
    it 'renders a sample at the browsed shared collection\'s reduced level, not its best-available level' do
      restricted_collection = create(:collection, user: other_user)
      create(:collection_share, collection: restricted_collection, shared_with: user,
                                permission_level: CollectionShare.permission_level(:read_elements),
                                sample_detail_level: 0)
      # The sample is also in the user's own collection, where it would render at full detail.
      shared_sample = create(:sample, collections: [own_collection, restricted_collection])

      load_report(restricted_collection.id, sample_ids: [shared_sample.id])

      expect(response).to have_http_status(:created)
      returned = parsed_json_response['samples'].first
      # The requested sample is present but rendered at the share's level 0, so molfile (anonymised
      # below level 1) is the '***' placeholder rather than the real structure.
      expect(returned['id']).to eq(shared_sample.id)
      expect(returned['molfile']).to eq('***')
    end
  end
end
