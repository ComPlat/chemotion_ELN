require "rails_helper"

describe "Chemotion::Calculations" do
  let(:sum_formula) { "C6H7N" }
  let(:residue_formula) { "CH" }
  let(:loading) { 1 }
  let(:af) { Chemotion::Calculations.analyse_formula sum_formula }
  let(:total_mw) { Chemotion::Calculations.get_total_mw af }
  let(:c_num) { af["C"][:atoms_number] }
  let(:h_num) { af["H"][:atoms_number] }
  let(:n_num) { af["N"][:atoms_number] }
  let(:c_weight) { af["C"][:atomic_weight].to_f }
  let(:h_weight) { af["H"][:atomic_weight].to_f }
  let(:n_weight) { af["N"][:atomic_weight].to_f }
  let(:c_weight_fraction) { af["C"][:weight_fraction].to_f }
  let(:c_real_num) { 6 }
  let(:h_real_num) { 7 }
  let(:n_real_num) { 1 }
  let(:c_real_weight) { 12.0107 }
  let(:h_real_weight) { 1.00794 }
  let(:n_real_weight) { 14.0067 }

  describe ".analyse_formula" do
    it 'calculates weight_fraction(wf) by: c_num * c_weight / sum(num * weight)' do
      calc_c_weight_fraction = (c_num * c_weight) / total_mw.to_f

      expect(c_weight_fraction).to eq(calc_c_weight_fraction)
    end

    it 'returns molecule number and weight base on PeriodicTable & formula' do
      expect(c_num).to eq(c_real_num)
      expect(h_num).to eq(h_real_num)
      expect(n_num).to eq(n_real_num)
      expect(c_weight).to eq(c_real_weight)
      expect(h_weight).to eq(h_real_weight)
      expect(n_weight).to eq(n_real_weight)
    end

    it "returns a Hash with atoms_number/atomic_weight/weight_fraction" do
      expect(af.class).to eq(Hash)
      expect(af["C"].class).to eq(Hash)
      expect(af["C"][:atomic_weight].class).to eq(BigDecimal)
    end
    # {
    #   "C"=>{:atoms_number=>6,
    #         :atomic_weight=>#<BigDecimal:7ff31b549640,'0.120107E2',18(36)>,
    #         :weight_fraction=>#<BigDecimal:7ff31b541378,'0.7738314601 8189455888 3789015E0',27(45)>},
    #   "H"=>{:atoms_number=>7,
    #         :atomic_weight=>#<BigDecimal:7ff31b548010,'0.100794E1',18(36)>,
    #         :weight_fraction=>#<BigDecimal:7ff31b540b30,'0.7576341337 0719047901 305837E-1',27(45)>},
    #   "N"=>{:atoms_number=>1,
    #         :atomic_weight=>#<BigDecimal:7ff31b543790,'0.140067E2',18(36)>,
    #         :weight_fraction=>#<BigDecimal:7ff31b5403b0,'0.1504051264 4738639321 4905148E0',27(45)>}
    # }
  end

  describe ".parse_formula" do
    let(:pf) { Chemotion::Calculations.parse_formula sum_formula }

    it 'returns a Hash' do
      expect(pf.class).to eq(Hash)
    end

    it 'parses numbers of atoms' do
      expect(pf["C"]).to eq(c_real_num)
    end
    # {"C"=>6, "H"=>7, "N"=>1}
  end

  describe ".get_composition" do # composition <-> loading
    context "not polymer" do
      let(:comp) { Chemotion::Calculations.get_composition sum_formula }

      it "returns a Hash with weight_fraction(%)" do
        expect(comp.class).to eq(Hash)
        expect(comp["C"].class).to eq(BigDecimal)
      end

      it "calculates composition(wf) from molecule numbers & weigths" do
        expect(comp["C"].to_f).to eq((c_weight_fraction * 100).round(2))
      end
      # {
      #   "C"=>#<BigDecimal:7ff31afc48f0,'0.7738E2',18(45)>,
      #   "H"=>#<BigDecimal:7ff31b5c1f50,'0.758E1',18(45)>,
      #   "N"=>#<BigDecimal:7ff31b5c1848,'0.1504E2',18(45)>
      # }
    end

    context "polymer" do
      let(:residue_af) { Chemotion::Calculations.analyse_formula residue_formula }
      let(:residue_c_weight_fraction) { residue_af["C"][:weight_fraction].to_f }
      let(:comp) { Chemotion::Calculations.get_composition sum_formula, residue_formula, loading }
      let(:m_mux) { total_mw * loading / 1000.0 }

      it "returns a Hash with weight_fraction(%)" do
        expect(comp.class).to eq(Hash)
        expect(comp["C"].class).to eq(BigDecimal)
      end

      it "calculates ratio of molecule: m_mux = (molecule_mw * loading / 1000) " do
        expect(m_mux).to eq(0.09312648)
      end

      it "calculates composition(wf) from loading: [m_wf * m_mux + p_wf * (1 - m_mux)]" do
        c_molecule_weight = c_weight_fraction * m_mux
        c_polymer_weight = residue_c_weight_fraction * (1 - m_mux)
        c_total_weight_fraction = ((c_polymer_weight + c_molecule_weight) * 100).round(2)

        expect(comp["C"].to_f).to eq(c_total_weight_fraction)
      end
      # {
      #   "C"=>#<BigDecimal:7f9dc5986d80,'0.9087E2',18(54)>,
      #   "H"=>#<BigDecimal:7f9dc5986b28,'0.773E1',18(54)>,
      #   "N"=>#<BigDecimal:7f9dc5986858,'0.14E1',18(54)>
      # }
    end
  end

  describe ".get_loading" do # composition <-> loading
    before do
      comp = Chemotion::Calculations.get_composition sum_formula, residue_formula, loading
      el_comp_data = {"C"=>comp["C"], "H"=>comp["H"], "N"=>comp["N"]}
      @loading_from_comp = Chemotion::Calculations.get_loading sum_formula, residue_formula, el_comp_data
    end

    it 'returns BigDecimal' do
      expect(@loading_from_comp.class).to eq(BigDecimal)
    end

    it 'calculates loading from composition' do
      expect(@loading_from_comp.to_f.round(2)).to eq(loading.to_f.round(2))
    end
    # #<BigDecimal:7f9dc69e84f8,'0.1999043314 9849714779 3555941554 6164569690 8085250016 0721084886 6E-2',63(72)>
  end

  describe ".get_yield" do
    before do
      @c_sm = 90
      @c_pd = 70
      @c_expected = 80
      sm_data = {"C"=>@c_sm}
      product_data = {"C"=>@c_pd}
      expected_data = {"C"=>@c_expected}
      @y = Chemotion::Calculations.get_yield product_data, sm_data, expected_data
    end

    it 'returns Float' do
      expect(@y.class).to eq(Float)
    end

    it 'calculates yield: (pd - sm) / (expected - sm)' do
      target = (@c_pd - @c_sm) / (@c_expected - @c_sm)
      expect(@y).to eq(target)
    end
  end

  describe ".fixed_digit" do
    it 'returns number with correct precisons' do
      num = 123.4567890
      result = Chemotion::Calculations.fixed_digit(num, 3)
      target = '123.457'

      expect(result.to_s).to eq(target)
    end
  end

  describe ".guilty_digit" do
    it 'returns number0 with correct precisons' do
      num = 12345.67890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '12346'

      expect(result).to eq(target)
    end

    it 'returns number1 with correct precisons' do
      num = 1234.567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '1235'

      expect(result).to eq(target)
    end

    it 'returns number2 with correct precisons' do
      num = 123.4567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '123'

      expect(result).to eq(target)
    end

    it 'returns number3 with correct precisons' do
      num = 12.34567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '12.3'

      expect(result).to eq(target)
    end

    it 'returns number4 with correct precisons' do
      num = 1.234567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '1.23'

      expect(result).to eq(target)
    end

    it 'returns number5 with correct precisons' do
      num = 0.1234567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '0.123'

      expect(result).to eq(target)
    end

    it 'returns number6 with correct precisons' do
      num = 0.01234567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '0.0123'

      expect(result).to eq(target)
    end

    it 'returns number7 with correct precisons' do
      num = 0.001234567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '0.00123'

      expect(result).to eq(target)
    end

    it 'returns number8 with correct precisons' do
      num = 0.0001234567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '0.000123'

      expect(result).to eq(target)
    end

    it 'returns number9 with correct precisons' do
      num = 0.00001234567890
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '0.0000123'

      expect(result).to eq(target)
    end

    it 'returns number10 with correct precisons' do
      num = 0.0
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '0.00'

      expect(result).to eq(target)
    end

    it 'returns number11 with correct precisons' do
      num = 1.0
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '1.00'

      expect(result).to eq(target)
    end

    it 'returns number12 with correct precisons' do
      num = 1.000000
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '1.00'

      expect(result).to eq(target)
    end

    it 'returns number14 with correct precisons' do
      num =  1.00012345678
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '1.00'

      expect(result).to eq(target)
    end

    it 'returns number14 with correct precisons' do
      num = 12.00012345678
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '12.0'

      expect(result).to eq(target)
    end

    it 'returns number15 with correct precisons' do
      num = 0
      result = Chemotion::Calculations.guilty_digit(num, 0)
      target = '0'

      expect(result).to eq(target)
    end

    it 'returns number16 with correct precisons' do
      num = 0.10000000000
      result = Chemotion::Calculations.guilty_digit(num, 3)
      target = '0.100'

      expect(result).to eq(target)
    end
  end
end
