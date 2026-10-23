# frozen_string_literal: true

require 'ipaddr'

module InventoryIntegration
  # IT-level settings from config/inventory_integration.yml (see the .example file next to it).
  # No file turns the feature off; an invalid file marks it misconfigured, never half-enabled.
  class IntegrationConfig
    FILE = 'config/inventory_integration.yml'
    TOP_LEVEL_KEYS = %w[
      enabled time_zone encryption_key_env adapters network scheduler write_back inbound_api
      credentials presets_dir assistant
    ].freeze
    FREQUENCIES = %w[daily weekly biweekly monthly quarterly].freeze
    HOST_LABEL = '[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?'
    HOST_PATTERN = /\A(\*\.)?(#{HOST_LABEL}\.)*#{HOST_LABEL}\z/.freeze
    INTERVAL = /\A(\d+)([hd])\z/.freeze
    ENV_NAME = /\A[A-Z][A-Z0-9_]*\z/.freeze
    NETWORK_DEFAULTS = {
      'allow_private_cidrs' => [], 'allow_http_hosts' => [],
      'open_timeout' => 5, 'read_timeout' => 30, 'max_response_mb' => 25
    }.freeze
    SCHEDULER_DEFAULTS = { 'enabled' => false, 'max_pull_frequency' => 'weekly', 'slice_budget_minutes' => 15 }.freeze

    attr_reader :status, :errors

    class << self
      def current
        @current ||= load
      end

      def reset!
        @current = nil
      end

      # @return [IntegrationConfig] status :off, :ok or :misconfigured
      def load(path = Rails.root.join(FILE), env: Rails.env)
        return new(:off) unless File.exist?(path)

        new(:ok, read(path, env)).tap(&:validate!)
      rescue StandardError, SyntaxError => e
        new(:misconfigured, errors: ["#{FILE} cannot be read: #{e.message}"])
      end

      private

      def read(path, env)
        yaml = YAML.safe_load(ERB.new(File.read(path)).result, permitted_classes: [Symbol], aliases: true) || {}
        raise ArgumentError, 'the file must hold a mapping of settings' unless yaml.is_a?(Hash)

        yaml = yaml.deep_stringify_keys
        (yaml['shared'] || {}).deep_merge(yaml[env.to_s] || {})
      end
    end

    def initialize(status, settings = {}, errors: [])
      @status = status
      @settings = settings
      @errors = errors
    end

    def enabled?
      status == :ok && @settings['enabled'] == true
    end

    def misconfigured?
      status == :misconfigured
    end

    def adapter_settings(key)
      adapters.fetch(key.to_s, {})
    end

    def enabled_adapter_keys
      return [] unless enabled?

      adapters.select { |_key, settings| settings['enabled'] == true }.keys
    end

    def allowed_hosts(key)
      Array(adapter_settings(key)['allowed_hosts']).map(&:downcase)
    end

    def network
      NETWORK_DEFAULTS.merge(@settings.fetch('network', {}))
    end

    def scheduler
      SCHEDULER_DEFAULTS.merge(@settings.fetch('scheduler', {}))
    end

    def scheduler_enabled?
      enabled? && scheduler['enabled'] == true
    end

    def write_back_enabled?
      enabled? && @settings.dig('write_back', 'enabled') == true
    end

    def inbound_api_enabled?
      enabled? && @settings.dig('inbound_api', 'enabled') == true
    end

    def time_zone
      @settings.fetch('time_zone', 'Europe/Berlin')
    end

    def description
      return "misconfigured - #{errors.join('; ')}" if misconfigured?
      return 'not configured - feature off' if status == :off
      return 'disabled' unless enabled?

      "enabled adapters: #{enabled_adapter_keys.join(', ').presence || 'none'}"
    end

    def validate!
      @errors = []
      validate_top_level
      validate_adapters
      validate_network
      validate_scheduler
      validate_credentials
      @status = :misconfigured if @errors.any?
      self
    end

    private

    def adapters
      @settings.fetch('adapters', nil) || {}
    end

    def validate_top_level
      unknown = @settings.keys - TOP_LEVEL_KEYS
      @errors << "unknown settings: #{unknown.join(', ')}" if unknown.any?
      check_boolean('enabled', @settings['enabled'])
      @errors << "unknown time zone '#{time_zone}'" unless ActiveSupport::TimeZone[time_zone]
      check_env_name('encryption_key_env', @settings['encryption_key_env'])
      presets_dir = @settings['presets_dir']
      @errors << 'presets_dir must be an absolute path' if presets_dir && !Pathname.new(presets_dir.to_s).absolute?
    end

    def validate_adapters
      return @errors << 'adapters must be a mapping' unless adapters.is_a?(Hash)

      adapters.each do |key, settings|
        next @errors << "adapter '#{key}' is not installed" unless AdapterRegistry.key?(key)
        next @errors << "adapters.#{key} must be a mapping" unless settings.is_a?(Hash)

        check_boolean("adapters.#{key}.enabled", settings['enabled'])
        check_hosts("adapters.#{key}.allowed_hosts", settings['allowed_hosts'])
        interval = settings['min_pull_interval']
        if interval && !interval.to_s.match?(INTERVAL)
          @errors << "adapters.#{key}.min_pull_interval '#{interval}' is not like '12h' or '7d'"
        end
      end
    end

    def validate_network
      net = network
      Array(net['allow_private_cidrs']).each do |cidr|
        IPAddr.new(cidr.to_s)
      rescue IPAddr::Error
        @errors << "network.allow_private_cidrs: '#{cidr}' is not a CIDR range"
      end
      check_hosts('network.allow_http_hosts', net['allow_http_hosts'])
      %w[open_timeout read_timeout max_response_mb].each { |key| check_positive("network.#{key}", net[key]) }
    end

    def validate_scheduler
      check_boolean('scheduler.enabled', scheduler['enabled'])
      unless FREQUENCIES.include?(scheduler['max_pull_frequency'].to_s)
        @errors << "scheduler.max_pull_frequency must be one of #{FREQUENCIES.join(', ')}"
      end
      check_positive('scheduler.slice_budget_minutes', scheduler['slice_budget_minutes'])
    end

    def validate_credentials
      credentials = @settings.fetch('credentials', nil) || {}
      return @errors << 'credentials must be a mapping' unless credentials.is_a?(Hash)

      credentials.each do |name, references|
        next @errors << "credentials.#{name} must be a mapping" unless references.is_a?(Hash)

        references.each { |field, env_name| check_env_name("credentials.#{name}.#{field}", env_name) }
      end
    end

    def check_boolean(name, value)
      @errors << "#{name} must be true or false" unless value.nil? || [true, false].include?(value)
    end

    def check_positive(name, value)
      @errors << "#{name} must be a positive number" unless value.is_a?(Numeric) && value.positive?
    end

    def check_env_name(name, value)
      @errors << "#{name} must name an environment variable" unless value.nil? || value.to_s.match?(ENV_NAME)
    end

    def check_hosts(name, hosts)
      return if hosts.nil?
      return @errors << "#{name} must be a list" unless hosts.is_a?(Array)

      hosts.each do |host|
        @errors << "#{name}: '#{host}' is not a host name or '*.domain'" unless host.to_s.downcase.match?(HOST_PATTERN)
      end
    end
  end
end
