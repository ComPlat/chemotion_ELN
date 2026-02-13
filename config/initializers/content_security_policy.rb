# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy
# For further information see the following documentation
# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy

Rails.application.config.content_security_policy do |policy|
  # policy.default_src :self, :https
  # policy.font_src    :self, :https, :data
  # policy.img_src     :self, :https, :data
  # policy.object_src  :none
  # policy.script_src  :self, :https
  # policy.style_src   :self, :https

  # policy.default_src :self, :https :unsafe_inline, :unsafe_eval

  # Allow WebSocket, blob, and specific external connections
  src = %i[self https data wss blob]
  src += ['https://commonchemistry.cas.org', 'https://dx.doi.org', 'https://doi.org', 'https://api.crossref.org', 'https://service.tib.eu']
  script_src = %i[self]
  if Rails.application.config.editors&.docserver_api.present?
    script_src += [Rails.application.config.editors.docserver_api]
  end

  # connect_src for log and webpack-dev-serverwebsockets in development
  if Rails.env.development?
    url = URI.parse(ENV['PUBLIC_URL'] || '')
    scheme = url.scheme || 'http'
    host = url.host
    port = url.port

    src += ['http://localhost:3035', 'http://webpacker:3035', 'ws://localhost:3035']
    src += ["ws://#{host}:3035", "#{scheme}://#{host}:3035"] if host.present?
    src += ["#{scheme}://#{host}:#{url.port}"] if host.present? && port.present?
    puts <<~CSPINFO
      connect_src: #{src}"
      script_src: #{script_src}"
    CSPINFO
  end

  policy.script_src_elem(*script_src)
  policy.connect_src(*src)

  # Specify URI for violation reports
  policy.report_uri '/csp-violation-report'
end

Rails.application.config.content_security_policy_nonce_generator = ->(_request) { SecureRandom.base64(16) }
Rails.application.config.content_security_policy_nonce_directives = %w[script-src script-src-elem]

# If you are using UJS then enable automatic nonce generation
# Rails.application.config.content_security_policy_nonce_generator = -> request { SecureRandom.base64(16) }

# Report CSP violations to a specified URI
# For further information see the following documentation:
# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only
# Rails.application.config.content_security_policy_report_only = true
