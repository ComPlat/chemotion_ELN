# frozen_string_literal: true

class Device < ApplicationRecord
  acts_as_paranoid
  # devise :database_authenticatable, :validatable

  has_many :users_devices, dependent: :destroy
  has_many :users, class_name: 'User', through: :users_devices

  has_many :users_groups, through: :users
  has_many :groups, through: :users_groups

  # has_many :users_admins, through: :users
  # has_many :admins, through: :users_admins

  has_one :device_metadata, dependent: :destroy

  validates :first_name, :last_name, presence: true
  validates :name_abbreviation, uniqueness: true
  validate :name_abbreviation_reserved_list, on: :create
  validate :name_abbreviation_length, on: :create
  validate :name_abbreviation_format, on: :create
  validate :mail_checker

  before_create :create_email_and_password

  scope :by_user_ids, ->(ids) { joins(:users_devices).merge(UsersDevice.by_user_ids(ids)) }
  scope :by_name, ->(query) { where('LOWER(name) ILIKE ?', "%#{sanitize_sql_like(query.downcase)}%") }

  # scope :by_exact_name_abbreviation, lambda { |query, case_insensitive = false|
  #   if case_insensitive
  #     where('LOWER(name_abbreviation) = ?', sanitize_sql_like(query.downcase).to_s)
  #   else
  #     where(name_abbreviation: query)
  #   end
  # }

  # try to find a user by exact match of name_abbreviation
  # fall back to insensitive match result unless multiple users are found.
  # def self.try_find_by_name_abbreviation(name_abbreviation)
  #   result = by_exact_name_abbreviation(name_abbreviation).first # try exact match, should be unique
  #   if result.nil?
  #     case_insensitive_result = by_exact_name_abbreviation(name_abbreviation, case_insensitive: true)
  #     result = case_insensitive_result.size == 1 ? case_insensitive_result.first : nil
  #   end
  #   result
  # end

  def create_email_and_password
    self.name = "#{first_name} #{last_name}"
    self.encrypted_password = Devise.friendly_token.first(8)
    # self.email = format('%<time>i@eln.edu', time: Time.now.getutc.to_i)
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

    errors.add(:name_abbreviation, :invalid, message: format_err_msg)
  end

  def name_abbreviation_length
    min_val = name_abbr_config[:length_device]&.first || 2
    max_val = name_abbr_config[:length_device]&.last || 5

    return unless name_abbreviation.blank? || !name_abbreviation.length.between?(min_val, max_val)

    errors.add(:name_abbreviation, :wrong_length, min: min_val, max: max_val)
  end

  def mail_checker
    MailChecker.valid?(email) || errors.add(
      :email, 'from throwable email providers not accepted'
    )
  end

  def initials
    name_abbreviation
  end

  def info
    "Device ID: #{id}, Name: #{name}"
  end
end
