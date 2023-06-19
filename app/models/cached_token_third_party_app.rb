# frozen_string_literal: true

class CachedTokenThirdPartyApp
  attr_accessor :token, :counter, :name_tpa

  def initialize(token, counter, name_tpa)
    @token = token
    @counter = counter
    @name_tpa = name_tpa
  end
end
