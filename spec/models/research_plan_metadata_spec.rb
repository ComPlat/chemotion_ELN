require 'rails_helper'

RSpec.describe ResearchPlanMetadata, type: :model do
  let(:research_plan) { create(:research_plan) }
  let(:research_plan_metadata) { build(:research_plan_metadata) }

  before do
    research_plan.research_plan_metadata = research_plan_metadata
    research_plan.save
  end

  it 'handles research_plan_metadata relationship correctly' do
    expect(research_plan.research_plan_metadata).to eq ResearchPlanMetadata.find(research_plan_metadata.id)
  end
end
