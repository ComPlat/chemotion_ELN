class Collection < ActiveRecord::Base
  belongs_to :user
  has_ancestry

  has_many :collections_samples
  has_many :samples, through: :collections_samples

  scope :shared, -> { where(is_shared: true) }

  def is_all_collection?
    label == 'All'
  end
end
