# frozen_string_literal: true

module Usecases
  module Wellplates
    class BulkCreate
      attr_reader :params, :user

      def initialize(params, user)
        @params = params
        @user = user
      end

      def execute!
        wellplates = params[:wellplates]

        wellplates.each do |wellplate|
          Create.new(wellplate, user).execute!
        end
      end
    end
  end
end
