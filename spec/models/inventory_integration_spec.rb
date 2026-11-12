# frozen_string_literal: true

require 'rails_helper'

# Each file must define the constant its path names, or the classic autoloader cannot find it.
describe InventoryIntegration do
  it 'covers the namespace' do
    expect(Rails.root.glob('app/{models,services,jobs}/inventory_integration{,/**/*}.rb')).not_to be_empty
  end

  Rails.root.glob('app/{models,services,jobs}/inventory_integration{,/**/*}.rb').each do |file|
    it "defines the constant of #{file.relative_path_from(Rails.root)}" do
      constant = file.to_s.sub(%r{\A#{Rails.root}/app/(models|services|jobs)/}, '').delete_suffix('.rb').camelize
      expect(constant.safe_constantize).not_to be_nil
    end
  end
end
