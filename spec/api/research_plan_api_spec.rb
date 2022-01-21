# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ResearchPlanAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/research_plans/:id' do
      context 'with appropriate permissions' do
        let!(:c) { create(:collection, user_id: user.id) }
        let!(:research_plan) { create(:research_plan) }

        before do
          CollectionsResearchPlan.create!(research_plan: research_plan, collection: c)

          get "/api/v1/research_plans/#{research_plan.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns serialized research_plan' do
          expect(JSON.parse(response.body)['research_plan']['name']).to eq research_plan.name
        end
      end
    end

    describe 'GET /api/v1/research_plans' do
      let!(:c) { create(:collection, label: 'C1', user: user, is_shared: false) }
      let(:rp) { create(:research_plan) }
      let!(:research_plan_metadata) { create(:research_plan_metadata) }

      before do
        rp.research_plan_metadata = research_plan_metadata
        CollectionsResearchPlan.create!(research_plan: rp, collection: c)
      end

      it 'returns serialized research_plans of logged in user' do
        get '/api/v1/research_plans'
        first_rp = JSON.parse(response.body)['research_plans'].first
        expect(response.status).to eq 200
        expect(first_rp).to include(
          'type' => 'research_plan',
          'name' => rp.name
        )
        expect(first_rp['research_plan_metadata']).to include(
            'id' => research_plan_metadata.id,
            'doi' => research_plan_metadata.doi
        )
      end
    end

    describe 'POST /api/v1/research_plans' do
      context 'with valid parameters' do
        let(:params) do
          {
            name: 'test',
            container: {
              attachments: [],
              children: [],
              is_new: true,
              is_deleted: false,
              name: 'new'
            }
          }
        end

        before { post '/api/v1/research_plans', params: params,  as: :json}

        it 'is able to create a new research plan' do
          rp = ResearchPlan.find_by(name: 'test')
          expect(rp).not_to be_nil
          params.delete(:container)
          params.each do |k, v|
            expect(rp.attributes.symbolize_keys[k]).to eq(v)
          end
        end

        it 'sets the creator' do
          rp = ResearchPlan.find_by(name: 'test')
          expect(rp.creator).to eq(user)
        end
      end
    end

    describe 'POST /api/v1/research_plans/:id/import_wellplate/:wellplate_id' do
      let(:collection) { create(:collection, user_id: user.id, is_shared: true, permission_level: 3) }
      let(:wellplate) { create(:wellplate, :with_random_wells, number_of_readouts: 3) }
      let(:research_plan) { create(:research_plan, creator: user) }
      let(:params) { { research_plan_id: research_plan.id } }

      before do
        CollectionsWellplate.create!(wellplate: wellplate, collection: collection)
        CollectionsResearchPlan.create!(research_plan: research_plan, collection: collection)

        post "/api/v1/research_plans/#{research_plan.id}/import_wellplate/#{wellplate.id}", params: params, as: :json
      end

      it 'imports the wellplate as table into the research plan body' do
        response_body = JSON.parse(response.body)
        table = response_body.dig('research_plan', 'body').last

        expect(response_body.key?('error')).to be false

        rows = table['value']['rows']
        columns = table['value']['columns']

        expect(table['type']).to eq 'table'

        expect(rows.size).to eq 12 * 8
        expect(columns.size).to eq 4 # coordinate + 3 readouts

        names = columns.map { |column| column['name'] }
        expect(names).to eq ['X, Y', 'Readout 1', 'Readout 2', 'Readout 3']
      end
    end
  end
end
