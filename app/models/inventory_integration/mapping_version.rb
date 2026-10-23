# frozen_string_literal: true

module InventoryIntegration
  # One version of a connection's mapping. Only drafts change; accepting one makes it the active
  # version and supersedes the previous one.
  class MappingVersion < ApplicationRecord
    STATUSES = %w[draft active superseded discarded].freeze
    ORIGINS = %w[manual preset assistant import].freeze

    has_logidze

    belongs_to :connection, class_name: 'InventoryIntegration::Connection'
    belongs_to :based_on_version, class_name: 'InventoryIntegration::MappingVersion', optional: true
    belongs_to :created_by, class_name: '::User'
    belongs_to :accepted_by, class_name: '::User', optional: true

    validates :status, inclusion: { in: STATUSES }
    validates :origin, inclusion: { in: ORIGINS }
    validates :llm_task, presence: true, if: -> { origin == 'assistant' }
    validate :content_frozen, on: :update

    before_validation :assign_version, on: :create

    scope :active, -> { where(status: 'active') }

    def draft?
      status == 'draft'
    end

    # @return [Array<Mapping::Validator::Error>]
    def validation_errors
      Mapping::Validator.new(mapping: mapping, request_settings: request_settings).errors
    end

    private

    def assign_version
      self.version ||= (connection&.mapping_versions&.maximum(:version) || 0) + 1
    end

    def content_frozen
      return if status_was == 'draft'
      return unless will_save_change_to_mapping? || will_save_change_to_request_settings?

      errors.add(:mapping, 'cannot change once the version is no longer a draft')
    end
  end
end
