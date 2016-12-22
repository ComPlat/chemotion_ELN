require 'rails_helper'

describe Chemotion::ResearchPlanAPI do
  context 'authorized user logged in' do
    let(:user)  { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/research_plans/:id' do
      context 'with appropriate permissions' do
        let!(:c)      { create(:collection, user_id: user.id) }
        let!(:research_plan) { create(:research_plan) }

        before do
          CollectionsResearchPlan.create!(research_plan: research_plan, collection: c)

          get "/api/v1/research_plans/#{research_plan.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns serialized sample' do
          expect(JSON.parse(response.body)['research_plan']['name']).to eq research_plan.name
        end
      end
    end

    describe 'GET /api/v1/research_plans' do
      let!(:c) { create(:collection, label: 'C1', user: user, is_shared: false) }
      let(:rp)  { create(:research_plan) }

      before do
        CollectionsResearchPlan.create!(research_plan: rp, collection: c)
      end

      it 'returns serialized research_plans of logged in user' do
        get '/api/v1/research_plans'
        first_rp = JSON.parse(response.body)['research_plans'].first
        expect(response.status).to eq 200
        expect(first_rp).to include(
          "type" => 'research_plan',
          "name" => rp.name,
          "description" => rp.description,
          "sdf_file" => 'sdf.test',
          "svg_file" => 'svg.test',
        )
      end
    end

    describe "POST /api/v1/research_plans" do
      context 'with valid parameters' do
        let(:params) {
          {
            name: 'test',
            description: 'test description',
            sdf_file: 'test_inline_content',
            svg_file: 'test_inline_svg_content'
          }
        }

        before { post '/api/v1/research_plans', params }

        it 'should be able to create a new research plan' do
          rp = ResearchPlan.find_by(name: 'test')
          expect(rp).to_not be_nil

          params.each do |k, v|
            expect(rp.attributes.symbolize_keys[k]).to eq(v)
          end
        end

        it 'should set the creator' do
          rp = ResearchPlan.find_by(name: 'test')
          expect(rp.creator).to eq(user)
        end
      end
    end
  end
end
