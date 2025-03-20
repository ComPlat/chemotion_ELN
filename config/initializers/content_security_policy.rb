# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy
# For further information see the following documentation
# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy

Rails.application.config.content_security_policy do |policy|
#   policy.default_src :self, :https
#   policy.font_src    :self, :https, :data
#   policy.img_src     :self, :https, :data
#   policy.object_src  :none
#   policy.script_src  :self, :https
#   policy.style_src   :self, :https

#   # Specify URI for violation reports
#   # policy.report_uri "/csp-violation-report-endpoint"

  # connect_src for log and webpack-dev-serverwebsockets in development
  if Rails.env.development?
    url = URI.parse(ENV['PUBLIC_URL'] || '')
    scheme = url.scheme || 'http'
    host = url.host
    port = url.port

    src = [:self, 'http://localhost:3035', 'http://webpacker:3035', 'ws://localhost:3035', 'https://service.tib.eu']
    src += ["ws://#{host}:3035", "#{scheme}://#{host}:3035"] if host.present?
    src += ["#{scheme}://#{host}:#{url.port}"] if host.present? && port.present?
    puts "connect_src: #{src}"

    policy.connect_src *src
  end
end

# If you are using UJS then enable automatic nonce generation
# Rails.application.config.content_security_policy_nonce_generator = -> request { SecureRandom.base64(16) }

# Report CSP violations to a specified URI
# For further information see the following documentation:
# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only
# Rails.application.config.content_security_policy_report_only = true
