# frozen_string_literal: true

require 'ipaddr'
require 'resolv'

module InventoryIntegration
  # Which external URLs an adapter may reach: hosts on IT's allow-list, https unless IT allows
  # http, and never loopback, link-local or metadata addresses. Private ranges only when IT lists
  # them. The checked address is the one connected to, so a second DNS answer cannot redirect.
  class HostPolicy
    # Loopback, link-local and metadata, shared and reserved ranges, and NAT64 (which can reach them).
    ALWAYS_BLOCKED = %w[
      0.0.0.0/8 127.0.0.0/8 169.254.0.0/16 100.64.0.0/10 192.0.0.0/24 192.0.2.0/24 198.18.0.0/15
      198.51.100.0/24 203.0.113.0/24 224.0.0.0/4 240.0.0.0/4
      ::/128 ::1/128 fe80::/10 ff00::/8 64:ff9b::/96 64:ff9b:1::/48 2001:db8::/32
    ].map { |range| IPAddr.new(range) }.freeze
    PRIVATE = %w[10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 fc00::/7].map { |range| IPAddr.new(range) }.freeze

    def self.for(adapter_key, config = IntegrationConfig.current)
      new(allowed_hosts: config.allowed_hosts(adapter_key), network: config.network)
    end

    # @param resolver [#call] host name => list of address strings
    def initialize(allowed_hosts:, network:, resolver: ->(host) { Resolv.getaddresses(host) })
      @allowed_hosts = allowed_hosts.map(&:downcase)
      @http_hosts = Array(network['allow_http_hosts']).map(&:downcase)
      @private_ranges = Array(network['allow_private_cidrs']).map { |range| IPAddr.new(range) }
      @resolver = resolver
    end

    # @return [URI::HTTP] the URL without trailing slash, query or fragment
    # @raise [Errors::HostNotAllowed]
    def normalize!(url)
      uri = parse(url)
      host = uri.host.downcase
      refuse!("#{host} is not on the allowed hosts of this adapter") unless host_allowed?(host)
      refuse!("#{host} must be reached over https") unless uri.scheme == 'https' || @http_hosts.include?(host)

      uri.host = host
      uri.path = uri.path.chomp('/')
      uri
    end

    # @return [IPAddr] the address to connect to
    # @raise [Errors::HostNotAllowed] when any address of the host is refused
    def resolve!(host)
      addresses = @resolver.call(host).map { |address| IPAddr.new(address.to_s.split('%').first) }
      refuse!("#{host} does not resolve") if addresses.empty?

      addresses.each { |address| check_address!(host, address) }
      addresses.first
    rescue IPAddr::Error
      refuse!("#{host} resolves to an invalid address")
    end

    private

    def parse(url)
      uri = URI.parse(url.to_s.strip)
      refuse!('the base URL must be an http or https URL with a host') unless uri.is_a?(URI::HTTP) && uri.host.present?
      refuse!('the base URL must not contain user information') if uri.userinfo
      refuse!('the base URL must not contain a query or fragment') if uri.query || uri.fragment
      uri
    rescue URI::InvalidURIError
      refuse!('the base URL is not a valid URL')
    end

    def host_allowed?(host)
      @allowed_hosts.any? do |pattern|
        pattern.start_with?('*.') ? host.end_with?(pattern.delete_prefix('*')) : host == pattern
      end
    end

    def check_address!(host, address)
      address = address.native
      refuse!("#{host} resolves to a blocked address") if ALWAYS_BLOCKED.any? { |range| range.include?(address) }
      return unless PRIVATE.any? { |range| range.include?(address) }
      return if @private_ranges.any? { |range| range.include?(address) }

      refuse!("#{host} resolves to a private address outside network.allow_private_cidrs")
    end

    def refuse!(message)
      raise Errors::HostNotAllowed, message
    end
  end
end
