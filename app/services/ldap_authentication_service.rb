# frozen_string_literal: true

# Authenticates a username/password pair against the LDAP directory configured in the
# +userProvider+ Matrice row (the same config the omniauth-ldap provider reads in
# +config/initializers/devise.rb+).
#
# The OmniAuth Rack middleware only covers the browser login flow, so this service provides
# a direct {Net::LDAP} bind for non-browser paths such as the JWT token endpoint
# ({Usecases::Authentication::BuildToken}).
class LdapAuthenticationService
  # @return [Hash, nil] the +ldap+ sub-hash of the userProvider config, or nil if unavailable
  def self.config
    Matrice.find_by(name: 'userProvider')&.configs&.dig('ldap')
  rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
    nil
  end

  # @return [Boolean] whether LDAP login is enabled
  def self.enabled?
    config&.dig('enable') == true
  end

  # @param username [String] the LDAP uid value
  # @param password [String] the user's password
  # @return [Hash, nil] normalized attributes
  #   (+:provider+, +:uid+, +:email+, +:first_name+, +:last_name+, +:groups+) on a
  #   successful bind, otherwise nil
  def self.authenticate(username, password)
    new(config).authenticate(username, password)
  end

  # @param config [Hash, nil] the +ldap+ config sub-hash
  def initialize(config)
    @config = config || {}
  end

  # @param username [String] the LDAP uid value
  # @param password [String] the user's password
  # @return [Hash, nil] normalized attributes on success, otherwise nil
  def authenticate(username, password)
    return if username.blank? || password.blank?
    return unless @config['enable'] == true && @config['host'].present?

    entries = connection.bind_as(base: @config['base'], filter: search_filter(username), password: password)
    return if entries.blank?

    normalize(entries.first)
  rescue Net::LDAP::Error => e
    Rails.logger.error("LDAP authentication failed: #{e.message}")
    nil
  end

  private

  def connection
    Net::LDAP.new(
      host: @config['host'],
      port: @config['port'] || 389,
      base: @config['base'],
      encryption: encryption,
      auth: bind_auth,
    )
  end

  # Service-account bind used for the search step; anonymous when no bind_dn is configured.
  def bind_auth
    return { method: :anonymous } if @config['bind_dn'].blank?

    { method: :simple, username: @config['bind_dn'], password: @config['password'] }
  end

  def encryption
    case (@config['method'] || 'plain').to_s
    when 'ssl' then { method: :simple_tls }
    when 'tls' then { method: :start_tls }
    end
  end

  def search_filter(username)
    uid_filter = Net::LDAP::Filter.eq(@config['uid'] || 'uid', username)
    return uid_filter if @config['filter'].blank?

    Net::LDAP::Filter.join(uid_filter, Net::LDAP::Filter.construct(@config['filter']))
  end

  def normalize(entry)
    {
      provider: 'ldap',
      uid: attribute(entry, @config['uid'] || 'uid'),
      email: attribute(entry, @config['email'] || 'mail'),
      first_name: attribute(entry, @config['first_name'] || 'givenname'),
      last_name: attribute(entry, @config['last_name'] || 'sn'),
      groups: [],
    }
  end

  def attribute(entry, name)
    Array(entry[name.to_s.downcase.to_sym]).first
  end
end
