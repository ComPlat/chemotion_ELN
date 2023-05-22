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
      end

      def find_cellline_material 

      end

      def create_cellline_material 

      end

      def check_parameter
        check_ontology(@params[:organism])
        check_ontology(@params[:tissue])
        raise 'amount not valid' unless @params[:amount] && @params[:amount].class == Integer && @params[:amount] >=0
        raise 'passage not valid' unless @params[:passage] && @params[:passage].class == Integer && @params[:passage] >=0
        raise 'disease not valid' unless @params[:disease] && @params[:disease].class == String && !@params[:disease].empty?
        raise 'material name not valid' unless @params[:material_names] && @params[:material_names].length >=0 && !@params[:material_names][0].empty?
      end

      def check_ontology(field) 
          return if field.class == String && !field.empty?

          raise 'error' 
      end
    end
  end
end
