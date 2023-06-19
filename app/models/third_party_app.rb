# frozen_string_literal: true

class ThirdPartyApp < ApplicationRecord
  def self.all_names
    return nil if ThirdPartyApp.count.zero?

    entries = ThirdPartyApp.all
    names = []
    entries.each do |e|
      names << e.name
    end
    names
  end
end
