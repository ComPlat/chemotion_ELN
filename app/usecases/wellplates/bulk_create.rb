# frozen_string_literal: true

module Usecases
  module Wellplates
    class BulkCreate
      attr_reader :params, :user_id

      def initialize(params, user_id)
        @params = params
        @user_id = user_id
      end

      def execute!
        wellplates = params[:wellplates]

        wellplates.each do |wellplate|
          Create.new(wellplate, user_id).execute!
        end
      end
    end
  end
end
