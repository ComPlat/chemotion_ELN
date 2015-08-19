# TODO Welcoming logged in user; maybe removed later on
class PagesController < ApplicationController
  def welcome
  end

  def test
    report = RTFReport.new do |r|
      r.header do |h|
        h.experiment = 'Simone_18-100'
        h.owner = 'ELNdmin'
        h.created_date = Time.new(2015, 03, 23, 12, 9, 42, "+01:00")
        h.printed_date = Time.new(2015, 03, 27, 14, 7, 41, "+01:00")
        h.status = 'Open'
      end
      2.times {r.line_break}
      r.add_image do |i|
        i.set_path 'data/example.svg'
        i.size x: 10, y: 10
      end
      r.line_break
      r.add_paragraph do |p|
        p.add_text 'Reaction conditions:', font_style: :bold
      end
      r.add_table(2, 2) do |t|
        t.add_line 'Reaction Molarity', '0,056 molar'
        t.add_line 'Pressure', 'Temperature'
      end
      r.add_paragraph do |p|
        p.add_text 'Reactants:', font_style: :bold
      end
      #Problematisch
      r.add_table(3, 14) do |t|
        t.add_line '', 'Reactant', 'MF', 'Limit?', 'MW', 'Eq', 'Moles (mmol)', 'Sample Mass (g)', 'Vol', 'Molarity', 'd', '% Wt', 'FM', 'Reactant Mass (g)'
        t.add_line '1', 'Harz SG-V1892', 'C92H89F3 NO4', 'true', '1329,6 91', '1,00 0', '0,226', '0,300', '', '', '', '', '1329,6 91', '0,300'
        t.add_line '2', '2-amino-4-(tert-butyl)phenol', 'C10H15NO', 'false', '165,23 2', '3,00 0', '0,677', '0,112', '', '', '', '', '165,23 2', '0,112'
      end
      r.add_paragraph do |p|
        p.add_text 'Solvents:', font_style: :bold
      end
      r.add_table(2, 4) do |t|
        t.add_line '', 'Name', 'Ratio', 'Volume (ml)'
        t.add_line '1', 'Methanol', '', '4'
      end
      r.add_paragraph do |p|
        p.add_text 'Products', font_style: :bold
      end
      r.add_table(2, 12) do |t|
        t.add_line '', 'Product', 'MF', 'Actual Mass', 'Actual Mol', 'Yiel d', 'Purit y', 'MW', 'Eq', 'Theo Mol (mmol)', 'Theo Mass (g)', 'FM'
        t.add_line '1', '6-(tert-butyl)-3-phenyl-2H-benzo[b][1,4]-2-one', 'C18H17N O2', '', '', '', '', '279,3 33', '1,00 0', '0,226', '0,063', '279,3 33'
      end
      r.add_paragraph do |p|
        p.add_text 'Preparation', font_style: :bold
        p.line_break
        p.add_text 'Das Harz SG-V1892 (0,300 g, 0,226 mmol) wird in Methanol (Volume: 4 ml) gequellt und mit 2-amino-4-(tert-butyl)phenol (0,112 g, 0,667 mmol) und aluminum chloride (0,030 g. 0,226 mmol) versetzt. Die Reaktion wird über das Wochenende bei 50C im Vialblock gerührt.'
        p.line_break
        p.add_text 'Zur Aufarbeitung wird eine Säulenchromatographie durchgeführt.'
        p.line_break
        p.line_break
        p.add_text 'DC: CH/EE 2:1'
        p.line_break
        p.add_text 'Säule: CH/EE'
        p.line_break
        p.line_break
        p.add_text 'Die Reaktion hat schon reagiert, aber zu wenig zu säulen.'
      end
      r.line_break
    end

    #render text: report.to_yaml
    send_data report.generate_report, :type => "text/rtf", :filename => 'report.rtf', :x_sendfile => true
  end
end
