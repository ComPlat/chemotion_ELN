module Chemotion
  class ResidueAPI < Grape::API
    include Grape::Kaminari

    resource :residues do

      desc 'Return molecule by Molfile'
      params do
        requires :molfile, type: String, desc: "Molecule molfile"
        requires :svg_file, type: String, desc: "Sample svg file"
      end
      post serializer: SampleWithResiduesSerializer do
        sample = Sample.new molfile: params[:molfile], user: current_user
        sample.generate_identifier

        molfile = Molecule.skip_residues params[:molfile].clone
        molecule = Molecule.find_or_create_by_molfile molfile
        sample.molecule = molecule

        # TODO: create a method for that
        filename = Digest::SHA256.hexdigest sample.identifier
        svg_file_name = "#{filename}.svg"
        svg_file_path = "public/images/samples/#{svg_file_name}"

        svg_file = File.new(svg_file_path, 'w+')
        svg_file.write(params[:svg_file])
        svg_file.close

        sample.sample_svg_file = svg_file_name
        sample.creator = current_user
        sample.save! # save sample first
        sample.create_residues

        # assign sample to a collection
        collection = Collection.find(3)
        CollectionsSample.create!(sample: sample.reload, collection: collection)

        sample
      end
    end
  end
end
