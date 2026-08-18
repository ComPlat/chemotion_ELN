# frozen_string_literal: true

require 'resolv'
require 'ipaddr'

module Chemotion
  # Forces outbound connections to prefer one IP address family.
  #
  # Ruby calls +getaddrinfo+ without +AI_ADDRCONFIG+, so glibc does not filter out
  # addresses of a family the host cannot use. On a host with no IPv4 address and no IPv4
  # route, every dual-stack service therefore still yields its A records to the connect
  # path, and outbound requests (PubChem, DataCite, RADAR, ...) can fail even though the
  # same hosts are reachable over IPv6.
  #
  # Enabling this moves name resolution off glibc and onto Ruby's +Resolv+, then picks the
  # first address of the preferred family. It is opt-in: see
  # +config/initializers/address_family_preference.rb+.
  #
  # +/etc/hosts+ is still honoured (+Resolv::Hosts+), but glibc's RFC 6724 destination
  # sorting and +AI_ADDRCONFIG+ filtering no longer apply — which is the point on a
  # single-family host, and the reason this must not be enabled on a dual-stack one.
  module AddressFamilyPreference
    FAMILIES = %w[ipv4 ipv6].freeze

    class << self
      # Preferred family, or +nil+ when the feature is disabled.
      #
      # @return [String, nil] +"ipv4"+, +"ipv6"+, or +nil+
      def preferred_family
        return @preferred_family if defined?(@preferred_family)

        value = ENV.fetch('ELN_PREFER_ADDRESS_FAMILY', '').to_s.strip.downcase
        @preferred_family = FAMILIES.include?(value) ? value : nil
      end

      # @return [Boolean] whether an address-family preference is configured
      def enabled?
        !preferred_family.nil?
      end

      # Resets the memoized ENV lookup. Test seam.
      #
      # @return [void]
      def reset!
        remove_instance_variable(:@preferred_family) if defined?(@preferred_family)
      end

      # First address of the preferred family, or +nil+ when +host+ offers none.
      #
      # @param addresses [Array<#to_s>] resolved addresses
      # @return [String, nil]
      def pick(addresses)
        addresses.map(&:to_s).find { |address| matches_preference?(address) }
      end

      private

      def matches_preference?(address)
        ip = IPAddr.new(address)
        preferred_family == 'ipv6' ? ip.ipv6? : ip.ipv4?
      rescue IPAddr::Error
        false
      end
    end
  end
end
