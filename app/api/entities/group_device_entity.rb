module Entities
    class GroupDeviceEntity < Grape::Entity
      expose :id, :name, :email, :data, :name_abbreviation, :type
      expose :users, as: 'users', using: Entities::UserSimpleEntity
      expose :admins, as: 'admins', using: Entities::UserSimpleEntity
      expose :devices, as: 'devices', using: Entities::UserSimpleEntity
      def data
        if object.respond_to? :profile
          object.profile.data  if object.profile.respond_to? :data
        end
      end
    end
  end