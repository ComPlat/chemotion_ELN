# TODO Welcoming logged in user; maybe removed later on
class PagesController < ApplicationController
  def welcome
  end

  def test
    report = RTFReport.new do |r|
      r.add_title do |t|
        t.font = :courier
        t.font_size = 24
        t.add_text 'Awesome Report (h1)'
      end
      r.line_break
      r.add_subtitle do |s|
        s.justify :center
        s.add_text 'This is a subtitle text (h2)'
      end
      r.line_break
      r.add_image do |i|
        i.set_path 'data/example.svg'
        i.size x: 10, y: 10
      end
      r.add_paragraph do |p|
        p.add_text 'This is a simple document that '
        p.add_text 'attempts', font_style: :bold
        p.add_text ' to demonstrate the power of the Report Generator library'
        p.line_break
        p.add_text 'This block of text is a paragraph (p)'
      end
      r.add_table(2, 3) do |t|
        # Header
        t.add_line 'adsd', 'sadsfsf', 'safdasf'

        # Table elements
        2.times do
          t.add_line 'aa', 'bb', 'cc'
        end

        t.add_line do |l|
          l.font_style = bold
        end
      end
      r.line_break
    end

    #render text: report.to_yaml
    send_data report.generate_report, :type => "text/rtf", :filename => 'report.rtf', :x_sendfile => true
  end
end
