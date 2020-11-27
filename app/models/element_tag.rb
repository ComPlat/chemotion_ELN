# == Schema Information
#
# Table name: element_tags
#
#  id            :integer          not null, primary key
#  taggable_type :string
#  taggable_id   :integer
#  taggable_data :jsonb
#  created_at    :datetime
#  updated_at    :datetime
#
# Indexes
#
#  index_element_tags_on_taggable_id  (taggable_id)
#

class ElementTag < ApplicationRecord
  belongs_to :taggable, polymorphic: true, optional: true
end
