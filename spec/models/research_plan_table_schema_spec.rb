# == Schema Information
#
# Table name: research_plan_table_schemas
#
#  id         :integer          not null, primary key
#  created_by :integer          not null
#  deleted_at :datetime
#  name       :string
#  value      :jsonb
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
require 'rails_helper'

RSpec.describe ResearchPlanTableSchema, type: :model do
  pending "add some examples to (or delete) #{__FILE__}"
end
