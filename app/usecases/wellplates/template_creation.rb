# frozen_string_literal: true

module Usecases
  module Wellplates
    class TemplateCreation
      def initialize(wellplate)
        @wellplate = wellplate
        @header = ['Position', 'Sample', 'External Compound Label/ID',
                   'Smiles',	'Readout1_Value', 'Readout1_Unit', 'Readout2_Value',	'Readout2_Unit']
      end

      def execute!
        check_wellplate_bounds

        xfile = create_excel_object
        create_data_content(xfile.workbook.worksheets.first)

        xfile
      end

      private

      def check_wellplate_bounds
        max = 100

        value = @wellplate.width > max ? @wellplate.width : @wellplate.height
        parameter = @wellplate.width > max ? 'width' : 'height'

        should_throw = @wellplate.width > max || @wellplate.height > max

        raise "Wellplate #{parameter} of #{value} exceeds maximum allowed #{parameter} of #{max}" if should_throw
      end

      def create_excel_object
        xfile = Axlsx::Package.new
        xfile.workbook.styles.fonts.first.name = 'Calibri'

        xfile.workbook.styles do |s|
          @data_style = s.add_style alignment: { horizontal: :center }, sz: 10
          @header_style = s.add_style alignment: { horizontal: :center }, sz: 11
        end

        sheet = xfile.workbook.add_worksheet(name: 'Wellplate import template')
        sheet.add_row(@header)

        xfile
      end

      def create_data_content(sheet)
        mock_value_mg = 0.1
        mock_value_gw = 1
        @wellplate.wells.sort_by(&:sortable_alphanumeric_position).each do |well|
          well_data = [well.sortable_alphanumeric_position, '', '', '',
                       mock_value_mg.round(2), 'mg', mock_value_gw, 'GW']
          mock_value_gw += 1
          mock_value_mg += 0.01
          sheet.add_row(well_data, style: @data_style)
        end
      end
    end
  end
end
