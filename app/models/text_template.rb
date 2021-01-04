# == Schema Information
#
# Table name: text_templates
#
#  id         :integer          not null, primary key
#  type       :string
#  user_id    :integer          not null
#  data       :jsonb
#  deleted_at :datetime
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  name       :string
#
# Indexes
#
#  index_predefined_template           (name) UNIQUE WHERE ((type)::text = 'PredefinedTextTemplate'::text)
#  index_text_templates_on_deleted_at  (deleted_at)
#  index_text_templates_on_user_id     (user_id)
#

class TextTemplate < ActiveRecord::Base
  enum type: %i(
    SampleTextTemplate
    ReactionTextTemplate
    WellplateTextTemplate
    ScreenTextTemplate
    ResearchPlanTextTemplate
  )

  belongs_to :user
end

class PredefinedTextTemplate < TextTemplate
end

class SampleTextTemplate < TextTemplate
end

class ReactionTextTemplate < TextTemplate
end

class ReactionDescTextTemplate < TextTemplate
end

class WellplateTextTemplate < TextTemplate
end

class ScreenTextTemplate < TextTemplate
end

class ResearchPlanTextTemplate < TextTemplate
end
