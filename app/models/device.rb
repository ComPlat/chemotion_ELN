# frozen_string_literal: true

# == Schema Information
#
# Table name: devices
#
#  id                                :bigint           not null, primary key
#  name                              :string
#  name_abbreviation                 :string
#  first_name                        :string
#  last_name                         :string
#  email                             :string
#  serial_number                     :string
#  verification_status               :string           default("none")
#  account_active                    :boolean          default(FALSE)
#  visibility                        :boolean          default(FALSE)
#  deleted_at                        :datetime
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  datacollector_method              :string
#  datacollector_dir                 :string
#  datacollector_host                :string
#  datacollector_user                :string
#  datacollector_authentication      :string
#  datacollector_number_of_files     :string
#  datacollector_key_name            :string
#  datacollector_user_level_selected :boolean          default(FALSE)
#  novnc_token                       :string
#  novnc_target                      :string
#  novnc_password                    :string
#
# Indexes
#
#  index_devices_on_deleted_at         (deleted_at)
#  index_devices_on_email              (email) UNIQUE
#  index_devices_on_name_abbreviation  (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#
class Device < ApplicationRecord
  attr_accessor :datacollector_fields

  include Encryptor

  DATACOLLECTOR_ATTRIBUTES_TO_CHECK = %w[
    datacollector_method datacollector_user datacollector_host
    datacollector_key_name datacollector_dir
  ].freeze

  DATACOLLECTOR_SFTP_ATTRIBUTES = %w[
    datacollector_method datacollector_dir datacollector_user datacollector_host
  ].freeze

  acts_as_paranoid

  has_many :users_devices, dependent: :destroy
  has_many :users, through: :users_devices
  has_many :people, through: :users_devices, source: :user, class_name: 'Person'
  has_many :groups, through: :users_devices, source: :user, class_name: 'Group'

  has_one :device_metadata, dependent: :destroy
  has_many :device_descriptions, dependent: :nullify

  validates :name, presence: true
  validate :unique_name_abbreviation
  validate :name_abbreviation_reserved_list, on: :create
  validate :name_abbreviation_length, on: :create
  validate :name_abbreviation_format, on: :create
  validate :mail_checker
  validates :email, uniqueness: { message: 'already exists' }, allow_blank: true

  with_options unless: :datacollector_values_present? do
    validate :datacollector_check_basics
    validate :datacollector_check_sftp
    validate :datacollector_check_keyfile
    validate :datacollector_check_local_path
    validate :datacollector_check_sftp_keyfile_path
  end

  before_save :encrypt_novnc_password
  before_save :normalize_email

  scope :by_user_ids, ->(ids) { joins(:users_devices).merge(UsersDevice.by_user_ids(ids)) }
  scope :by_name, ->(query) { where('LOWER(name) ILIKE ?', "%#{sanitize_sql_like(query.downcase)}%") }
  scope :by_email, ->(query) { where('LOWER(email) ILIKE ?', sanitize_sql_like(query.downcase.strip)) }

  def unique_name_abbreviation
    devices = Device.unscoped.where('LOWER(name_abbreviation) = ?',
                                    Device.sanitize_sql_like(name_abbreviation.downcase).to_s)
    return if devices.blank? || (devices.size == 1 && devices.first.id == id)

    errors.add(:name_abbreviation, :in_use)
  end

  def name_abbr_config
    props = Rails.configuration.respond_to?(:user_props) ? (Rails.configuration.user_props&.name_abbr || {}) : {}
    @name_abbr_config ||= props
  end

  def name_abbreviation_reserved_list
    return unless (name_abbr_config[:reserved_list] || []).include?(name_abbreviation)

    errors.add(:name_abbreviation, :reserved)
  end

  def name_abbreviation_format
    format_abbr_default = /\A[a-zA-Z][a-zA-Z0-9\-_]*[a-zA-Z0-9]\Z/
    format_err_msg_default = "Can be alphanumeric, middle '_' and '-' are allowed,"
    format_err_msg_default += " but leading digit, or trailing '-' and '_' are not."

    format_abbr = name_abbr_config[:format_abbr].presence || format_abbr_default.presence
    format_err_msg = name_abbr_config[:format_abbr_err_msg].presence || format_err_msg_default.presence

    return if name_abbreviation&.match?(format_abbr)

    errors.add(:name_abbreviation, message: format_err_msg)
  end

  def name_abbreviation_length
    min_val = name_abbr_config[:length_device]&.first || 2
    max_val = name_abbr_config[:length_device]&.last || 5

    return unless name_abbreviation.blank? || !name_abbreviation.length.between?(min_val, max_val)

    errors.add(:name_abbreviation, :wrong_length, { min: min_val, max: max_val })
  end

  def mail_checker
    return true if email.blank?

    MailChecker.valid?(email) || errors.add(
      :email, 'from throwable email providers not accepted'
    )
  end

  def datacollector_values_present?
    attributes.slice(*self.class::DATACOLLECTOR_ATTRIBUTES_TO_CHECK).values.none?(&:present?)
  end

  def datacollector_sftp_values_present?
    attributes.slice(*self.class::DATACOLLECTOR_SFTP_ATTRIBUTES).values.all?(&:present?)
  end

  def datacollector_check_basics
    errors.add(:datacollector_method, :blank) if datacollector_method.blank?
    errors.add(:datacollector_dir, :blank) if datacollector_dir.blank?
  end

  def datacollector_check_sftp
    return unless datacollector_method.present? && datacollector_method.end_with?('sftp')

    errors.add(:datacollector_user, :blank) if datacollector_user.blank?
    errors.add(:datacollector_host, :blank) if datacollector_host.blank?
  end

  def datacollector_check_keyfile
    return unless datacollector_authentication == 'keyfile' && datacollector_key_name.blank?

    errors.add(:datacollector_key_name, :blank)
  end

  def datacollector_pathname
    return if datacollector_dir.blank?

    Pathname.new(datacollector_dir)
  end

  def datacollector_localpath_config
    return unless datacollector_pathname.directory?

    localpath =
      Rails.configuration.datacollectors.localcollectors.find do |e|
        datacollector_pathname.realpath.to_path.start_with?(e[:path])
      end

    return if localpath.nil?

    datacollector_pathname.realpath.to_path.sub(localpath[:path], '')
  end

  def datacollector_key_dir_path
    return if datacollector_key_name.blank?

    keydir = Rails.configuration.datacollectors&.keydir
    return if keydir.blank?

    if keydir&.start_with?('/')
      Pathname.new(keydir).join(datacollector_key_name)
    else
      Rails.root.join(keydir, datacollector_key_name)
    end
  end

  def datacollector_check_local_path
    return if datacollector_method.blank? || datacollector_dir.blank?
    return unless datacollector_method.end_with?('local')

    if datacollector_pathname.directory? && datacollector_localpath_config.nil?
      errors.add(:datacollector_dir, :whitelist)
    elsif !datacollector_pathname.directory?
      errors.add(:datacollector_dir, :invalid)
    end
  end

  def datacollector_check_sftp_keyfile_path
    return unless datacollector_sftp_values_present?
    return unless datacollector_method.end_with?('sftp') && datacollector_authentication == 'keyfile'
    return if datacollector_key_dir_path.file? && datacollector_key_dir_path.exist?

    errors.add(:datacollector_key_name, :not_found)
  end

  def initials
    name_abbreviation
  end

  def decrypted_novnc_password
    return if novnc_password.blank?

    decrypt_value(novnc_password)
  end

  def encrypt_novnc_password
    password = novnc_password.blank? ? '' : encrypt_value(novnc_password)
    self.novnc_password = password
  end

  def normalize_email
    self.email = nil if email.blank?
  end

  def info
    "Device ID: #{id}, Name: #{name}"
  end
end
