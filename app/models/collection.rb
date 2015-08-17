class Collection < ActiveRecord::Base
  belongs_to :user
  has_ancestry

  has_many :collections_samples
  has_many :samples, through: :collections_samples

  scope :unshared, -> { where(is_shared: false) }
  scope :shared, ->(user_id) { where(shared_by_id: user_id) }
  scope :remote, ->(user_id) { where(is_shared: true) && where.not(shared_by_id: user_id) }

end
