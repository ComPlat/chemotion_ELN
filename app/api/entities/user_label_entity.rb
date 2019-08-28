module Entities
    class UserLabelEntity < Grape::Entity
      expose :id, :user_id, :access_level, :title, :description, :color
    end
  end
