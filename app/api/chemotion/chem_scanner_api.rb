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
            smi_obj = {
              uid: uid, name: file['filename']
            }.merge(file_info) unless file_info.nil?
            smi_arr.push(smi_obj)

            temp_file.close
            temp_file.unlink
          end

          smi_arr
        end
      end

      resource :svg do
        desc 'Convert svg from smi'
        params do
          requires :smiArr, type: Array, desc: 'Files and uids'
        end

        post 'smi' do
          smi_arr = params[:smiArr]
          res = []
          smi_arr.each do |smi|
            info = smi[:info]
            rsmi = [
              info[:reactants_smiles].join('.'),
              info[:reagents_smiles].uniq.join('.'),
              info[:products_smiles].join('.')
            ].join('>')

            res.push(
              uid: smi[:uid],
              smiIdx: smi[:smiIdx],
              cdIdx: smi[:cdIdx],
              svg: SVG::ReactionComposer.cr_reaction_svg_from_mdl(
                info,
                ChemScanner.solvents.values
              ),
              smi: rsmi
            )
          end

          res
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
          requires :getMol, type: Boolean, desc: 'Export molecules or reactions'
          requires :objects, type: Array, desc: 'Array of molecule(s)/reaction(s)'
        end

        post 'cml' do
          objects = params[:objects].map do |obj|
            next OpenStruct.new(obj) if params[:getMol]

            oreactants = obj[:reactants].map { |r| OpenStruct.new(r) }
            oproducts = obj[:products].map { |r| OpenStruct.new(r) }

            OpenStruct.new(
              reactants: oreactants,
              products: oproducts,
              reagents: [],
              reagent_smiles: obj[:reagents_smiles],
              yield: obj[:yield],
              time: obj[:time],
              temperature: obj[:temperature],
              description: obj[:description]
            )
          end

          cml = ChemScanner::Export::CML.new(objects, params[:getMol])
          cml.process
        end
      end
    end
  end
end
