class User < ActiveRecord::Base
  acts_as_paranoid
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable

  has_one :profile, dependent: :destroy

  has_many :collections
  has_many :samples, -> { unscope(:order).distinct }, :through => :collections
  has_many :reactions, through: :collections
  has_many :wellplates, through: :collections

  has_many :samples_created, foreign_key: :created_by, class_name: 'Sample'

  validates_presence_of :first_name, :last_name, allow_blank: false
  validates :name_abbreviation, format: {with: /(\A[a-zA-Z]{1,3}\Z)|(\A[a-zA-Z][a-zA-Z0-9\-_][a-zA-Z]\Z)/,
      message: "can be alphanumeric, middle '_' and '-' are allowed, but leading or trailing digit, '-' and '_' are not."},
    length: {in: 1..3, message: "1 to 3 characters only"},
    uniqueness:  {message: " has already been taken." }

  after_create :create_chemotion_public_collection, :create_all_collection, :has_profile

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
    # Originally initials were used, to have more flexibility a shortcut column was added
    # to the users model. Use <tt>shortcut</tt> insted.
    name_abbreviation
  end

  def restore_counters_data
    samples_number = self.samples_created.pluck(:short_label).map do |l|
      l.split('-').map(&:to_i)
    end.flatten.max

    reactions_number = self.reactions.pluck(:name).map do |l|
      l.split('#').last.to_i
    end.max


    self.counters = {
      samples: samples_number,
      reactions: reactions_number,
      wellplates: self.wellplates.count + self.wellplates.deleted.count
    }

    self.save!
  end

  def increment_counter key
    self.counters[key] = self.counters[key].succ
    self.save!
  end

  def has_profile
    self.create_profile if !self.profile
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
