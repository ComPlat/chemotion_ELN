class Container < ActiveRecord::Base
  belongs_to :sample
  has_many :attachments
  has_ancestry
end
