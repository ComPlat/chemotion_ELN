# frozen_string_literal: true

module InventoryIntegration
  # Admin changes to a connection. Settings are checked against the adapter's schema, the base URL
  # against the host policy, and secrets are sealed. Activation needs a passing test of exactly
  # the current settings.
  class ConnectionSetup
    SECRET = 'x-secret'
    ATTRIBUTES = %w[name profile allowed_sharee_ids field_authority].freeze

    attr_reader :connection

    def initialize(connection, actor:, config: IntegrationConfig.current)
      @connection = connection
      @actor = actor
      @config = config
    end

    # @param params [Hash] name, base_url, settings, credentials, credentials_ref, profile,
    #   allowed_sharee_ids, field_authority, and adapter_key for a new connection
    # @raise [Errors::ConfigurationError, Errors::HostNotAllowed, ActiveRecord::RecordInvalid]
    def update!(params)
      params = params.to_h.deep_stringify_keys
      connection.adapter_key = params['adapter_key'] if connection.new_record?
      adapter_class
      digest_before = connection.test_digest
      assign(params)
      # A changed test input needs a new test before the connection runs again.
      connection.status = 'draft' if connection.status == 'active' && connection.test_digest != digest_before
      connection.created_by ||= @actor
      connection.updated_by = @actor
      connection.tap(&:save!)
    end

    # Runs the adapter's connection test and records its result for activation.
    def test!
      result = build_adapter.test_connection
      record_test(result.ok, 'checks' => result.checks.map(&:to_h), 'sample_count' => result.sample_count,
                             'latency_ms' => result.latency_ms)
    rescue Errors::CredentialsUnreadable => e
      record_test(false, error_report(e), status: connection.status == 'active' ? 'paused' : connection.status)
    rescue Errors::Error => e
      record_test(false, error_report(e))
    rescue StandardError => e
      record_test(false, unexpected_error_report(e))
    end

    def activate!
      raise Errors::ConfigurationError, 'test the connection with its current settings first' unless connection.tested?
      if adapter_class.manifest[:mapping] != :none && connection.active_mapping_version.nil?
        raise Errors::ConfigurationError, 'accept a mapping version first'
      end

      connection.tap { |active| active.update!(status: 'active', updated_by: @actor) }
    end

    def pause!
      connection.tap { |paused| paused.update!(status: 'paused', updated_by: @actor) }
    end

    def archive!
      connection.tap { |archived| archived.update!(status: 'archived', archived_at: Time.current, updated_by: @actor) }
    end

    def build_adapter
      secrets = SecretBag.new(connection, config: @config)
      http = if connection.base_url
               Transport::HttpClient.new(
                 base_url: connection.base_url, policy: policy, network: @config.network,
                 auth: adapter_class.http_auth(secrets: secrets, settings: connection.settings)
               )
             end
      adapter_class.new(connection: connection, secrets: secrets, http: http)
    end

    private

    def assign(params)
      connection.assign_attributes(params.slice(*ATTRIBUTES))
      connection.base_url = base_url(params['base_url']) if params.key?('base_url')
      assign_settings(params['settings']) if params.key?('settings')
      assign_credentials(params)
      assign_keys
    end

    def adapter_class
      key = connection.adapter_key.to_s
      unless @config.enabled_adapter_keys.include?(key)
        raise Errors::ConfigurationError,
              "adapter '#{key}' is not enabled"
      end

      AdapterRegistry.find(key)
    end

    def policy
      HostPolicy.for(connection.adapter_key, @config)
    end

    def base_url(url)
      url.present? ? policy.normalize!(url).to_s : nil
    end

    def schema_properties
      adapter_class.manifest.dig(:settings_schema, 'properties') || {}
    end

    def secret_fields
      schema_properties.select { |_name, property| property[SECRET] }.keys
    end

    def assign_settings(settings)
      settings = settings.to_h
      secret_keys = settings.keys & secret_fields
      raise Errors::ConfigurationError, "secrets belong in credentials: #{secret_keys.join(', ')}" if secret_keys.any?

      failures = settings_validator.validate(settings)
      if failures.any?
        raise Errors::ConfigurationError, failures.map { |failure|
          "settings#{failure.path} #{failure.message}"
        }.join('; ')
      end

      connection.settings = settings
    end

    # The adapter's settings schema without its secret fields, which live in the credentials.
    def settings_validator
      schema = adapter_class.manifest[:settings_schema].deep_dup
      schema['properties'] = schema_properties.except(*secret_fields)
      schema['required'] = Array(schema['required']) - secret_fields if schema.key?('required')
      SchemaValidator.new(schema)
    end

    def assign_credentials(params)
      if params['credentials_ref'].present?
        use_reference(params['credentials_ref'])
      elsif params['credentials'].present?
        seal(params['credentials'].to_h.compact_blank)
      end
    end

    def use_reference(name)
      unless @config.credential_refs.key?(name)
        raise Errors::ConfigurationError,
              "IT credential '#{name}' is not configured"
      end

      connection.assign_attributes(credentials_ref: name, credentials_ciphertext: nil, credentials_fingerprint: nil,
                                   credentials_key_version: nil)
    end

    # Blank fields keep their stored value, so a form need not show secrets to keep them.
    def seal(given)
      unknown = given.keys - secret_fields
      raise Errors::ConfigurationError, "unknown credential fields: #{unknown.join(', ')}" if unknown.any?
      return if given.empty?

      box = SecretBox.new(SecretBox.key(@config))
      values = stored_credentials(box).merge(given)
      connection.assign_attributes(
        credentials_ciphertext: box.seal(values), credentials_fingerprint: box.fingerprint(values),
        credentials_key_version: SecretBox::KEY_VERSION, credentials_ref: nil
      )
    end

    def stored_credentials(box)
      connection.credentials_ciphertext.present? ? box.open(connection.credentials_ciphertext) : {}
    rescue Errors::CredentialsUnreadable
      {}
    end

    def assign_keys
      adapter = adapter_class.new(connection: connection, secrets: nil, http: nil)
      connection.source_key = adapter.source_key
      connection.scope_key = adapter.scope_key
    end

    def record_test(passed, report, status: connection.status)
      connection.update!(last_test_at: Time.current, last_test_ok: passed, last_test_digest: connection.test_digest,
                         last_test_report: Redactor.redact(report), status: status, updated_by: @actor)
      connection
    end

    def unexpected_error_report(error)
      line = "inventory connection #{connection.id} test: #{error.class}: #{error.message}"
      Rails.logger.error(Redactor.redact(line))
      { 'error' => { 'code' => 'adapter.failed', 'message' => "#{error.class.name}: #{error.message}" } }
    end

    def error_report(error)
      { 'error' => { 'code' => error.code, 'message' => Redactor.redact(error.message) } }
    end
  end
end
