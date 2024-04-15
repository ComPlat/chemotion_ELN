module Entities
  class MatriceEntity < ApplicationEntity
    expose :id, :enabled, :name, :label, :include_ids, :exclude_ids, :include_users, :exclude_users, :configs

    expose_timestamps

    def include_users
      [] if object&.include_ids.nil?
      User.where(id: object.include_ids)&.map do |user|
        { value: user.id, name: user.first_name + ' ' + user.last_name, label: user.first_name + ' ' + user.last_name + ' (' + user.name_abbreviation + ')' }
      end
    end

    def exclude_users
      [] if object&.exclude_ids.nil?
      User.where(id: object.exclude_ids)&.map do |user|
        { value: user.id, name: user.first_name + ' ' + user.last_name, label: user.first_name + ' ' + user.last_name + ' (' + user.name_abbreviation + ')' }
      end
    end
  end
end
