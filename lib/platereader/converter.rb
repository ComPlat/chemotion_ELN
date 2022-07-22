#!/usr/bin/ruby -w

module Xmltoxlsx

   require 'axlsx'

   def self.assert(message, expr)
     begin
       raise TypeError.new message if expr

     rescue TypeError => e
       return e.message
     end

     return nil
   end

   def self.letter_allowed(inp)
     letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

     for i in letters
       if(inp == i)
         return true
       end
     end

     return false
   end

   def self.convert(filepath, unit, filename, first = true)

     # type checking
     err0 = assert('filepath has to be a string', !filepath.kind_of?(String) )
     begin
       raise err0 if err0 != nil
     rescue
       return err0
     end

     err1 = assert('unit has to be a string', !unit.kind_of?(String) )
     begin
       raise err1 if err1 != nil
     rescue
       return err1
     end

     err2 = assert('filename has to be a string', !filename.kind_of?(String) )
     begin
       raise err2 if err2 != nil
     rescue
       return err2
     end

     err3 = assert('first has to be boolean', !first.is_a?(TrueClass))
     begin
       raise err3 if err3 != nil
     rescue
       return err3
     end

     # further tests
     err4 = assert('file does not exists', !File.file?(filepath) )
     begin
       raise err4 if err4 != nil
     rescue
       return err4
     end

     err5 = assert('file size is too large', File.size(filepath) > 100000)
     begin
       raise err5 if err5 != nil
     rescue
       return err5
     end

     err6 = assert('file is not xml file', !(File.extname(filepath) == ".xml") )
     begin
       raise err6 if err6 != nil
     rescue
       return err6
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

    err7 = assert('file is not from SpectraMax iD3', file_from_dtx != true)
    begin
      raise err7 if err7 != nil
    rescue
      return err7
    end

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


     Axlsx::Package.new do |p|
       p.workbook.add_worksheet(:name => "Data") do |sheet|

         sheet.add_row(["Position", "sample_ID", "External Compound Label/ID", "Smiles", "Readout1_Value", "Readout1_Unit", "Readout2_Value", "Readout2_Unit"])

         for i in 0..95
           if first == true
             sheet.add_row([names_entire[i], nil, nil, nil, list[i], unit, nil, nil])
           else
             sheet.add_row([names_entire[i], nil, nil, nil, nil, nil, list[i], unit])
           end
         end

       end
       p.serialize(filename)
     end


     return nil
   end


end # module Xmltoxlsx




# Tests
#require "test/unit/assertions"
#include Test::Unit::Assertions
#filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/xml.xml'
#assert_equal Xmltoxlsx.convert(filepath, "abs", "result0.xlsx", true), nil , nil # everything is fine

#assert_equal Xmltoxlsx.convert(true, "abs", "result.xlsx", false), 'filepath has to be a string' , 'filepath has to be a string'
#assert_equal Xmltoxlsx.convert(filepath, true, "result.xlsx", false), 'unit has to be a string' , 'unit has to be a string'
#assert_equal Xmltoxlsx.convert(filepath, "abs", nil, false), 'filename has to be a string' , 'filename has to be a string'
#assert_equal Xmltoxlsx.convert(filepath, "abs", "result.xlsx", nil), 'first has to be boolean' , 'first has to be boolean'
#assert_equal Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/Testfiles/nonexisting.xml', "abs", "result.xlsx", true), "file does not exists" , "file does not exists"
#assert_equal Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/Testfiles/largefile.pdf', "abs", "result.xlsx", true), "file size is too large" , "file size is too large"
#assert_equal Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/converter.rb', "abs", "result.xlsx", true), "file is not xml file" , "file is not xml file"
#assert_equal Xmltoxlsx.convert('/home/konrad/Documents/GitHub/xml2list/Testfiles/test5.xml', "abs", "result.xlsx", true), "file is not from SpectraMax iD3" , "file is not from SpectraMax iD3"


# test different input files --> results are compared to expected results in excel files
#filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test1.xml'
#assert_equal Xmltoxlsx.convert(filepath, "abs", "result1.xlsx", true), nil , nil
#filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test2.xml'
#assert_equal Xmltoxlsx.convert(filepath, "abs", "result2.xlsx", true), nil , nil
#filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test3.xml'
#assert_equal Xmltoxlsx.convert(filepath, "abs", "result3.xlsx", true), nil , nil
#filepath = '/home/konrad/Documents/GitHub/xml2list/Testfiles/test4.xml'
#assert_equal Xmltoxlsx.convert(filepath, "abs", "result4.xlsx", true), nil , nil

# missing
# alter already existing excel files
# adding sample_ID
