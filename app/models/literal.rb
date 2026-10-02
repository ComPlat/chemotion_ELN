# frozen_string_literal: true

# == Schema Information
#
# Table name: literals
#
#  id            :integer          not null, primary key
#  category      :string(40)
#  deleted_at    :datetime
#  element_type  :string(40)
#  litype        :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  element_id    :integer
#  literature_id :integer
#  user_id       :integer
#
# Indexes
#
#  index_on_element_literature  (element_type,element_id,literature_id,category)
#  index_on_literature          (literature_id,element_type,element_id)
#
# Foreign Keys
#
#  fk_rails_...  (literature_id => literatures.id)
#

class Literal < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :literature
  belongs_to :element, polymorphic: true
  belongs_to :user

  scope :by_element_attributes, ->(id, type) { where(element_id: id, element_type: type) }
  scope :by_element_attributes_and_cat, lambda { |id, type, cat|
    where(element_id: id, element_type: type, category: cat)
  }
end
