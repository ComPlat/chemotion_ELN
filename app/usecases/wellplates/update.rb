module Usecases
  module Wellplates
    class Update
      attr_reader :params

      def initialize(params)
        @params = params
      end

      def execute!
        attributes = {
          name: params[:name],
          size: params[:size],
          description: params[:description]
        }

        ActiveRecord::Base.transaction do
          wellplate = Wellplate.find(params[:id])
          wellplate.update(attributes)
          WellplateUpdater.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate.touch
          wellplate.reload
          wellplate
        end
      end
    end
  end
end
