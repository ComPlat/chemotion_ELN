# Belong to Chemotion module
module Chemotion
  require 'open3'

  # API for Docx manipulation
  class DocxAPI < Grape::API
    resource :docx do
      resource :embedded do
        desc 'Upload cdx'
        post 'upload' do
          rsmi_arr = []

          params.each do |uid, file|
            rsmi_obj = { uid: uid, name: file.filename, rsmi: [] }
            tmp = file.tempfile
            extn = File.extname tmp.to_path
            filename = File.basename tmp.to_path, extn
            tmp_dir = Dir.mktmpdir([uid, filename])

            if extn == '.docx'
              cmd = "unzip #{tmp.to_path} -d #{tmp_dir}"
              Open3.popen3(cmd) do |_, _, _, wait_thr| wait_thr.value end

              cmd = "for file in #{tmp_dir}/word/embeddings/*.bin; "
              cmd += 'do DIR="${file%.*}"; mkdir $DIR; 7z x -o$DIR/ $file; '
              cmd += 'mv $DIR/CONTENTS $DIR.cdx; done'
              Open3.popen3(cmd) do |_, _, _, wait_thr| wait_thr.value end
              file_dir = "#{tmp_dir}/word/embeddings/*.cdx"
            else
              file_dir = tmp.to_path
            end

            Dir[file_dir].each do |cdx_path|
              cmd = Gem.loaded_specs['openbabel'].full_gem_path
              cmd += "/openbabel/bin/obabel -icdx #{cdx_path} -orsmi"
              Open3.popen3(cmd) do |_, stdout, _, wait_thr|
                rsmi = stdout.gets.delete("\n").strip
                res = {}
                unless rsmi.empty?
                  res[:svg] = SVG::ReactionComposer.reaction_svg_from_rsmi rsmi
                  res[:smi] = rsmi
                  rsmi_obj[:rsmi].push(res)
                end
                wait_thr.value
              end
            end

            tmp.close
            tmp.unlink
            FileUtils.remove_dir tmp_dir, true
            rsmi_arr.push(rsmi_obj)
          end

          rsmi_arr
        end
      end

      resource :svg do
        desc 'Convert svg from smi'
        post 'smi' do
          smi_arr = params[:smiArr]
          res = []
          smi_arr.each do |smi|
            res.push(
              uid: smi[:uid],
              rsmiIdx: smi[:rsmiIdx],
              svg: SVG::ReactionComposer.reaction_svg_from_rsmi(smi[:newSmi])
            )
          end
          res
        end
      end
    end
  end
end
