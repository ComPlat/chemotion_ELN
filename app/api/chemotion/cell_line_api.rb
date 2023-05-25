# frozen_string_literal: true

module Chemotion
  class CellLineAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('Ressource not found', 401)
    end   
    resource :cell_lines do
      desc 'Get a cell line by id'
      params do
        requires :id, type: Integer, desc: 'id of cell line sample to load'
      end

      get do
        material = CelllineMaterial.create
        sample = CelllineSample.create(cellline_material: material, creator: current_user)
        return present sample, with: Entities::CellLineSampleEntity
      end

      desc 'Create a new Cell line sample'
      params do
        requires :organism, type: String, desc: 'name of the donor organism of the cell'
        requires :tissue, type: String, desc: 'tissue from which the cell originates'
        requires :amount, type: Integer, desc: 'amount of cells'
        requires :passage, type: Integer, desc: 'passage of cells'
        requires :disease, type: String, desc: 'deasease of cells'
        requires :material_names, type: String, desc: 'names of cell line e.g. [name1,name2]'
        requires :collection_id, type: Integer, desc: 'Collection of the cell line sample'
        optional :cell_type, type: String, desc: 'type of cells'
        optional :biosafety_level, type: String, desc: 'biosafety_level of cells'
        optional :variant, type: String, desc: 'variant of cells'
        optional :optimal_growth_temp, type: Float, desc: 'optimal_growth_temp of cells'
        optional :cryo_pres_medium, type: String, desc: 'cryo preservation medium of cells'
        optional :gender, type: String, desc: 'gender of donor organism'
        optional :material_description, type: String, desc: 'description of cell line concept'
        optional :contamination, type: String, desc: 'contamination of a cell line sample'
        optional :source, type: String, desc: 'source of a cell line sample'
        optional :name, type: String, desc: 'name of a cell line sample'
        optional :description, type: String, desc: 'description of a cell line sample'
      end
      post do
        
        error!('401 Unauthorized', 401) unless current_user.collections.find(params[:collection_id])
        useCase = Usecases::CellLines::Create.new(params, current_user)
        cell_line_sample = useCase.execute!
        return present cell_line_sample, with: Entities::CellLineSampleEntity
      end
      desc 'Update a Cell line sample'
      params do
        requires :cell_line_sample_id, type: String, desc: 'id of the cell line to update'
        optional :organism, type: String, desc: 'name of the donor organism of the cell'
        optional :tissue, type: String, desc: 'tissue from which the cell originates'
        optional :amount, type: Integer, desc: 'amount of cells'
        optional :passage, type: Integer, desc: 'passage of cells'
        optional :disease, type: String, desc: 'deasease of cells'
        optional :material_names, type: String, desc: 'names of cell line e.g. [name1,name2]'
        optional :collection_id, type: Integer, desc: 'Collection of the cell line sample'
        optional :cell_type, type: String, desc: 'type of cells'
        optional :biosafety_level, type: String, desc: 'biosafety_level of cells'
        optional :variant, type: String, desc: 'variant of cells'
        optional :optimal_growth_temp, type: Float, desc: 'optimal_growth_temp of cells'
        optional :cryo_pres_medium, type: String, desc: 'cryo preservation medium of cells'
        optional :gender, type: String, desc: 'gender of donor organism'
        optional :material_description, type: String, desc: 'description of cell line concept'
        optional :contamination, type: String, desc: 'contamination of a cell line sample'
        optional :source, type: String, desc: 'source of a cell line sample'
        optional :name, type: String, desc: 'name of a cell line sample'
        optional :description, type: String, desc: 'description of a cell line sample'
      end
      put do
        useCase = Usecases::CellLines::Update.new(params, current_user)
        cell_line_sample = useCase.execute!
        return present cell_line_sample, with: Entities::CellLineSampleEntity
      end
    end
    
  end
end
