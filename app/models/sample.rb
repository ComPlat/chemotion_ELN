class Sample < ActiveRecord::Base
  has_many :collections_samples
  has_many :collections, through: :collections_samples
end
