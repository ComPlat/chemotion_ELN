# frozen_string_literal: true

module ReactionProcessEditor
  class OntologiesAPI < Grape::API
    helpers StrongParamsHelpers

    rescue_from :all

    desc 'get Ontologies'
    get :ontologies do
      { ontologies: ReactionProcessEditor::Ontology.order(:ontology_id) }
    end

    params do
      requires :ontology, type: Hash do
        requires :active, type: Boolean
        requires :ontology_id
        requires :ontology_type
        requires :label
        optional :name
        optional :link
        requires :roles, type: Hash
        optional :solvents, type: Array
        optional :detectors, type: Array
        optional :stationary_phase, type: Array
      end
    end
    desc 'Create or Update an Ontology'
    post :ontologies do
      Usecases::ReactionProcessEditor::Ontology::CreateOrUpdate.execute!(ontology_params: permitted_params[:ontology])
    end
  end
end
