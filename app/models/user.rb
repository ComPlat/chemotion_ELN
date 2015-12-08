class User < ActiveRecord::Base
  acts_as_paranoid
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable

  has_many :collections
  has_many :samples, through: :collections
  has_many :reactions, through: :collections
  has_many :wellplates, through: :collections

  has_many :samples_created, foreign_key: :created_by, class_name: 'Sample'

  validates_presence_of :first_name, :last_name, allow_blank: false

  after_create :create_chemotion_public_collection, :create_all_collection

  def owns_collections?(collections)
    collections.pluck(:user_id).uniq == [id]
  end

  def owns_unshared_collections?(collections)
    owns_collections?(collections) && collections.pluck(:is_shared).none?
  end

  def name
    "#{first_name} #{last_name}"
  end

  def initials
    "#{first_name[0].capitalize}#{last_name[0].capitalize}"
  end

  private

  # These user collections are locked, i.e., the user is not allowed to:
  # - rename it
  # - move it around in collection tree
  # - add subcollections
  # - delete it
  def create_all_collection
    Collection.create(user: self, label: 'All', is_locked: true)
  end

  def create_chemotion_public_collection
    Collection.create(user: self, label: 'chemotion.net', is_locked: true)
  end
end
