# frozen_string_literal: true

module InventoryIntegration
  # Drafting and accepting mapping versions of a connection. Accepting is one transaction: the
  # previous active version is superseded, and the next run must be a dry run.
  class MappingVersions
    def initialize(connection, actor:)
      @connection = connection
      @actor = actor
    end

    # @param origin [String] manual or import; presets come from {#draft_preset!}
    def draft!(mapping:, request_settings: nil, origin: 'manual', based_on: nil, preset_key: nil)
      version = @connection.mapping_versions.new(
        status: 'draft', origin: origin, mapping: mapping, request_settings: request_settings,
        based_on_version: based_on, preset_key: preset_key, created_by: @actor
      )
      version.validation_report = report(version)
      version.save!
      version
    end

    # The adapter's built-in mapping as a draft, so a site override is just a newer version.
    def draft_preset!(adapter_class)
      manifest = adapter_class.manifest
      preset = manifest[:default_preset]
      raise Errors::ConfigurationError, "adapter '#{manifest[:key]}' has no built-in mapping" if preset.blank?

      draft!(mapping: preset, origin: 'preset', preset_key: "#{manifest[:key]}@#{manifest[:version]}")
    end

    def accept!(version)
      raise Errors::ConfigurationError, 'only a draft can be accepted' unless version.draft?

      errors = version.validation_errors
      if errors.any?
        raise Errors::ConfigurationError, errors.map { |error|
          "#{error.path} #{error.message}"
        }.join('; ')
      end

      ApplicationRecord.transaction do
        @connection.mapping_versions.active.where.not(id: version.id).find_each do |old|
          old.update!(status: 'superseded')
        end
        version.update!(status: 'active', accepted_by: @actor, accepted_at: Time.current)
        @connection.update!(active_mapping_version: version, dry_run_required: true, updated_by: @actor)
      end
      version
    end

    def discard!(version)
      raise Errors::ConfigurationError, 'only a draft can be discarded' unless version.draft?

      version.update!(status: 'discarded')
    end

    private

    def report(version)
      errors = version.validation_errors
      { 'valid' => errors.empty?, 'errors' => errors.map { |error| error.to_h.stringify_keys } }
    end
  end
end
