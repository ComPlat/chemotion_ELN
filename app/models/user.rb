# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  reset_password_token   :string
#  reset_password_sent_at :datetime
#  remember_created_at    :datetime
#  sign_in_count          :integer          default(0), not null
#  current_sign_in_at     :datetime
#  last_sign_in_at        :datetime
#  current_sign_in_ip     :inet
#  last_sign_in_ip        :inet
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  name                   :string
#  first_name             :string           not null
#  last_name              :string           not null
#  deleted_at             :datetime
#  counters               :hstore           not null
#  name_abbreviation      :string(12)
#  type                   :string           default("Person")
#  reaction_name_prefix   :string(3)        default("R")
#  layout                 :hstore           not null
#  confirmation_token     :string
#  confirmed_at           :datetime
#  confirmation_sent_at   :datetime
#  unconfirmed_email      :string
#  selected_device_id     :integer
#  failed_attempts        :integer          default(0), not null
#  unlock_token           :string
#  locked_at              :datetime
#  account_active         :boolean
#  matrix                 :integer          default(0)
#
# Indexes
#
#  index_users_on_confirmation_token    (confirmation_token) UNIQUE
#  index_users_on_deleted_at            (deleted_at)
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_name_abbreviation     (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#  index_users_on_unlock_token          (unlock_token) UNIQUE
#

class User < ActiveRecord::Base
  attr_writer :login
  acts_as_paranoid
  # Include default devise modules. Others available are:
  # :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable, :confirmable,
         :recoverable, :rememberable, :trackable, :validatable, :lockable, authentication_keys: [:login]
  has_one :profile, dependent: :destroy
  has_one :container, as: :containable

  has_many :collections
  has_many :samples, -> { unscope(:order).distinct }, through: :collections
  has_many :reactions, through: :collections
  has_many :wellplates, through: :collections
  has_many :screens, through: :collections
  has_many :research_plans, through: :collections

  has_many :samples_created, foreign_key: :created_by, class_name: 'Sample'

  has_many :sync_out_collections_users, foreign_key: :shared_by_id, class_name: 'SyncCollectionsUser'
  has_many :sync_in_collections_users,  foreign_key: :user_id, class_name: 'SyncCollectionsUser'
  has_many :sharing_collections, through: :sync_out_collections_users, source: :collection
  has_many :shared_collections,  through: :sync_in_collections_users, source: :collection
  has_many :users_devices, dependent: :destroy, foreign_key: :user_id
  has_many :devices, through: :users_devices
  # belongs_to :selected_device, class_name: 'Device'

  has_many :reports_users
  has_many :reports, through: :reports_users

  has_many :user_affiliations, dependent: :destroy
  has_many :affiliations, through: :user_affiliations

  has_many :computed_props

  has_many :text_templates, dependent: :destroy
  has_one :sample_text_template, dependent: :destroy
  has_one :reaction_text_template, dependent: :destroy
  has_one :reaction_description_text_template, dependent: :destroy
  has_one :screen_text_template, dependent: :destroy
  has_one :wellplate_text_template, dependent: :destroy
  has_one :research_plan_text_template, dependent: :destroy

  accepts_nested_attributes_for :affiliations

  validates_presence_of :first_name, :last_name, allow_blank: false
  validates :name_abbreviation,
            uniqueness: { message: ' has already been taken.' },
            format: {
              with: /\A[a-zA-Z][a-zA-Z0-9\-_]*[a-zA-Z0-9]\Z/,
              message: " can be alphanumeric, middle '_' and '-' are allowed, but leading digit, or trailing '-' and '_' are not."
            }
  validate :name_abbreviation_reserved_list, on: :create
  validate :name_abbreviation_length, on: :create
  # validate :academic_email
  validate :mail_checker

  # NB: only Persons and Admins can get a confirmation email and confirm their email.
  before_create :skip_confirmation_notification!, unless: proc { |user| %w[Person Admin].include?(user.type) }
  # NB: option to skip devise confirmable for Admins and Persons
  before_create :skip_confirmation!, if: proc { |user| %w[Person Admin].include?(user.type) && self.class.allow_unconfirmed_access_for.nil? }
  before_create :set_account_active, if: proc { |user| %w[Person].include?(user.type) }

  after_create :create_chemotion_public_collection
  after_create :create_all_collection, :has_profile
  after_create :new_user_text_template
  after_create :update_matrix
  before_destroy :delete_data

  scope :by_name, ->(query) {
    where("LOWER(first_name) ILIKE ? OR LOWER(last_name) ILIKE ? OR LOWER(first_name || ' ' || last_name) ILIKE ?",
          "#{sanitize_sql_like(query.downcase)}%", "#{sanitize_sql_like(query.downcase)}%", "#{sanitize_sql_like(query.downcase)}%")
  }

  def login
    @login || self.name_abbreviation || self.email
  end

  def self.find_first_by_auth_conditions(warden_conditions)
    conditions = warden_conditions.dup
    if (login = conditions.delete(:login))
      where(conditions).where(["name_abbreviation = :value OR lower(email) = lower(:value)", { value: login }]).first
    else
      where(conditions).first
    end
  end

  def active_for_authentication?
    super && account_active
  end

  def name_abbreviation_reserved_list
    name_abbr_config = Rails.configuration.respond_to?(:user_props) ? (Rails.configuration.user_props&.name_abbr || {}) : {}
    if (name_abbr_config[:reserved_list] || []).include?(name_abbreviation)
      errors.add(:name_abbreviation, " is reserved, please change")
    end
  end

  def name_abbreviation_length
    na = name_abbreviation
    name_abbr_config = Rails.configuration.respond_to?(:user_props) ? (Rails.configuration.user_props&.name_abbr || {}) : {}
    case type
    when 'Group'
      min_val = name_abbr_config[:length_group]&.first || 2
      max_val = name_abbr_config[:length_group]&.last || 5
    when 'Device'
      min_val = name_abbr_config[:length_device]&.first || 2
      max_val = name_abbr_config[:length_device]&.last || 5
    else
      min_val = name_abbr_config[:length_default]&.first || 2
      max_val = name_abbr_config[:length_default]&.last || 3
    end

    na.blank? || !na.length.between?(min_val, max_val) &&
      errors.add(:name_abbreviation, "has to be #{min_val} to #{max_val} characters long")
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

  def increment_counter(key)
    return if self.counters[key].nil?

    self.counters[key] = self.counters[key].succ
    self.save!
  end

  def has_profile
    self.create_profile if !self.profile
    if self.type == 'Person'
      profile = self.profile
      data = profile.data || {}
      file = Rails.root.join('db', 'chmo.default.profile.json')
      result = JSON.parse(File.read(file, encoding: 'bom|utf-8')) if File.exist?(file)
      unless result.nil? || result['ols_terms'].nil?
        data['chmo'] = result['ols_terms']
        data['is_templates_moderator'] = false
        data['molecule_editor'] = false
        self.profile.update_columns(data: data)
      end
    end
  end

  has_many :users_groups, dependent: :destroy, foreign_key: :user_id
  has_many :groups, through: :users_groups

  def group_ids
    groups.pluck(:id)
  end

  def group_collections
    Collection.where('user_id = ? AND is_locked = ?', group_ids, false)
  end

  def all_collections
    Collection.where('user_id IN (?) ', [id] + group_ids)
  end

  def all_sync_in_collections_users
    SyncCollectionsUser.where('user_id IN (?) ', [id] + group_ids)
  end

  def current_affiliations
    Affiliation.joins(
      'INNER JOIN user_affiliations ua ON ua.affiliation_id = affiliations.id'
    ).where(
      '(ua.user_id = ?) and (ua.deleted_at ISNULL) and (ua.to ISNULL or ua.to > ?)',
      id, Time.now
    ).order('ua.from DESC')
  end

  def is_templates_moderator
    profile&.data&.fetch('is_templates_moderator', false)
  end

  def molecule_editor
    profile&.data&.fetch('molecule_editor', false)
  end

  def matrix_check_by_name(name)
    mx = Matrice.find_by(name: name)
    return false if mx.nil?

    matrix_check(mx.id)
  end

  def matrix_check(id)
    pins = matrix.to_s(2)
    return false if pins.nil? || id > pins.length

    (pins && pins.reverse[id]) == '1'
  end

  def update_matrix
    check_sql = ActiveRecord::Base.send(:sanitize_sql_array, ["SELECT to_regproc('generate_users_matrix') IS NOT null as rs"])
    result = ActiveRecord::Base.connection.exec_query(check_sql)
    if result.first["rs"] == 't'
      sql = ActiveRecord::Base.send(:sanitize_sql_array, ['select generate_users_matrix(array[?])', id])
      ActiveRecord::Base.connection.exec_query(sql)
    end
  rescue StandardError => e
    log_error 'Error on update_matrix'
  end

  def remove_from_matrices
    Matrice.where('include_ids @> ARRAY[?]', [id]).each { |ma| ma.update_columns(include_ids: ma.include_ids -= [id]) }
    Matrice.where('exclude_ids @> ARRAY[?]', [id]).each { |ma| ma.update_columns(exclude_ids: ma.exclude_ids -= [id]) }
  end

  def self.gen_matrix(user_ids = nil)
    check_sql = ActiveRecord::Base.send(:sanitize_sql_array, ["SELECT to_regproc('generate_users_matrix') IS NOT null as rs"])
    result = ActiveRecord::Base.connection.exec_query(check_sql)
    if result.first['rs'] == 't'
      sql = if user_ids.present?
              ActiveRecord::Base.send(:sanitize_sql_array, ['select generate_users_matrix(array[?])', user_ids])
            else
              'select generate_users_matrix(null)'
            end
      ActiveRecord::Base.connection.exec_query(sql)
    end
  rescue StandardError => e
    log_error 'Error on update_matrix'
  end

  def create_text_template
    TextTemplate.types.keys.each do |type|
      klass = type.to_s.constantize
      template = klass.new
      template.user_id = id
      template.data = klass.default_templates
      template.save!
    end
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

  def new_user_text_template
    create_text_template
  end

  def create_chemotion_public_collection
    return unless self.type == 'Person'

    Collection.create(user: self, label: 'chemotion.net', is_locked: true, position: 1)
  end

  def set_account_active
    self.account_active = ENV['DEVISE_NEW_ACCOUNT_INACTIVE'].presence != 'true'
  end

  def delete_data
    # TODO: logic to check if user can be really destroy or which data can be deleted
    count = samples.count
      # + self.reactions.count
      # + self.wellplates.count
      # + self.screens.count
      # + self.research_plans.count
    update_columns(email: "#{id}_#{name_abbreviation}@deleted")
    update_columns(name_abbreviation: nil) if count.zero?
  end
end

class Person < User
  has_many :users_groups, dependent: :destroy, foreign_key: :user_id
  has_many :groups, through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :admin_id
  has_many :administrated_accounts,  through: :users_admins, source: :user
end

class Device < User
  has_many :users_devices, dependent: :destroy
  has_many :users, class_name: 'User', through: :users_devices

  has_many :users_admins, dependent: :destroy, foreign_key: :user_id
  has_many :admins, through: :users_admins, source: :admin

  scope :by_user_ids, ->(ids) { joins(:users_devices).merge(UsersDevice.by_user_ids(ids)) }
  scope :novnc, -> { joins(:profile).merge(Profile.novnc) }
end

class Group < User
  has_many :users_groups, dependent: :destroy
  has_many :users, class_name: 'User', through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :user_id
  has_many :admins,  through: :users_admins, source: :admin # ,  foreign_key:    association_foreign_key: :admin_id
end
