# frozen_string_literal: true

module InventoryIntegration
  # The link between an inventory collection and one external system. Secrets are stored sealed
  # (SecretBox) or referenced by an IT credential name, never in settings.
  class Connection < ApplicationRecord
    STATUSES = %w[draft active paused error archived].freeze
    PROFILES = %w[standard legal_register].freeze
    AUTHORITIES = %w[external chemotion].freeze

    has_logidze

    belongs_to :managed_collection, class_name: 'InventoryIntegration::ManagedCollection'
    belongs_to :active_mapping_version, class_name: 'InventoryIntegration::MappingVersion', optional: true
    belongs_to :created_by, class_name: '::User'
    belongs_to :updated_by, class_name: '::User', optional: true
    has_many :mapping_versions, class_name: 'InventoryIntegration::MappingVersion', dependent: :restrict_with_error

    scope :current, -> { where(archived_at: nil) }

    validates :name, :adapter_key, :source_key, :scope_key, presence: true
    validates :status, inclusion: { in: STATUSES }
    validates :profile, inclusion: { in: PROFILES }
    validate :field_authority_known
    validate :one_current_per_source, if: -> { archived_at.nil? }

    def credentials_set?
      credentials_ciphertext.present? || credentials_ref.present?
    end

    # Changes whenever anything a connection test depends on changes.
    # jsonb reorders keys, so settings are digested in a canonical order.
    def test_digest
      Digest::SHA256.hexdigest(
        [adapter_key, base_url, canonical(settings), credentials_fingerprint, credentials_ref].to_json,
      )
    end

    def tested?
      last_test_ok == true && last_test_digest == test_digest
    end

    # Field groups the external system owns: nobody edits them in Chemotion.
    def external_groups
      field_authority.select { |_group, authority| authority == 'external' }.keys
    end

    def sharee_allowed?(user_id)
      allowed_sharee_ids.blank? || allowed_sharee_ids.include?(user_id)
    end

    private

    def canonical(value)
      case value
      when Hash then value.stringify_keys.sort.map { |key, nested| [key, canonical(nested)] }
      when Array then value.map { |nested| canonical(nested) }
      else value
      end
    end

    def field_authority_known
      unknown_groups = field_authority.keys - FieldAccess::GROUPS.keys
      errors.add(:field_authority, "has unknown groups: #{unknown_groups.join(', ')}") if unknown_groups.any?
      return if (field_authority.values - AUTHORITIES).empty?

      errors.add(:field_authority, "values must be #{AUTHORITIES.join(' or ')}")
    end

    # The partial unique index enforces it too; this gives the admin a readable message.
    def one_current_per_source
      taken = self.class.current.where(source_key: source_key, scope_key: scope_key).where.not(id: id).exists?
      errors.add(:base, 'another connection already imports this source and scope') if taken
    end
  end
end
