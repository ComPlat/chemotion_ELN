#!/usr/bin/ruby -w

module Xmltoxlsx

   require 'rubyXL'
   require 'rubyXL/convenience_methods'

   def self.letter_allowed(inp)
     letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

     for i in letters
       if(inp == i)
         return true
       end
     end

     return false
   end



   # create new excel file based on xml file
   def self.convert(filepath, unit, filename, first = true)
     # type checking
     if(!filepath.kind_of?(String)) then
       raise TypeError.new('Filepath is not a string')
     end

     if(!unit.kind_of?(String)) then
       raise TypeError.new('unit is not a string')
     end

     if(!filename.kind_of?(String) && filename_passed) then
       raise TypeError.new('filename is not a string')
     end

     if(!first.kind_of?(TrueClass) && !first.kind_of?(FalseClass)) then
       raise TypeError.new('first is not boolean')
     end

     # further tests
     if(!File.file?(filepath)) then
       raise StandardError.new('File does not exist.')
     end

     if(File.size(filepath) > 100000) then
       raise StandardError.new('File is too large.')
     end

     if(!(File.extname(filepath) == ".xml")) then
       raise StandardError.new('File has wrong extension != xml')
     end

     file = IO.readlines(filepath)[1..10]

     file_from_dtx = false
     for i in 0..file.length
       temp = file[i].to_s
       if temp.match(/<LastAuthor>/)
         temp.slice! '<LastAuthor>'
         temp.slice! '</LastAuthor>'
         temp = temp.strip
         if temp == 'DTX-Software'
           file_from_dtx = true
         end
       end
     end

     if(file_from_dtx != true) then
       raise StandardError.new('file is not from SpectraMax iD3')
     end


     # import data and store in array
     file = IO.readlines(filepath)[-330..-1]

     list = Array.new(96)
     names = Array.new(96)
     letter = nil
     found_start = false

     row_counter = 0 # = A
     col_counter = 0 # = 1

     for i in 0..file.length
       temp = file[i].to_s

       # find new row
       if temp.match(/String/)
         temp.slice! '<Data ss:Type="String">'
         temp.slice! '</Data>'
         temp = temp.strip
         if letter_allowed(temp)
           letter = temp
           row_counter += 1
           col_counter = 0
           found_start = true
         end

       end

       # find new column
       if temp.match(/OKNRB/) && found_start
         temp.slice! '<Cell ss:StyleID="OKNRB" ss:Index="'
         temp.slice! '">'
         col_counter = temp.to_i - 3 # for some reason the index is increased by 2 in the xml files
         # additional -1 as index starts at 0
       end

       if temp.match(/Number/) && found_start
         temp.slice! '<Data ss:Type="Number">'
         temp.slice! '</Data>'
         list[ (row_counter - 1)*12 + col_counter] = (temp.to_s).to_f
         names[(row_counter - 1)*12 + col_counter] = letter + (col_counter + 1).to_s
       end
     end

     names_entire = Array.new(96)
     counter = 0
     for i in 'A'..'H'
       for j in 1..12
         names_entire[counter] = i + j.to_s
         counter += 1
       end
     end

     # store it in new excel file if no excel file is specified
     workbook = RubyXL::Workbook.new
     worksheet = workbook[0]
     worksheet.sheet_name = "Data"
     worksheet.add_cell(0, 0, "Postion")
     worksheet.add_cell(0, 1, "sample_ID")
     worksheet.add_cell(0, 2, "External Compound Label/ID")
     worksheet.add_cell(0, 3, "Smiles")
     worksheet.add_cell(0, 4, "Readout1_Value")
     worksheet.add_cell(0, 5, "Readout1_Unit")
     worksheet.add_cell(0, 6, "Readout2_Value")
     worksheet.add_cell(0, 7, "Readout2_Unit")

     for i in 0..95
       if first
         worksheet.add_cell(i + 1, 0, names_entire[i])
         worksheet.add_cell(i + 1, 1, nil)
         worksheet.add_cell(i + 1, 2, nil)
         worksheet.add_cell(i + 1, 3, nil)
         worksheet.add_cell(i + 1, 4, list[i])
         worksheet.add_cell(i + 1, 5, unit)
         worksheet.add_cell(i + 1, 6, nil)
         worksheet.add_cell(i + 1, 7, nil)
       else
         worksheet.add_cell(i + 1, 0, names_entire[i])
         worksheet.add_cell(i + 1, 1, nil)
         worksheet.add_cell(i + 1, 2, nil)
         worksheet.add_cell(i + 1, 3, nil)
         worksheet.add_cell(i + 1, 6, list[i])
         worksheet.add_cell(i + 1, 7, unit)
         worksheet.add_cell(i + 1, 4, nil)
         worksheet.add_cell(i + 1, 5, nil)
       end
     end

     workbook.write(filename)

     return nil
   end




   def self.modify(filepath, unit, excel_file, sheet_number = 0, first = true)
     # type checking
     if(!filepath.kind_of?(String)) then
       raise TypeError.new('Filepath is not a string')
     end

     if(!unit.kind_of?(String)) then
       raise TypeError.new('unit is not a string')
     end

     if(!first.kind_of?(TrueClass) && !first.kind_of?(FalseClass)) then
       raise TypeError.new('first is not boolean')
     end

     if(!excel_file.kind_of?(String)) then
       raise TypeError.new('excel_file is not a string')
     end

     if(!sheet_number.kind_of?(Integer)) then
       raise TypeError.new('sheet_number has to be an integer')
     end

     # further tests
     if(!File.file?(filepath)) then
       raise StandardError.new('File does not exist.')
     end

     if(File.size(filepath) > 100000) then
       raise StandardError.new('File is too large.')
     end

     if( (File.extname(filepath) != ".xml")) then
       raise StandardError.new('File has wrong extension != xml')
     end

     if( (File.extname(excel_file) != ".xls") && (File.extname(excel_file) != ".xlsx") ) then
       raise StandardError.new('File has wrong extension != xls or xlsx')
     end

     file = IO.readlines(filepath)[1..10]

     file_from_dtx = false
     for i in 0..file.length
       temp = file[i].to_s
       if temp.match(/<LastAuthor>/)
         temp.slice! '<LastAuthor>'
         temp.slice! '</LastAuthor>'
         temp = temp.strip
         if temp == 'DTX-Software'
           file_from_dtx = true
         end
       end
     end


     if(file_from_dtx != true) then
       raise StandardError.new('file is not from SpectraMax iD3')
     end


     # import data and store in array
     file = IO.readlines(filepath)[-330..-1]

     list = Array.new(96)
     names = Array.new(96)
     letter = nil
     found_start = false

     row_counter = 0 # = A
     col_counter = 0 # = 1

     for i in 0..file.length
       temp = file[i].to_s

       # find new row
       if temp.match(/String/)
         temp.slice! '<Data ss:Type="String">'
         temp.slice! '</Data>'
         temp = temp.strip
         if letter_allowed(temp)
           letter = temp
           row_counter += 1
           col_counter = 0
           found_start = true
         end

       end

       # find new column
       if temp.match(/OKNRB/) && found_start
         temp.slice! '<Cell ss:StyleID="OKNRB" ss:Index="'
         temp.slice! '">'
         col_counter = temp.to_i - 3 # for some reason the index is increased by 2 in the xml files
         # additional -1 as index starts at 0
       end

       if temp.match(/Number/) && found_start
         temp.slice! '<Data ss:Type="Number">'
         temp.slice! '</Data>'
         list[ (row_counter - 1)*12 + col_counter] = (temp.to_s).to_f
         names[(row_counter - 1)*12 + col_counter] = letter + (col_counter + 1).to_s
       end
     end

     names_entire = Array.new(96)
     counter = 0
     for i in 'A'..'H'
       for j in 1..12
         names_entire[counter] = i + j.to_s
         counter += 1
       end
     end

     # store it in new excel file if no excel file is specified
     workbook = RubyXL::Parser.parse(excel_file)
     worksheet = workbook[sheet_number]
     for i in 0..95
       if first
         worksheet[i+1][4].change_contents(list[i].to_s, worksheet[i+1][4].formula)
         worksheet[i+1][5].change_contents(unit, worksheet[i+1][5].formula)
       else
         worksheet[i+1][6].change_contents(list[i], worksheet[i+1][6].formula)
         worksheet[i+1][7].change_contents(unit, worksheet[i+1][7].formula)
       end
     end

     workbook.write(excel_file)

     return nil
   end


