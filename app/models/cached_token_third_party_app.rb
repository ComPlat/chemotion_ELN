class CachedTokenThirdPartyApp
  attr_accessor :token, :counter

  def initialize(token, counter)
    @token = token
    @counter = counter
  end
end