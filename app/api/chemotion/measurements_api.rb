# frozen_string_literal: true

module Chemotion
  class MeasurementsAPI < Grape::API
    include Grape::Kaminari

    namespace :measurements do
      desc 'Returns measurements'
      params do
        requires :sample_id, type: Integer
        optional :show_hierarchy, type: Boolean, default: true
        optional :source_type, type: String
        optional :source_id, type: Integer
      end
      paginate per_page: 100, offset: 0
      before do
        # TODO: check if sample is readable
      end

      # Gewünschter Output:
      # {
      #   samples: [
      #     {
      #       ... some sample fields for display purposes,
      #       measurements: {
      #         description: abc
      #         value: 1.3
      #         unit: g
      #         source_type: research_plan
      #         source_id: 2342
      #       }
      #     },
      #     ... more samples
      #   }
      # }

      get do
        sample = Sample.joins(:collections)
                       .where(collections: { user_id: current_user.id})
                       .distinct
                       .find(params[:sample_id])

        samples = []
        if params[:show_hierarchy]
          samples = [sample.root, sample.root.descendants].flatten.compact
        else
          samples = [sample]
        end

        scope = Measurement.where(sample_id: samples.pluck(:id))
        if params.key?(:source_type) && params.key?(:source_id)
          scope = scope.where(source_type: params[:source_type].classify, source_id: params[:source_id])
        end
        measurements = scope.to_a
        results = []
        samples.each do |sample|
          entry = {
            id: sample.id,
            name: sample.name,
            short_label: sample.short_label,
            measurements: measurements.select { |m| m.sample == sample }.map do |measurement|
              {
                id: measurement.id,
                description: measurement.description,
                value: measurement.value.to_f,
                unit: measurement.unit,
                source_type: measurement.source_type.underscore,
                source_id: measurement.source_id
              }
            end
          }
          results << entry if entry[:measurements].any?
        end

        { measurements: results }
      end

      # params do
      #   requires :id, type: Integer, desc: 'ID of measurement to delete'
      # end
      route_param :id do
        delete do
          measurement = Measurement.find(params[:id])
          # TODO: klären wie hier die Permissions geprüft werden müssen
          if measurement.destroy
            { success: true }
          else
            { errors: measurement.errors.full_messages }
          end
        end
      end

      namespace :bulk_create_from_raw_data do
        params do
          requires :raw_data, type: Array do
            requires :description, type: String
            requires :sample_identifier, type: String
            requires :unit, type: String
            requires :uuid, type: String
            requires :value, type: Float
          end
          requires :source_type, type: String
          requires :source_id, type: Integer
        end

        post do
          Usecases::Measurements::BulkCreateFromRawData.new(current_user, params).execute!
        rescue StandardError => e
          error!(e.full_message, 500)
        end
      end
    end
  end
end
