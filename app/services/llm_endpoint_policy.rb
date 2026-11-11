# frozen_string_literal: true

require 'ipaddr'
require 'socket'

# Whether a user-supplied LLM endpoint may be reached on the server's behalf.
#
# base_url arrives from a form and the ELN connects to it, so without this a user
# could aim it at loopback, the cloud metadata service, or anything else inside
# the deployment's network. Institution providers are exempt: an admin who
# configures one is trusted with that network.
class LlmEndpointPolicy
  ALLOWED_SCHEMES = %w[http https].freeze

  # Ranges no personal provider may address: loopback, link-local (the metadata
  # service among them), the RFC1918/ULA private space, and the unspecified,
  # CGNAT, benchmark, multicast and reserved blocks that reach the same hosts.
  RESERVED_RANGES = [
    '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
    '172.16.0.0/12', '192.0.0.0/24', '192.168.0.0/16', '198.18.0.0/15', '224.0.0.0/4',
    '240.0.0.0/4', '::/96', 'fc00::/7', 'fe80::/10'
  ].map { |cidr| IPAddr.new(cidr) }.freeze

  # Names that address the host or the local network without an IP literal.
  LOCAL_SUFFIXES = %w[.localhost .local .internal .home.arpa].freeze

  # Deployments that mean their users to reach a model server on the same host
  # (Ollama, LM Studio) opt back in.
  ENV_ALLOW_PRIVATE = 'LLM_ALLOW_PRIVATE_ENDPOINTS'

  class << self
    # @return [String, nil] why the endpoint is refused, phrased to follow
    #   "the endpoint", or nil when it may be used.
    def violation(base_url)
      # Blank means "use the protocol's own default", which is a public API.
      return nil if base_url.blank?

      uri = safe_parse(base_url)
      return 'must be a full http:// or https:// URL' unless usable?(uri)
      return nil if private_allowed?
      return nil unless private_host?(uri.hostname)

      "must not point at #{uri.hostname}: private and loopback addresses are " \
        'reachable only through an institution provider'
    end

    def private_allowed?
      ActiveModel::Type::Boolean.new.cast(ENV.fetch(ENV_ALLOW_PRIVATE, nil)).present?
    end

    # The address a restricted request may connect to, checked at connect time
    # so a name that resolves into the private space is refused even though the
    # name itself looked fine. Returning the address lets the caller pin the
    # connection to it, closing the window between this lookup and the client's.
    #
    # @return [String, nil] address to connect to, or nil to leave it to the client
    # @raise [Errors::LlmNotConfiguredError] when the name resolves somewhere private
    def pinned_address!(host)
      return nil if host.blank? || private_allowed?

      literal = ip_literal(host)
      return check_literal!(host, literal) if literal

      check_resolved!(host)
    end

    private

    # A literal is its own answer; nothing to pin.
    def check_literal!(host, literal)
      raise_private(host) if reserved?(literal)
      nil
    end

    # Every address the name resolves to must be public. The connection is then
    # pinned to the one checked here, so the client never looks the name up again.
    # A failed lookup raises the client's own SocketError.
    def check_resolved!(host)
      addresses = resolve(host)
      raise SocketError, "getaddrinfo: #{host} did not resolve" if addresses.empty?

      raise_private(host) if addresses.any? { |address| reserved?(address) }
      addresses.first.to_s
    end

    def raise_private(host)
      raise Errors::LlmNotConfiguredError,
            "The endpoint #{host} resolves to a private or loopback address, which is " \
            'reachable only through an institution provider.'
    end

    # getaddrinfo, as Net::HTTP itself resolves: /etc/hosts and nsswitch included.
    def resolve(host)
      Addrinfo.getaddrinfo(host, nil, nil, :STREAM).map { |info| IPAddr.new(info.ip_address) }.uniq
    end

    def usable?(uri)
      uri.present? && ALLOWED_SCHEMES.include?(uri.scheme) && uri.hostname.present?
    end

    def safe_parse(base_url)
      URI.parse(base_url.to_s.strip.chomp('/'))
    rescue URI::InvalidURIError
      nil
    end

    # Literals and local names only: a lookup per save would stall offline deployments.
    # Names are resolved and checked when connecting, cf. pinned_address!.
    def private_host?(host)
      name = host.downcase.chomp('.')
      return true if name == 'localhost' || LOCAL_SUFFIXES.any? { |suffix| name.end_with?(suffix) }

      address = ip_literal(name)
      address.present? && reserved?(address)
    end

    def ip_literal(host)
      IPAddr.new(host)
    rescue IPAddr::Error
      numeric_literal(host)
    end

    # The shorthand forms getaddrinfo also reads as IPv4 (127.1, 2130706433,
    # 0x7f000001), parsed without a DNS lookup.
    def numeric_literal(host)
      info = Addrinfo.getaddrinfo(host, nil, nil, :STREAM, nil, Socket::AI_NUMERICHOST).first
      info && IPAddr.new(info.ip_address)
    rescue SocketError, IPAddr::Error
      nil
    end

    def reserved?(address)
      ip = address.ipv4_mapped? ? address.native : address
      RESERVED_RANGES.any? { |range| range.include?(ip) }
    end
  end
end
