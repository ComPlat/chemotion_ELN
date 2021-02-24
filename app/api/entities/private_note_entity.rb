# frozen_string_literal: true

module Entities
    # Publish-Subscription Entities
    class PrivateNoteEntity < Grape::Entity
      expose :id
      expose :content
      expose :created_by
      expose :created_at, :updated_at
      expose :noteable_id, :noteable_type
  
      def created_at
        object.created_at.strftime('%d.%m.%Y, %H:%M')
      end
  
      def updated_at
        object.updated_at.strftime('%d.%m.%Y, %H:%M')
      end
    end
end
  