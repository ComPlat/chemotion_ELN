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
        research_plan.body << wellplate_headline
        research_plan.body << table
        research_plan.save!
      end

      def convert_wellplate_to_table(wellplate)
        {
          id: SecureRandom.uuid,
          type: :table,
          title: wellplate.name || "Wellplate #{wellplate.id}",
          wellplate_id: wellplate.id,
          value: {
            rows: convert_rows(wellplate),
            columns: convert_columns(wellplate)
          }
        }
      end

      private

      def wellplate_headline
        uuid = Digest::UUID.uuid_v4()
        name = [wellplate.short_label, wellplate.name].join(' ')
        {
          id: uuid,
          type: :richtext,
          title: 'Text',
          value: {
            ops: [
              { insert: name },
              { insert: "\n", attributes: { header: 3 } }
            ]
          }
        }
      end

      def convert_columns(wellplate)
        # NOTES:
        # colId could be omitted according to the AgGrid API, but ResearchPlanDetailsFieldTable uses it to hardcode a key
        # field defines which row field is used to fetch the data
        #
        # see https://www.ag-grid.com/javascript-data-grid/column-properties/ for more information
        columns = [
          {
            colId: :wellplate_position, field: :wellplate_position,
            headerName: 'Position', editable: false, resizable: true
          },
          {
            colId: :sample, field: :sample,
            headerName: 'Sample', editable: false, resizable: true
          }
        ]

        wellplate.readout_titles.each_with_index do |readout_title, index|
          %w[value unit].each do |column_suffix|
            columns << {
              colId: "readout_#{index + 1}_#{column_suffix}",
              field: "readout_#{index + 1}_#{column_suffix}",
              headerName: [readout_title, column_suffix.capitalize].join(' '),
              editable: true,
              resizable: true
            }
          end
        end

        columns
      end

      def convert_rows(wellplate)
        rows = []
        wellplate.wells.sort_by { |well| [well.position_x, well.position_y] }.each do |well|
          row = {
            wellplate_position: well.alphanumeric_position,
            sample: well&.sample&.short_label || ''
          }
          well.readouts.each_with_index do |readout, index|
            next if [readout['value'], readout['unit']].any?(&:blank?)

            row["readout_#{index + 1}_value"] = readout['value']
            row["readout_#{index + 1}_unit"] = readout['unit']
          end
          rows << row
        end

        rows
      end
    end
  end
end
