# frozen_string_literal: true

class MatriceFastInput < ActiveRecord::Migration[6.1]
  def self.up
    Matrice.create(name: 'fastInput', enabled: true, label: 'fastInput', include_ids: [], exclude_ids: [],
                   configs: { cas_api_key: '' })
  end

  def self.down
    Matrice.find_by(name: 'fastInput')&.really_destroy!
  end
end
