class Collection < ActiveRecord::Base
  belongs_to :user
  has_ancestry

  has_many :collections_samples
  has_many :samples, through: :collections_samples

  def is_all_collection?
    label == 'All'
  end
end
