# frozen_string_literal: true

module Chemotion
  class SmilesProcessor
    def initialize(params)
      @smiles = params[:smiles]
      @svg = params[:svg_file]
      @editor = params[:editor]
    end

    def process
      return unless valid_smiles? && babel_info.present?

      molecule = Chemotion::MoleculeFetcher.new(@smiles, babel_info).fetch_or_create
      return unless molecule

      svg_result = SVG::Processor.new(@svg, @editor, molecule).process
      build_result(molecule, svg_result)
    end

    private

    def valid_smiles?
      @smiles.present?
    end

    def babel_info
      @babel_info ||= Chemotion::OpenBabelService.molecule_info_from_structure(@smiles, 'smi')
    end

    def build_result(molecule, svg_result)
      molecule.attributes.merge(
        temp_svg: svg_result[:svg_file_name],
        ob_log: babel_info[:ob_log],
      )
    end
  end
end
