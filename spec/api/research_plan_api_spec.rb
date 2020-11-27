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

      before do
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
  end
end
