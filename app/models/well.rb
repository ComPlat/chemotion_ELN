class Well < ActiveRecord::Base
  has_many :collections_wellplates
  has_many :collections, through: :collections_wellplates

  has_many :wellplates_samples
end
