# frozen_string_literal: true

module InventoryIntegration
  module Adapters
    # One class per kind of external inventory system. An adapter translates and talks to the
    # source; it never touches samples, collections, permissions, scheduling or links.
    class Base
      CAPABILITIES = %i[
        list fetch lookup webhooks
        create update set_quantity adjust_quantity move dispose link_external_id verify_delivery
      ].freeze
      CHANGE_DETECTION = %i[cursor modified_since snapshot push_only].freeze
      MAPPING_MODES = %i[required overridable none].freeze
      # Method an adapter must define for each declared capability.
      CAPABILITY_METHODS = CAPABILITIES.index_with(&:itself).merge(list: :each_page, webhooks: :verify_webhook).freeze

      Page = Struct.new(:records, :checkpoint, :complete, keyword_init: true)
      Check = Struct.new(:name, :ok, :detail, keyword_init: true)
      TestResult = Struct.new(:ok, :checks, :sample_count, :latency_ms, keyword_init: true)
      WriteResult = Struct.new(:external_id, :version, :external_ref, keyword_init: true)

      class << self
        # @return [Hash] key, name, version, contracts, capabilities, change_detection, mapping,
        #   settings_schema and optional quantity_semantics, default_preset, min_pull_interval
        def manifest
          raise NotImplementedError, "#{name}.manifest"
        end

        def capability?(capability)
          manifest.fetch(:capabilities).include?(capability)
        end

        # How requests carry the credentials, e.g. Transport::Auth::Basic.new(secrets.fetch(:user), ...).
        def http_auth(secrets:, settings:) # rubocop:disable Lint/UnusedMethodArgument
          InventoryIntegration::Transport::Auth::None.new
        end
      end

      attr_reader :connection, :secrets, :http

      delegate :settings, to: :connection

      # @param connection frozen value object with id, base_url, settings and the active mapping
      # @param secrets decrypting credential bag that registers every value with the redactor
      # @param http transport bound to the host policy, timeouts and rate limit of the connection
      def initialize(connection:, secrets:, http:)
        @connection = connection
        @secrets = secrets
        @http = http
      end

      # Identifies the external system instance, so two connections never import the same stock.
      def source_key
        raise NotImplementedError
      end

      def scope_key
        raise NotImplementedError
      end

      # One cheap call proving reachability, credentials and scope.
      # @return [TestResult]
      def test_connection
        raise NotImplementedError
      end

      # Pull: yields Page objects of raw source records, resumable from a page checkpoint.
      def each_page(checkpoint: nil, since: nil)
        raise NotImplementedError
      end

      # Raw source record -> canonical record (contract v1, without provenance).
      def to_canonical(raw)
        raise NotImplementedError
      end
    end
  end
end
