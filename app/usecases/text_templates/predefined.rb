# frozen_string_literal: true

module Usecases
  module TextTemplates
    # CRUD for global (predefined) text templates.
    class Predefined
      def initialize(current_user)
        @current_user = current_user
      end

      def create(params)
        PredefinedTextTemplate.create!(
          name: params[:name],
          user_id: @current_user.id,
          data: params[:data] || {},
        )
      end

      def update(params)
        template = find_by_id(params[:id])
        template.update!(
          name: params[:name].presence || template.name,
          data: params[:data] || template.data,
        )
        template
      end

      def destroy(params)
        template = PredefinedTextTemplate.find_by(name: params[:name]) ||
                   raise(ActiveRecord::RecordNotFound)
        template.destroy
        template
      end

      private

      def find_by_id(id)
        PredefinedTextTemplate.find_by(id: id) || raise(ActiveRecord::RecordNotFound)
      end
    end
  end
end
