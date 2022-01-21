# frozen_string_literal: true

module Usecases
  module ResearchPlans
    class ImportWellplateAsTable
      attr_reader :research_plan, :wellplate

      def initialize(research_plan, wellplate)
        @research_plan = research_plan
        @wellplate = wellplate
      end

      def execute!
        table = convert_wellplate_to_table(wellplate)
        research_plan.body << table
        research_plan.save!
      end

      def convert_wellplate_to_table(wellplate)
        {
          id: SecureRandom.uuid,
          type: :table,
          value: {
            rows: convert_rows(wellplate),
            columns: convert_columns(wellplate)
          }
        }
      end

      private

      def convert_columns(wellplate)
        columns = [
          { key: :wellplate_position, name: "X, Y", width: 50, editable: false, resizable: true }
        ]

        wellplate.readout_titles.each_with_index do |readout_title, index|
          columns << {
            key: "readout_#{index + 1}",
            name: readout_title,
            width: 100,
            editable: true,
            resizable: true
          }
        end

        columns
      end

      def convert_rows(wellplate)
        rows = []
        wellplate.wells.sort_by { |well| [well.position_x, well.position_y] }.each do |well|
          row = { wellplate_position: "#{well.position_x}, #{well.position_y}" }
          well.readouts.each_with_index do |readout, index|
            row["readout_#{index + 1}"] = "#{readout[:value]} #{readout[:unit]}"
          end
          rows << row
        end

        rows
      end
    end
  end
end
