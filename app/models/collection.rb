class Collection < ActiveRecord::Base
  belongs_to :user
  has_ancestry

  has_many :collections_samples
  has_many :collections_reactions
  has_many :samples, through: :collections_samples
  has_many :reactions, through: :collections_reactions

  scope :unshared, -> { where(is_shared: false) }
  scope :shared, ->(user_id) { where(shared_by_id: user_id) }
  scope :remote, ->(user_id) { where(is_shared: true) && where.not(shared_by_id: user_id) }
  scope :belongs_to_or_shared_by, ->(user_id) { where("user_id = ? OR shared_by_id = ?", user_id, user_id) }
end
