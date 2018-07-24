class Literal < ActiveRecord::Base
  # acts_as_paranoid
  belongs_to :literature
  belongs_to :element, polymorphic: true
  belongs_to :user

  scope :by_element_attributes, ->(id, type) { where(element_id: id, element_type: type) }
  scope :by_element_attributes_and_cat, ->(id, type, cat) {
    where(element_id: id, element_type: type, category: cat)
  }
  
end
