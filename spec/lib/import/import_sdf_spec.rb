require 'rails_helper'

RSpec.describe 'ImportSdf' do
  let(:two_compound_sdf) { File.read(Rails.root.join("spec/fixtures/two_compound_sdf")) }
  let(:sdf_import){Import::ImportSdf.new(data: :two_compound_sdf)}

end
