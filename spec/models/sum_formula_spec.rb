# frozen_string_literal: true

RSpec.describe SumFormula do
  let(:formula) { described_class.new('C6H12O') }

  describe '#initialize' do
    it 'parses a valid formula' do
      expect(formula).to include('C' => 6, 'H' => 12, 'O' => 1)
      expect(formula.keys).to contain_exactly('C', 'H', 'O')
    end

    it 'handles deeply nested groups' do
      deeply_nested_formula = described_class.new('C6H12OUno(C2H4(C3H6(UnoO))2)2.Uno')
      expect(deeply_nested_formula).to include(
        'C' => (6 + (2 * 2 * 3) + (2 * 2)),
        'H' => (12 + (2 * 2 * 6) + (2 * 4)),
        'O' => (1 + (2 * 2)),
        'Uno' => (1 + (2 * 2) + 1),
      )
    end

    it 'handles multiple deeply nested groups' do
      formula = described_class.new('H2(H(H(H)2(HC2)3))5')
      expect(formula['H']).to eq(2 + (5 * (1 + 1 + 2 + 3)))
      expect(formula['C']).to eq(30)
    end

    it 'handles formula with dots' do
      expect(described_class.new('H2.H.H3')).to include('H' => 2 + 1 + 3)
      expect(described_class.new('CuSO4.5H2O')).to include('Cu' => 1, 'S' => 1, 'O' => 4 + (5 * 1), 'H' => 10)
    end

    it 'parses hydrate notation with dot coefficient' do
      expect(described_class.new('CuSO4.5H2O')).to eq(
        'Cu' => 1,
        'S' => 1,
        'O' => 9,
        'H' => 10,
      )
    end

    it 'parses decimal atom counts' do
      parsed = described_class.new('C12.3H3.5O2.556')
      expect(parsed).to include('C' => 12.3, 'H' => 3.5, 'O' => 2.556)
    end

    it 'handles empty formula' do
      formula = described_class.new('')
      expect(formula).to be_empty
    end
  end

  describe '#add_fragment' do
    it 'adds a fragment to the formula' do
      formula.add_fragment!('C2H4')
      expect(formula).to include('C' => 8, 'H' => 16, 'O' => 1)
    end

    it 'handles empty fragment' do
      formula.add_fragment!('')
      expect(formula).to include('C' => 6, 'H' => 12, 'O' => 1)
    end
  end

  describe '#remove_fragment' do
    it 'removes a fragment from the formula' do
      formula.remove_fragment!('C2H40O')
      expect(formula).to include('C' => 4, 'H' => -28, 'O' => 0)
    end

    it 'handles empty fragment' do
      formula.remove_fragment!('')
      expect(formula).to include('C' => 6, 'H' => 12, 'O' => 1)
    end

    it 'handles negative counts' do
      formula.remove_fragment!('C7H13')
      expect(formula).to include('C' => -1, 'H' => -1, 'O' => 1)
    end
  end

  describe '#trim' do
    it 'removes elements with zero or negative counts' do
      formula['C'] = -1
      formula['H'] = 0
      result = formula.trim
      expect(result).not_to have_key('C')
      expect(result).not_to have_key('H')
    end

    it 'handles empty formula' do
      formula = described_class.new('')
      formula.trim!
      expect(formula).to be_empty
    end
  end

  describe '#valid!' do
    it 'filters out non-element keys and negative values' do
      formula['X'] = 1
      formula['C'] = -1
      formula['H'] = 0
      valid = formula.valid
      expect(valid).to contain_exactly(['O', 1])
    end
  end

  describe '#to_s' do
    it 'returns the string representation of the formula' do
      expect(formula.to_s).to eq('C6H12O')
    end

    it 'handles empty formula' do
      formula = described_class.new('')
      expect(formula.to_s).to eq('')
    end

    it 'handles negative counts' do
      formula['C'] = -1
      formula['H'] = 0
      expect(formula.to_s).to eq('C-1H0O')
    end

    it 'handles formulas with wrong elements' do
      formula['Naf'] = 1
      expect(formula.to_s).to eq('C6H12NafO')
    end
  end

  describe '#molecular_weight' do
    it 'calculates the molecular weight' do
      expect(formula.molecular_weight).to be_within(0.01).of(100.16)
    end

    it 'handles empty formula' do
      formula = described_class.new('')
      expect(formula.molecular_weight).to eq(0)
    end

    it 'ignores negative counts' do
      formula['C'] = -1
      formula['H'] = 0
      expect(formula.molecular_weight).to eq(15.9994)
    end

    it 'calculates the molecular weight of a simple formula' do
      # Ethanol (C2H5OH)
      expect(described_class.new('C2H5OH').molecular_weight).to be_within(0.00001).of(46.06848)
      # Glucose monohydrate (C6H12O6)
      expect(described_class.new('C6H12O6.H2O').molecular_weight).to be_within(0.01).of(198.17)
      # Aluminum sulfate (Al2(SO4)3)
      expect(described_class.new('Al2(SO4)3').molecular_weight).to be_within(0.01).of(342.15)
    end

    it 'handles formulas with prefix coefficients' do
      # Two glucose molecules
      expect(described_class.new('2C6H12O6').molecular_weight).to be_within(0.01).of(360.31)
      expect(described_class.new('CuSO4.5H2O').molecular_weight).to be_within(0.01).of(249.69)
    end

    it 'calculates molecular weight for decimal atom counts' do
      expect(described_class.new('C12.3H3.5O2.556').molecular_weight).to be_within(0.001).of(195.6205)
    end

    it 'calculates molecular weight for hydrate notation with dot coefficient' do
      expect(described_class.new('CuSO4.5H2O').molecular_weight).to be_within(0.01).of(249.69)
    end
  end
end
