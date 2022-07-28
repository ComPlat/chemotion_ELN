module Entities
    class UserLabelEntity < ApplicationEntity
      expose :id, :user_id, :access_level, :title, :description, :color
    end
  end
