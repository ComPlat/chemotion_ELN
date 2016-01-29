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
        c = OpenBabel::OBConversion.new
        opts = OpenBabel::OBConversion::GENOPTIONS
        c.add_option 'gen2D', opts
        c.set_in_format 'mol'
        c.set_out_format 'mol'
        m = OpenBabel::OBMol.new
        c.read_string m, mol_data
        m.do_transformations c.get_options(opts), c

        env['api.format'] = :binary

        "Ok.\n" + c.write_string(m, false)
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
