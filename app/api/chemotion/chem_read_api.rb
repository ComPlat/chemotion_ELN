# frozen_string_literal: true

# Belong to Chemotion module
module Chemotion
  require 'open3'
  require 'ole/storage'

  # API for ChemRead manipulation
  class ChemReadAPI < Grape::API
    helpers ChemReadHelpers

    resource :chemread do
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
            temp_file = file.tempfile
            temp_path = temp_file.to_path
            extn = File.extname temp_path
            tmp_dir = Dir.mktmpdir([uid, File.basename(temp_path, extn)])

            info = read_uploaded_file(temp_file, tmp_dir, get_mol)
            smi_obj = { uid: uid, name: file.filename, info: info }

            temp_file.close
            temp_file.unlink
            FileUtils.remove_dir tmp_dir, true
            smi_arr.push(smi_obj)
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
            res.push(
              uid: smi[:uid],
              smiIdx: smi[:smiIdx],
              svg: SVG::ReactionComposer.cr_reaction_svg_from_rsmi(
                smi[:newSmi],
                ChemReadHelpers::SOLVENTS_SMI,
                ChemReadHelpers::REAGENTS_SMI
              )
            )
          end
          res
        end
      end
    end
  end
end
