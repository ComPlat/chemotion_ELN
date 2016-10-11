class Container < ActiveRecord::Base
  belongs_to :sample
  has_many :attachments
  has_ancestry

  #accepts_nested_attributes_for :container
  scope :ordered, -> { order("name ASC") }

end
