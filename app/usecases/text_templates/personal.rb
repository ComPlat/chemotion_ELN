# frozen_string_literal: true

module Usecases
  module TextTemplates
    # CRUD for the current user's personal text templates.
    class Personal
      def initialize(current_user)
        @current_user = current_user
      end

      def create(params)
        PersonalTextTemplate.create!(
          user_id: @current_user.id,
          name: params[:name],
          data: params[:data] || {},
        )
      end

      def update(params)
        template = find(params[:id])
        template.update!(name: params[:name], data: params[:data] || template.data)
        template
      end

      def destroy(params)
        template = find(params[:id])
        template.destroy
        template
      end

      private

      def find(id)
        PersonalTextTemplate.find_by(id: id, user_id: @current_user.id) ||
          raise(ActiveRecord::RecordNotFound)
      end
    end
  end
end
