class TokenAuthentication
  attr_reader :request, :args, :key, :token

  def initialize(request, **args)
    @request = request
    @args = args
    @token = request.headers['Authorization']&.match(
      /^Bearer\s*([\w\-\.\~\+\/]+)=*/) && $1
    @key = AuthenticationKey.find_by(token: token)
  end

  def is_successful?
    key && all_checks
  end

  def all_checks
    check_keys.map{|check| send(check) }.all?
  end

  private

  def check_keys
    args.keys & [:with_remote_addr]
  end

  def with_remote_addr
    key && key.ip.include?(request.env['REMOTE_ADDR'])
  end
end
