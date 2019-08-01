class User < ActiveRecord::Base
  acts_as_paranoid
  # Include default devise modules. Others available are:
  # :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable, #:confirmable,
         :recoverable, :rememberable, :trackable, :validatable, :lockable

  has_one :profile, dependent: :destroy
  has_one :container, :as => :containable

  has_many :collections
  has_many :samples, -> { unscope(:order).distinct }, :through => :collections
  has_many :reactions, through: :collections
  has_many :wellplates, through: :collections
  has_many :screens, through: :collections
  has_many :research_plans, :through => :collections

  has_many :samples_created, foreign_key: :created_by, class_name: 'Sample'

  has_many :sync_out_collections_users, foreign_key: :shared_by_id, class_name: 'SyncCollectionsUser'
  has_many :sync_in_collections_users,  foreign_key: :user_id, class_name: 'SyncCollectionsUser'
  has_many :sharing_collections, through: :sync_out_collections_users, source: :collection
  has_many :shared_collections,  through: :sync_in_collections_users, source: :collection
  has_many :devices, through: :users_devices
  #belongs_to :selected_device, class_name: 'Device'

  has_many :reports_users
  has_many :reports, through: :reports_users

  has_many :user_affiliations, :dependent => :destroy
  has_many :affiliations, through: :user_affiliations

  has_many :computed_props

  accepts_nested_attributes_for :affiliations

  validates_presence_of :first_name, :last_name, allow_blank: false
  validates :name_abbreviation, uniqueness:  {message: " has already been taken." },
    format: {with: /\A[a-zA-Z][a-zA-Z0-9\-_]{0,4}[a-zA-Z0-9]\Z/,
    message: "can be alphanumeric, middle '_' and '-' are allowed,"+
    " but leading digit, or trailing '-' and '_' are not."}
  validate :name_abbreviation_length
# validate :academic_email
  validate :mail_checker
  after_create :create_chemotion_public_collection
  after_create :create_all_collection, :has_profile
  before_destroy :delete_data

  scope :by_name, ->(query) {
    where('LOWER(first_name) ILIKE ? OR LOWER(last_name) ILIKE ?',
          "#{query.downcase}%", "#{query.downcase}%")
  }

  def name_abbreviation_length
    na = name_abbreviation
    if type == 'Group'
      na.blank? || !na.length.between?(2, 5)  && errors.add(:name_abbreviation,
      "has to be 2 to 5 characters long")
    elsif type == 'Device'
        na.blank? || !na.length.between?(2, 6)  && errors.add(:name_abbreviation,
        "has to be 2 to 6 characters long")
    else
      na.blank? || !na.length.between?(2, 3)  && errors.add(:name_abbreviation,
        "has to be 2 to 3 characters long")
    end
  end

  def academic_email
    Swot::is_academic?(email) || errors.add(
      :email, 'not from an academic organization'
    )
  end

  def mail_checker
    MailChecker.valid?(email) || errors.add(
      :email, 'from throwable email providers not accepted'
    )
  end

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
    name_abbreviation
  end

  def restore_counters_data
    samples_number = self.samples_created.pluck(:short_label).map do |l|
      l.split('-').map(&:to_i)
    end.flatten.max || 0

    reactions_number = self.reactions.pluck(:name).map do |l|
      l.split('#').last.to_i
    end.max || 0


    self.counters = {
      samples: samples_number,
      reactions: reactions_number,
      wellplates: self.wellplates.count + self.wellplates.deleted.count
    }

    self.save!
  end

  def increment_counter key
    return if self.counters[key].nil?
    self.counters[key] = self.counters[key].succ
    self.save!
  end

  def has_profile
    self.create_profile if !self.profile
    if self.type == 'Person'
      profile = self.profile
      data = profile.data || {}
      file = Rails.public_path.join('ontologies','chmo.default.profile.json')
      result = JSON.parse(File.read(file, encoding:  'bom|utf-8')) if File.exist?(file)
      unless result.nil? || result['ols_terms'].nil?
        data['chmo'] = result['ols_terms']
        self.profile.update_columns(data: data)
      end
   end
  end

  has_many :users_groups,  dependent: :destroy, foreign_key: :user_id
  has_many :groups, through: :users_groups

  def group_ids
    self.groups.pluck(:id)
  end

  def group_collections
    Collection.where("user_id = ? AND is_locked = ?", self.groups.pluck(:id), false)
  end

  def all_collections
    Collection.where("user_id IN (?) ", [self.id]+self.groups.pluck(:id))
  end

  def all_sync_in_collections_users
    SyncCollectionsUser.where("user_id IN (?) ", [self.id]+self.groups.pluck(:id))
  end

  def current_affiliations
    Affiliation.joins(
     "INNER JOIN user_affiliations ua ON ua.affiliation_id = affiliations.id"
    ).where(
      "(ua.user_id = ?) and (ua.deleted_at ISNULL) \
      and (ua.to ISNULL or ua.to > ?)", id, Time.now
    ).order("ua.from DESC")
  end

  def is_templates_moderator
    profile&.data&.fetch('is_templates_moderator', false)
  end

  private

  # These user collections are locked, i.e., the user is not allowed to:
  # - rename it
  # - move it around in collection tree
  # - add subcollections
  # - delete it
  def create_all_collection
    Collection.create(user: self, label: 'All', is_locked: true, position: 0)
  end

  def create_chemotion_public_collection
    return unless self.type == 'Person'
    Collection.create(user: self, label: 'chemotion.net', is_locked: true, position: 1)
  end
end

def delete_data
  # TODO: logic to check if user can be really destroy or which data can be deleted
  count = self.samples.count
    # + self.reactions.count
    # + self.wellplates.count
    # + self.screens.count
    # + self.research_plans.count
  self.update_columns(email: "#{id}_#{name_abbreviation}@deleted")
  self.update_columns(name_abbreviation: nil )if count.zero?
end

class Person < User
  has_many :users_groups,  dependent: :destroy, foreign_key: :user_id
  has_many :groups, through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :admin_id
  has_many :administrated_accounts,  through: :users_admins, source: :user
end

class Device < User
  has_many :users_devices, dependent: :destroy
  has_many :users, class_name: "User", through: :users_devices

  has_many :users_admins, dependent: :destroy, foreign_key: :user_id
  has_many :admins,  through: :users_admins, source: :admin

  scope :by_user_ids, ->(ids) { joins(:users_devices).merge(UsersDevice.by_user_ids(ids)) }
  scope :novnc, -> { joins(:profile).merge(Profile.novnc) }
end

class Group < User

  has_many :users_groups, dependent: :destroy
  has_many :users,class_name: "User", through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :user_id
  has_many :admins,  through: :users_admins, source: :admin# ,  foreign_key:    association_foreign_key: :admin_id
end
