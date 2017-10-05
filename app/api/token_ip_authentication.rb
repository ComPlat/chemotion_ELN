class TokenIPAuthentication
  attr_reader :request

  def initialize(request)
    @request = request
  end

  def is_successful?
    token = request.headers['Auth-Token'] || request.params['auth_token']
    key = API::AuthenticationKey.find_by(token: token)
    key && key.ip == request.env['REMOTE_ADDR']
  end
end
