# == Schema Information
#
# Table name: text_templates
#
#  id         :integer          not null, primary key
#  type       :string
#  user_id    :integer          not null
#  name       :string
#  data       :jsonb
#  deleted_at :datetime
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_predefined_template           (name) UNIQUE WHERE ((type)::text = 'PredefinedTextTemplate'::text)
#  index_text_templates_on_deleted_at  (deleted_at)
#  index_text_templates_on_user_id     (user_id)
#

class ElementTextTemplate < TextTemplate
  # STI: this file is only here because of rails model autoloading.
  # place all code in app/models/text_template.rb.
end
