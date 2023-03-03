module Oauth2
  class Base
    def self.state
      SecureRandom.uuid
    end
  end
end
