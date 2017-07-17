class API::AuthenticationKey < ActiveRecord::Base
    belongs_to :device
end
