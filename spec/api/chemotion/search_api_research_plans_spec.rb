# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SearchAPI do # rubocop:disable RSpec/MultipleMemoizedHelpers
  # rubocop:disable RSpec/MultipleMemoizedHelpers
  subject(:do_request) { post url, params: params, as: :json }

  include_context 'api request authorization context'

  let(:owner) { user }
  let(:collection) { create(:collection, user: owner) }
  let(:sample) { create(:sample, creator: owner, collections: [collection]) }
  let(:reaction) { create(:reaction, creator: owner, collections: [collection]) }
  let(:wellplate) { create(:wellplate, collections: [collection]) }
  let(:linked_samples) { [sample] }
  let(:linked_reactions) { [reaction] }
  let(:linked_wellplates) { [wellplate] }
  let(:body) do
    linked_samples.map { |element| { type: 'sample', value: { sample_id: element.id } } } +
      linked_reactions.map { |element| { type: 'reaction', value: { reaction_id: element.id } } }
  end
  let!(:research_plan) do
    create(:research_plan, name: 'Linked plan', creator: owner, collections: [collection],
                           body: body, wellplates: linked_wellplates)
  end
  let(:expected_ids) do
    { 'samples' => [sample.id], 'reactions' => [reaction.id], 'wellplates' => [wellplate.id] }
  end
  let(:params) do
    {
      selection: {
        elementType: :advanced,
        search_by_method: :advanced,
        advanced_params: [
          { link: '', match: 'ILIKE', table: 'research_plans', element_id: 0,
            field: { column: 'name', table: 'research_plans' }, value: 'Linked plan' },
        ],
      },
      collection_id: collection.id,
      page: 1,
      per_page: 15,
    }
  end

  shared_examples 'collection research plan results' do
    it 'returns the plan and its linked elements from the searched collection' do
      do_request
      returned_ids = parsed_json_response.slice(*expected_ids.keys).transform_values { |value| value['ids'] }

      expect(response).to have_http_status(:created)
      expect(parsed_json_response.dig('research_plans', 'ids')).to eq [research_plan.id]
      expect(returned_ids).to eq expected_ids
    end
  end

  shared_context 'with links to another collection' do
    let(:other_owner) { create(:person) }
    let(:other_collection) { create(:collection, user: other_owner) }
    let(:other_sample) { create(:sample, creator: other_owner, collections: [other_collection]) }
    let(:other_reaction) { create(:reaction, creator: other_owner, collections: [other_collection]) }
    let(:other_wellplate) { create(:wellplate, collections: [other_collection]) }
    let(:linked_samples) { [sample, other_sample] }
    let(:linked_reactions) { [reaction, other_reaction] }
    let(:linked_wellplates) { [wellplate, other_wellplate] }
  end

  %w[advanced all].each do |endpoint|
    describe "POST /api/v1/search/#{endpoint} for research plans" do
      let(:url) { "/api/v1/search/#{endpoint}" }

      it_behaves_like 'collection research plan results'

      context 'with links to another collection' do
        include_context 'with links to another collection'

        it_behaves_like 'collection research plan results'
      end

      context 'with links to another collection owned by the user' do
        include_context 'with links to another collection'

        let(:other_owner) { user }

        it_behaves_like 'collection research plan results'
      end

      context 'with a collection shared for reading' do
        let(:owner) { create(:person) }

        before do
          create(:collection_share, collection: collection, shared_with: user,
                                    permission_level: CollectionShare.permission_level(:read_elements))
        end

        it_behaves_like 'collection research plan results'
      end

      context 'with repeated links' do
        let(:linked_samples) { [sample, sample] }
        let(:linked_reactions) { [reaction, reaction] }

        it_behaves_like 'collection research plan results'
      end

      context 'with no linked elements' do
        let(:body) { [] }
        let(:linked_wellplates) { [] }
        let(:expected_ids) { { 'samples' => [], 'reactions' => [], 'wellplates' => [] } }

        it_behaves_like 'collection research plan results'
      end

      context 'with reactions created at different times' do
        let(:older_reaction) { create(:reaction, creator: owner, collections: [collection], created_at: 2.days.ago) }
        let(:reaction) { create(:reaction, creator: owner, collections: [collection], created_at: 1.day.ago) }
        let(:linked_reactions) { [older_reaction, reaction] }
        let(:expected_ids) do
          { 'samples' => [sample.id], 'reactions' => [reaction.id, older_reaction.id], 'wellplates' => [wellplate.id] }
        end

        it_behaves_like 'collection research plan results'
      end
    end
  end
  # rubocop:enable RSpec/MultipleMemoizedHelpers
end
