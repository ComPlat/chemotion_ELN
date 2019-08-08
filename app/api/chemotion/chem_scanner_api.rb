# frozen_string_literal: true

# Belong to Chemotion module
module Chemotion
  require 'open3'
  require 'ole/storage'

  # API for ChemScanner manipulation
  class ChemScannerAPI < Grape::API
    helpers ChemScannerHelpers
    format :json

    resource :chemscanner do
      resource :embedded do
        desc 'Upload import files'
        params do
          requires :get_mol, type: Boolean, default: false, desc: ''
        end

        post 'upload' do
          smi_arr = []

          get_mol = params[:get_mol]
          params.delete('get_mol')

          params.each do |uid, file|
            temp_file = file['tempfile']

            file_info = read_uploaded_file(temp_file, get_mol)
            unless file_info.nil? || file_info.empty?
              smi_obj = { uid: uid, name: file['filename'] }.merge(file_info)
              smi_arr.push(smi_obj)
            end

            temp_file.close
            temp_file.unlink
          end

          smi_arr
        end
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
              svg: Chemotion::OpenBabelService.mdl_to_trans_svg(m[:mdl])
            }
          }

          reactions = params[:reactions].map { |r|
            info = {
              reactants_mdl: (r[:reactants] || []).map { |m| m[:mdl] },
              reagents_mdl: (r[:reagents] || []).map { |m| m[:mdl] },
              products_mdl: (r[:products] || []).map { |m| m[:mdl] },
              reagents_smiles: r[:reagents_smiles].uniq || []
            }
            r[:svg] = SVG::ReactionComposer.cs_reaction_svg_from_mdl(
              info,
              ChemScanner.solvents.values
            )

            r
          }

          {
            molecules: molecules,
            reactions: reactions
          }
        end
      end

      resource :abbreviations do
        post 'all' do
          {
            abbreviations: ChemScanner.all_abbreviations,
            superatoms: ChemScanner.all_superatoms
          }
        end

        params do
          requires :newAbb, type: Boolean, desc: 'Abbreviation or superatom'
        end

        post 'add' do
          if params['newAbb']
            added = ChemScanner.add_abbreviation(params['abb'], params['smiles'])
          else
            added = ChemScanner.add_superatom(params['abb'], params['smiles'])
            ChemScanner.sync_custom_superatom
          end

          added
        end

        post 'remove' do
          abb = params.dig('data', 'abb')

          if params['newAbb']
            removed = ChemScanner.remove_abbreviation(abb)
          else
            removed = ChemScanner.remove_superatom(abb)
            ChemScanner.sync_custom_superatom
          end

          removed
        end
      end

      resource :export do
        params do
          requires :reactions, type: Array, desc: 'Array of reactions'
          requires :molecules, type: Array, desc: 'Array of molecules'
        end

        post 'cml' do
          reactions = params[:reactions].map { |reaction|
            oreactants = reaction[:reactants].map { |r| OpenStruct.new(r) }
            oproducts = reaction[:products].map { |r| OpenStruct.new(r) }

            OpenStruct.new(
              id: reaction[:id],
              reactants: oreactants,
              products: oproducts,
              reagents: [],
              reagent_smiles: reaction[:reagents_smiles],
              yield: reaction[:yield],
              time: reaction[:time],
              temperature: reaction[:temperature],
              description: reaction[:description]
            )
          }

          rcml = ChemScanner::Export::CML.new(reactions, false).process
          molecules = params[:molecules].map { |m| OpenStruct.new(m) }
          mcml = ChemScanner::Export::CML.new(molecules, true).process

          {
            molecules: mcml,
            reactions: rcml
          }
        end
      end
    end
  end
end
