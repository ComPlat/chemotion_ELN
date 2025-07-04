# == Schema Information
#
# Table name: research_plan_metadata
#
#  id                      :integer          not null, primary key
#  affiliation             :text
#  alternate_identifier    :jsonb
#  contributor             :text
#  creator                 :text
#  data_cite_created_at    :datetime
#  data_cite_creator_name  :string
#  data_cite_last_response :jsonb
#  data_cite_prefix        :string
#  data_cite_state         :string           default("draft")
#  data_cite_updated_at    :datetime
#  data_cite_version       :integer
#  dates                   :jsonb
#  deleted_at              :datetime
#  description             :jsonb
#  doi                     :string
#  format                  :string
#  funding_reference       :jsonb
#  geo_location            :jsonb
#  landing_page            :string
#  language                :string
#  publication_year        :integer
#  publisher               :string
#  related_identifier      :jsonb
#  rights                  :text
#  subject                 :text
#  title                   :string
#  type                    :string
#  url                     :string
#  version                 :string
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  research_plan_id        :integer
#
# Indexes
#
#  index_research_plan_metadata_on_deleted_at        (deleted_at)
#  index_research_plan_metadata_on_research_plan_id  (research_plan_id)
#
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
