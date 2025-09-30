# frozen_string_literal: true

# == Schema Information
#
# Table name: text_templates
#
#  id         :integer          not null, primary key
#  data       :jsonb
#  deleted_at :datetime
#  name       :string
#  type       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :integer          not null
#
# Indexes
#
#  index_predefined_template           (name) UNIQUE WHERE ((type)::text = 'PredefinedTextTemplate'::text)
#  index_text_templates_on_deleted_at  (deleted_at)
#  index_text_templates_on_user_id     (user_id)
#
require 'rails_helper'

RSpec.describe TextTemplate, type: :model do
  pending "add some examples to (or delete) #{__FILE__}"
end
