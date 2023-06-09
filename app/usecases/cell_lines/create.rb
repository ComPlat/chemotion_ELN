# frozen_string_literal: true

module Usecases
  module CellLines
    class Create
      def initialize(params, current_user)
        @current_user = current_user
        @params = params
      end

      def execute!
        check_parameter
        cell_line_material = find_cellline_material || create_cellline_material
        sample = create_cellline_sample(cell_line_material)

        CollectionsCellline.create(
          collection: Collection.find(@params[:collection_id]),
          cellline_sample: sample,
        )

        sample
      end

      def find_cellline_material
        CelllineMaterial.find_by(
          name: @params[:material_names],
          source: @params[:source]
        )
      end

      def create_cellline_material
        CelllineMaterial.create(
          name: @params[:material_names],
          cell_type: @params[:cell_type],
          organism: @params[:organism],
          tissue: @params[:tissue],
          mutation: @params[:mutation],
          source: @params[:source],
          disease: @params[:disease],
          growth_medium: @params[:growth_medium],
          biosafety_level: @params[:biosafety_level],
          variant: @params[:variant],
          optimal_growth_temp: @params[:optimal_growth_temp],
          cryo_pres_medium: @params[:cryo_pres_medium],
          gender: @params[:gender],
          description: @params[:material_description],
        )
      end

      def create_cellline_sample(material)
        CelllineSample.create(
          cellline_material: material,
          creator: @current_user,
          amount: @params[:amount],
          passage: @params[:passage],
          contamination: @params[:contamination],
          name: @params[:name],
          description: @params[:description],
          short_label: @params[:short_label],
        )
      end

      def check_parameter
        raise 'amount not valid' unless check_scalar_value(@params[:amount])
        raise 'passage not valid' unless check_scalar_value(@params[:passage])
        raise 'material name not valid' unless check_names_value(@params[:material_names])
      end

      def check_ontology(field)
        field.instance_of?(String) && !field.empty?
      end

      def check_scalar_value(value)
        value.instance_of?(Integer) && value >= 0
      end

      def check_string_value(value)
        value.instance_of?(String) && !value.empty?
      end

      def check_names_value(value)
        value.instance_of?(String) && !value.empty?
      end
    end
  end
end
