module Chemotion
  class KetcherAPI < Grape::API

    namespace :ketcher do
      desc 'Respond to live-check'
      get 'knocknock' do
          body 'You are welcome!'
      end

      desc 'Align molecule using OpenBabel'
      params do
        requires :moldata, type: String, desc: 'Molecule smiles data'
      end
      post :layout do
        mol_data = params[:moldata]
        r_list_index = mol_data.lines.index do |line|
          line.match /> <PolymersList>/
        end

        if r_list_index
          r_list = mol_data.lines[r_list_index + 1].split.map(&:to_i)
        end

        c = OpenBabel::OBConversion.new
        opts = OpenBabel::OBConversion::GENOPTIONS
        c.add_option 'gen2D', opts
        c.set_in_format 'mol'
        c.set_out_format 'mol'
        m = OpenBabel::OBMol.new
        c.read_string m, mol_data
        m.do_transformations c.get_options(opts), c

        result = c.write_string(m, false).lines

        t_v2000_index = result.index do |line|
          line.match /V2000/
        end

        end_index = result.index do |line|
          line.match /M\s+END/
        end

        if r_list.any? && t_v2000_index && end_index
          r_list.each do |line_number|
            result[t_v2000_index + 1 + line_number].gsub! ' * ', ' R# '
          end

          result.insert end_index + 1, "> <PolymersList>\n"
          result.insert end_index + 2, r_list.join(' ') + "\n"
        end

        env['api.format'] = :binary

        "Ok.\n" + result.join
      end

      desc 'Stub method to prevent error'
      params do
        requires :smiles, type: String, desc: 'Molecule smiles data'
      end

      get :layout do
        body 'ok'
      end
    end
  end
end
