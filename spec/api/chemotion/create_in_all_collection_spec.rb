# frozen_string_literal: true

require 'rails_helper'

# Creating an element with collection_id set to the user's own "All" collection
# links it to that collection exactly once.
describe 'POST element create into the "All" collection' do # rubocop:disable RSpec/DescribeClass
  include_context 'api request authorization context'

  let(:all_collection) { Collection.get_all_collection_for_user(user.id) }
  let(:collection) { create(:collection, user_id: user.id) }
  let(:headers) { { 'CONTENT_TYPE' => 'application/json' } }
  let(:root_container) do
    { attachments: [], children: [], is_new: true, is_deleted: false, name: 'new' }
  end

  {
    'reaction' => {
      path: '/api/v1/reactions',
      join: CollectionsReaction,
      key: :reaction_id,
      params: ->(ctx) { { name: 'r1', materials: { products: [] }, container: ctx.root_container } },
    },
    'screen' => {
      path: '/api/v1/screens',
      join: CollectionsScreen,
      key: :screen_id,
      params: lambda { |ctx|
        { name: 's1', wellplate_ids: [], research_plan_ids: [], container: ctx.root_container }
      },
    },
    'research_plan' => {
      path: '/api/v1/research_plans',
      join: CollectionsResearchPlan,
      key: :research_plan_id,
      params: ->(ctx) { { name: 'rp1', container: ctx.root_container } },
    },
    'wellplate' => {
      path: '/api/v1/wellplates',
      join: CollectionsWellplate,
      key: :wellplate_id,
      params: ->(ctx) { { name: 'wp1', wells: [], height: 8, width: 12, container: ctx.root_container } },
    },
    'device_description' => {
      path: '/api/v1/device_descriptions',
      join: CollectionsDeviceDescription,
      key: :device_description_id,
      params: ->(_ctx) { { name: 'dd1' } },
    },
  }.each do |root, cfg|
    describe "POST #{cfg[:path]}" do
      let(:element_id) { JSON.parse(response.body).dig(root, 'id') }
      let(:links) { cfg[:join].where(cfg[:key] => element_id) }

      context 'when the chosen collection is the user\'s "All" collection' do
        before do
          post cfg[:path], params: cfg[:params].call(self).merge(collection_id: all_collection.id).to_json,
                           headers: headers
        end

        it 'creates the element' do
          expect(response).to have_http_status(:created)
        end

        it 'links the element to "All" exactly once' do
          expect(links.pluck(:collection_id)).to eq([all_collection.id])
        end
      end

      context 'when the chosen collection is a regular collection' do
        before do
          post cfg[:path], params: cfg[:params].call(self).merge(collection_id: collection.id).to_json,
                           headers: headers
        end

        it 'links the element to the collection and to "All"' do
          expect(response).to have_http_status(:created)
          expect(links.pluck(:collection_id)).to contain_exactly(collection.id, all_collection.id)
        end
      end
    end
  end
end
