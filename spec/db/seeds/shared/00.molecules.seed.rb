Rspec.describe Molecules::Seed do
  let(:molecules) do
    build(:molecule_set, from: pc_400, default_attributes: { molfile: build(:molfile, type: :pc_400) })
  end
  it 'should be a valid seed' do
    molecules.each do |molecule|
      expect(molecule).to be_valid
    end
  end
end
