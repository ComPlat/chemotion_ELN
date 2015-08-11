class Authentication
  def initialize(env)
    @env = env
  end

  def warden
    @env['warden']
  end

  def current_user
    warden.user
  end
end
