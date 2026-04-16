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

class PredefinedTextTemplate < TextTemplate
  validates :name, presence: true, uniqueness: true
end