end # module Xmltoxlsx



=begin
# Tests
require "test/unit/assertions"
include Test::Unit::Assertions
filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/xml.xml'
assert_equal Xmltoxlsx.convert(filepath, "abs", "result0.xlsx", true), nil , nil # everything is fine

assert_raise do
  Xmltoxlsx.convert(filepath, true, "result.xlsx", false)
end

assert_raise do
  Xmltoxlsx.convert(filepath, true, "result.xlsx", false)
end

assert_raise do
  Xmltoxlsx.convert(true, "abs", "result.xlsx", false)
end

assert_raise do
  Xmltoxlsx.convert(filepath, "abs", nil, false)
end

assert_raise do
  Xmltoxlsx.convert(filepath, "abs", "result.xlsx", nil)
end

assert_raise do
  Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/Testfiles/nonexisting.xml', "abs", "result.xlsx", true)
end

assert_raise do
  Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/Testfiles/largefile.pdf', "abs", "result.xlsx", true)
end

assert_raise do
  Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/converter.rb', "abs", "result.xlsx", true)
end

assert_raise do
  Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/Testfiles/test5.xml', "abs", "result.xlsx", true)
end



# test different input files --> results are compared to expected results in excel files
filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test1.xml'
assert_equal Xmltoxlsx.convert(filepath, "abs", "result1.xlsx", true), nil , nil
filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test2.xml'
assert_equal Xmltoxlsx.convert(filepath, "abs", "result2.xlsx", true), nil , nil
filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test3.xml'
assert_equal Xmltoxlsx.convert(filepath, "abs", "result3.xlsx", true), nil , nil
filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test4.xml'
assert_equal Xmltoxlsx.convert(filepath, "abs", "result4.xlsx", true), nil , nil


filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/xml.xml'
filepath_excel = './result5.xlsx'
assert_equal Xmltoxlsx.modify(filepath, "abs", filepath_excel, 0, true), nil, nil
=end