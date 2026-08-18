# frozen_string_literal: true

require_relative '../../lib/chemotion/address_family_preference'

# Makes outbound connections prefer one IP address family.
#
# Needed on deployments whose host and containers have addresses in only one family —
# typically IPv6-only. Ruby omits AI_ADDRCONFIG when resolving, so glibc happily returns
# A records for dual-stack services on a host with no IPv4 address and no IPv4 route, and
# outbound calls to PubChem, DataCite, RADAR and friends fail.
#
# Disabled unless ELN_PREFER_ADDRESS_FAMILY is set to "ipv6" or "ipv4":
#
#   ELN_PREFER_ADDRESS_FAMILY=ipv6
#
# Do NOT enable this on a dual-stack host. It removes glibc's RFC 6724 destination
# sorting, so a service whose preferred-family address is published but unreachable will
# no longer fall back to the other family.
return unless Chemotion::AddressFamilyPreference.enabled?

# Routes TCPSocket (and therefore Net::HTTP) through Resolv instead of glibc. Without
# this shim, patching Resolv has no effect on outbound HTTP at all.
require 'resolv-replace'

Resolv.singleton_class.prepend(
  Module.new do
    # Resolves +host+, preferring the configured address family and falling back to
    # stock behaviour when the host publishes no address in it.
    def getaddress(host)
      preferred = Chemotion::AddressFamilyPreference.pick(getaddresses(host))
      preferred || super
    end
  end,
)

Rails.logger&.info(
  '[AddressFamilyPreference] preferring ' \
  "#{Chemotion::AddressFamilyPreference.preferred_family} for outbound connections",
)
