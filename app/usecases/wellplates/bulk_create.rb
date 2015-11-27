module Usecases
  module Wellplates
    class BulkCreate
      attr_reader :params

      def initialize(params)
        @params = params
      end

      def execute!
        wellplates = params[:wellplates]

        wellplates.each do |wellplate|
          Create.new(wellplate).execute!
        end
      end
    end
  end
end
