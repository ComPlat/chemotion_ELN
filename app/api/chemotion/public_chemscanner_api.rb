# frozen_string_literal: true

# Belong to Chemotion module
module Chemotion
  require 'open3'
  require 'ole/storage'
  require 'json'

  # API for ChemScanner manipulation
  # rubocop:disable Metrics/ClassLength
  class PublicChemscannerAPI < Grape::API
    helpers ChemscannerHelpers
    format :json

    before do
      WardenAuthentication.new(env).current_user
    end

    # rubocop:disable Metrics/BlockLength
    resource :public_chemscanner do
      desc 'Upload import files'

      post 'upload' do
        get_mol = params.delete('get_mol') == 'true'

        schemes = []
        files = []
        reactions = []
        molecules = []

        params.each do |(uid, file)|
          begin
            temp_file = file['tempfile']

            source = Chemscanner::Source.create_from_uploaded_file(file, uid, current_user)
            source.save if current_user

            file_schemes = source.scan
            files.concat([source] + source.children)
            next if file_schemes.empty?

            file_reactions = file_schemes.map(&:reactions).flatten
            file_molecules = file_schemes.map(&:molecules).flatten

            if current_user
              file_schemes.each(&:save)
              file_reactions.each(&:save)
              file_molecules.each(&:save)
            end

            schemes.concat(file_schemes)
            reactions.concat(file_reactions)
            molecules.concat(file_molecules)
          rescue StandardError => e
            Rails.logger.error("Error while scanning: #{e}")
            return {
              display: display,
              files: [],
              schemes: [],
              molecules: [],
              reactions: []
            }
          ensure
            temp_file.close
            temp_file.unlink
          end
        end

        serialize_outputs(
          files,
          schemes,
          reactions,
          molecules,
          get_mol
        )
      end

      resource :svg do
        desc 'Convert svg from MDL and SMILES'
        params do
          requires :molecules, type: Array, desc: 'Array of molecules that need SVG'
          requires :reactions, type: Array, desc: 'Array of reactions that need SVG'
        end

        post 'mdl' do
          molecules = params[:molecules].map { |m|
            {
              mid: m[:mid],
              svg: Chemotion::RdkitService.svg_from_molfile(m[:mdl])
            }
          }

          reactions = params[:reactions].map { |r|
            info = {
              reactants_mdl: (r[:reactants] || []).map { |m| m[:mdl] },
              reagents_mdl: (r[:reagents] || []).map { |m| m[:mdl] },
              products_mdl: (r[:products] || []).map { |m| m[:mdl] },
              reagents_smiles: r[:reagents_smiles].uniq || []
            }
            r[:svg] = SVG::ChemscannerComposer.reaction_svg_from_mdl(info) do |mdl|
              Chemotion::RdkitService.svg_from_molfile(mdl)
            end

            r
          }

          { molecules: molecules, reactions: reactions }
        end
      end

      resource :abbreviations do
        post 'all' do
          {
            abbreviations: ChemScanner.all_abbreviations,
            superatoms: ChemScanner.all_superatoms
          }
        end
      end

      resource :export do
        params do
          requires :reactions, type: Array, desc: 'Array of reactions'
          requires :molecules, type: Array, desc: 'Array of molecules'
        end

        post 'cml' do
          molecules = params['molecules'].map { |m| OpenStruct.new(m) }
          reactions = params['reactions'].map { |reaction|
            OpenStruct.new(
              id: reaction['id'],
              reactants: reaction['reactants'].map { |r| OpenStruct.new(r) },
              products: reaction['products'].map { |r| OpenStruct.new(r) },
              reagents: reaction['reagents'].map { |r| OpenStruct.new(r) },
              reagent_smiles: [],
              yield: reaction['yield'].to_s,
              time: reaction['time'].to_s,
              temperature: reaction['temperature'].to_s,
              description: reaction['description']
            )
          }

          {
            molecules: ChemScanner::Export::CML.new(molecules, true).process,
            reactions: ChemScanner::Export::CML.new(reactions, false).process
          }
        end
      end

      resource :ui do
        post 'version' do
          cur_version = Chemscanner::Process::CHEMSCANNER_VERSION
          current_user && list_version = Chemscanner::Scheme.pluck(:version)
                                                            .push(cur_version)
                                                            .uniq

          {
            version: cur_version,
            list_version: list_version
          }
        end
      end
    end
    # rubocop:enable Metrics/BlockLength
  end
  # rubocop:enable Metrics/ClassLength
end
