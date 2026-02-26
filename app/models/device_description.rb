# frozen_string_literal: true

# == Schema Information
#
# Table name: device_descriptions
#
#  id                                   :bigint           not null, primary key
#  access_comments                      :string
#  access_options                       :string
#  alternative_identifier               :string
#  ancestry                             :string           default("/"), not null
#  application_name                     :string
#  application_version                  :string
#  building                             :string
#  consumables_needed_for_maintenance   :jsonb
#  contact_for_maintenance              :jsonb
#  created_by                           :integer
#  deleted_at                           :datetime
#  description                          :text
#  description_for_methods_part         :text
#  device_class                         :string
#  device_class_detail                  :string
#  device_type_id_type                  :string
#  device_type_name                     :string
#  general_tags                         :string           default([]), not null, is an Array
#  helpers_uploaded                     :boolean          default(FALSE)
#  infrastructure_assignment            :string
#  institute                            :string
#  maintenance_contract_available       :string
#  maintenance_scheduling               :string
#  measures_after_full_shut_down        :text
#  measures_after_short_shut_down       :text
#  measures_to_plan_offline_period      :text
#  name                                 :string
#  ontologies                           :jsonb
#  operation_mode                       :string
#  operators                            :jsonb
#  owner_email                          :string
#  owner_id_type                        :string
#  owner_institution                    :string
#  planned_maintenance                  :jsonb
#  policies_and_user_information        :text
#  restart_after_planned_offline_period :text
#  room                                 :string
#  serial_number                        :string
#  setup_descriptions                   :jsonb
#  short_label                          :string
#  size                                 :string
#  unexpected_maintenance               :jsonb
#  university_campus                    :string
#  vendor_company_name                  :string
#  vendor_device_name                   :string
#  vendor_id_type                       :string
#  vendor_url                           :string
#  version_characterization             :text
#  version_doi                          :string
#  version_doi_url                      :string
#  version_identifier_type              :string
#  version_installation_end_date        :datetime
#  version_installation_start_date      :datetime
#  version_number                       :string
#  weight                               :string
#  weight_unit                          :string
#  created_at                           :datetime         not null
#  updated_at                           :datetime         not null
#  device_id                            :integer
#  device_type_id                       :string
#  inventory_id                         :string
#  owner_id                             :string
#  vendor_device_id                     :string
#  vendor_id                            :string
#
# Indexes
#
#  index_device_descriptions_on_ancestry   (ancestry) WHERE (deleted_at IS NULL)
#  index_device_descriptions_on_device_id  (device_id)
#
class DeviceDescription < ApplicationRecord
  attr_accessor :collection_id, :is_split

  include ElementUIStateScopes
  include PgSearch::Model
  include Collectable
  include ElementCodes
  include AnalysisCodes
  include Taggable
  include Labimotion::Segmentable

  has_logidze
  acts_as_paranoid

  belongs_to :device, optional: true
  has_many :collections_device_descriptions, inverse_of: :device_description, dependent: :destroy
  has_many :collections, through: :collections_device_descriptions

  belongs_to :creator, foreign_key: :created_by, class_name: 'User', inverse_of: :device_descriptions

  has_many :attachments, as: :attachable, inverse_of: :attachable, dependent: :nullify
  has_many :sync_collections_users, through: :collections

  has_many :comments, as: :commentable, inverse_of: :commentable, dependent: :destroy
  has_one :container, as: :containable, inverse_of: :containable, dependent: :nullify
  has_ancestry orphan_strategy: :adopt

  accepts_nested_attributes_for :collections_device_descriptions

  multisearchable against: %i[
    name short_label vendor_device_name vendor_device_id serial_number vendor_company_name
    searchable_general_tags searchable_ontology_labels
  ]
  pg_search_scope :search_by_device_description_name, against: :name
  pg_search_scope :search_by_device_description_short_label, against: :short_label
  pg_search_scope :search_by_device_description_vendor_device_name, against: :vendor_device_name
  pg_search_scope :search_by_device_description_vendor_device_id, against: :vendor_device_id
  pg_search_scope :search_by_device_description_serial_number, against: :serial_number
  pg_search_scope :search_by_device_description_vendor_company_name, against: :vendor_company_name

  pg_search_scope :search_by_device_description_general_tags, against: :general_tags
  pg_search_scope :search_by_device_description_ontologies, against: :ontologies

  pg_search_scope :search_by_substring, against: %i[
    name short_label vendor_device_name vendor_device_id serial_number vendor_company_name general_tags ontologies
  ], using: { trigram: { threshold: 0.0001 } }

  scope :includes_for_list_display, -> { includes(:tag) }

  after_create :set_short_label

  def self.search_text_filter(term, field)
    Arel.sql(
      "COALESCE(array_agg(DISTINCT #{field}) FILTER (WHERE #{field} ILIKE '#{term}'), '{}')",
    )
  end

  def self.search_array_filter(term, table, field)
    Arel.sql(
      'COALESCE(' \
      "(SELECT array_agg(DISTINCT val) FROM #{table} s, unnest(s.#{field}) val WHERE val ILIKE '#{term}'), '{}'" \
      ')',
    )
  end

  def self.search_jsonb_label_filter(term, table, field)
    Arel.sql(
      'COALESCE(' \
      "(SELECT array_agg(DISTINCT elem->'data'->>'label') FROM #{table} s " \
      "CROSS JOIN jsonb_array_elements(s.#{field}) elem WHERE elem->'data'->>'label' ILIKE '#{term}'), '{}'" \
      ')',
    )
  end

  def self.by_search_fields(query)
    term = "%#{sanitize_sql_like(query)}%"

    json_expr = Arel.sql(
      'jsonb_build_object(' \
      "'device_description_name', #{search_text_filter(term, 'device_descriptions.name')}, " \
      "'device_description_short_label', #{search_text_filter(term, 'device_descriptions.short_label')}, " \
      "'device_description_vendor_device_name', #{search_text_filter(term,
                                                                     'device_descriptions.vendor_device_name')}, " \
      "'device_description_vendor_device_id', #{search_text_filter(term, 'device_descriptions.vendor_device_id')}, " \
      "'device_description_serial_number', #{search_text_filter(term, 'device_descriptions.serial_number')}, " \
      "'device_description_vendor_company_name', #{search_text_filter(term,
                                                                      'device_descriptions.vendor_company_name')}, " \
      "'device_description_general_tags', #{search_array_filter(term, 'device_descriptions', 'general_tags')}, " \
      "'device_description_ontologies', #{search_jsonb_label_filter(term, 'device_descriptions', 'ontologies')} " \
      ')',
    )

    select(json_expr.as('result')).take.result
  end

  def searchable_general_tags
    general_tags&.join(' ')
  end

  def searchable_ontology_labels
    return '' if ontologies.blank?

    ontologies.filter_map { |entry| entry.dig('data', 'label') }.join(' ')
  end

  def analyses
    container ? container.analyses : []
  end

  def set_short_label
    return if is_split == true

    prefix = 'Dev'
    counter = creator.increment_counter 'device_descriptions' # rubocop:disable Rails/SkipsModelValidations
    user_label = creator.name_abbreviation

    update(short_label: "#{user_label}-#{prefix}#{counter}")
  end

  def counter_for_split_short_label
    element_children = children.with_deleted.order('created_at')
    last_child_label = element_children.where('short_label LIKE ?', "#{short_label}-%").last&.short_label
    last_child_counter = (last_child_label&.match(/^#{short_label}-(\d+)/) && ::Regexp.last_match(1).to_i) || 0

    [last_child_counter, element_children.count].max
  end

  def all_collections(user, collection_ids)
    Collection.where(id: collection_ids) | Collection.where(user_id: user, label: 'All', is_locked: true)
  end

  def create_sub_device_description(user, collection_ids)
    device_description = dup
    segments = device_description.segments

    device_description.is_split = true
    device_description.short_label = "#{short_label}-#{counter_for_split_short_label + 1}"
    device_description.parent = self
    device_description.created_by = user.id
    device_description.container = Container.create_root_container
    device_description.attachments = []
    device_description.segments = []
    device_description.collections << all_collections(user, collection_ids)
    device_description.save!

    device_description.save_segments(segments: segments, current_user_id: user.id) if segments

    device_description.reload
  end
end
