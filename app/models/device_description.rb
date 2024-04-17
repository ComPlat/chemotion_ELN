# frozen_string_literal: true

# == Schema Information
#
# Table name: device_descriptions
#
#  id                              :bigint           not null, primary key
#  device_id                       :integer
#  name                            :string
#  short_label                     :string
#  vendor_id                       :string
#  vendor_url                      :string
#  serial_number                   :string
#  version_doi                     :string
#  version_doi_url                 :string
#  device_type                     :string
#  device_type_detail              :string
#  operation_mode                  :string
#  version_installation_start_date :datetime
#  version_installation_end_date   :datetime
#  description                     :text
#  operators                       :jsonb
#  university_campus               :string
#  institute                       :string
#  building                        :string
#  room                            :string
#  infrastructure_assignment       :string
#  access_options                  :string
#  comments                        :string
#  size                            :string
#  weight                          :string
#  application_name                :string
#  application_version             :string
#  description_for_methods_part    :text
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#  vendor_device_name              :string
#  vendor_device_id                :string
#  vendor_company_name             :string
#  tags                            :string
#  policies_and_user_information   :text
#  version_number                  :string
#  version_characterization        :text
#  deleted_at                      :datetime
#  created_by                      :integer
#  ontologies                      :jsonb
#
# Indexes
#
#  index_device_descriptions_on_device_id  (device_id)
#
class DeviceDescription < ApplicationRecord
  attr_accessor :collection_id

  include ElementUIStateScopes
  # include PgSearch::Model
  include Collectable
  include ElementCodes
  include AnalysisCodes
  include Taggable
  include Labimotion::Segmentable

  acts_as_paranoid

  belongs_to :device, optional: true
  has_many :collections_device_descriptions, inverse_of: :device_description, dependent: :destroy
  has_many :collections, through: :collections_device_descriptions

  belongs_to :creator, foreign_key: :created_by, class_name: 'User', inverse_of: :device_descriptions

  has_many :attachments, as: :attachable, dependent: :nullify
  has_many :sync_collections_users, through: :collections

  has_many :comments, as: :commentable, dependent: :destroy
  has_one :container, as: :containable, dependent: :nullify

  scope :includes_for_list_display, -> { includes(:tag) }

  after_create :set_short_label

  def analyses
    container ? container.analyses : []
  end

  def set_short_label
    prefix = 'Dev'
    counter = creator.increment_counter 'device_descriptions' # rubocop:disable Rails/SkipsModelValidations
    user_label = creator.name_abbreviation

    update(short_label: "#{user_label}-#{prefix}#{counter}")
  end
end
