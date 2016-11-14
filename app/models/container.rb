class Container < ActiveRecord::Base
  belongs_to :element, :polymorphic => true
  has_many :attachments
  has_ancestry

  #accepts_nested_attributes_for :container
  scope :ordered, -> { order("name ASC") }

end
