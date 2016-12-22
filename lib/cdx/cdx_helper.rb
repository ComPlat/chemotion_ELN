module Cdx
  module Common
    def pt(input)
      hex = "#{"%04X" % input.to_i }"
      little_endian(hex)
    end

    def little_endian(hex)
      hex.scan(/../).reverse.join(" ") + " "
    end

    def z_index(root)
      target = root["Z"]
      hex = "#{"%04X" % root["Z"].to_i}"
      target ? "0A 00 02 00 " + little_endian(hex) : ""
    end

    def ending
      CdxStatic.ending
    end
  end

  class CdxBasic
    include Common
    attr_reader :root, :id
    def initialize(root, id)
      @root = root
      @id = id
    end
  end

  class CdxNode < CdxBasic
    def content
      start + id + z_index(root) + position + element + ending
    end

    private
    def start
      "04 80 "
    end

    def position
      target = root["p"]
      str = ""
      if target
        x, y = target.split(" ")
        str += "00 02 08 00 "
        str += "00 00 #{pt(y)}"
        str += "00 00 #{pt(x)}"
      end
      return str
    end

    def element
      target = root["Element"]
      target ? "02 04 02 00 #{"%02X" % target.to_i}  00 " : ""
    end
  end

  class CdxBond < CdxBasic
    def content
      start + id + z_index(root) + order + begin_pt + end_pt + ending
    end

    private
    def start
      "05 80 "
    end

    def begin_pt
      target = root["B"]
      target ? "04 06 04 00 #{"%02X" % target.to_i} 00 00 00 " : ""
    end

    def end_pt
      target = root["E"]
      target ? "05 06 04 00 #{"%02X" % target.to_i} 00 00 00 " : ""
    end

    def order
      order = root["Order"]
      order_hex = "01 00 "
      if order == "2"
        order_hex = "02 00 "
      elsif order == "3"
        order_hex = "04 00 "
      elsif order == "4"
        order_hex = "08 00 "
      elsif order == "5"
        order_hex = "10 00 "
      elsif order == "6"
        order_hex = "20 00 "
      elsif order == "6"
        order_hex = "20 00 "
      elsif order == "0.5"
        order_hex = "40 00 "
      elsif order == "1.5"
        order_hex = "80 00 "
      elsif order == "2.5"
        order_hex = "00 01 "
      elsif order == "3.5"
        order_hex = "00 02 "
      elsif order == "4.5"
        order_hex = "00 04 "
      elsif order == "5.5"
        order_hex = "00 08 "
      elsif order == "dative"
        order_hex = "00 10 "
      elsif order == "ionic"
        order_hex = "00 20 "
      elsif order == "hydrogen"
        order_hex = "00 40 "
      elsif order == "threecenter"
        order_hex = "00 80 "
      end
      "00 06 02 00 " + order_hex
    end
  end

  class CdxArrow < CdxBasic
    def content
      start + id + prop_1 + head + tail + prop_2 + ending
    end

    private
    def start
      "07 80 "
    end

    def head
      head3D = root["Head3D"]
      x, y, z = coord_3d(head3D)
      "07 02 0c 00 " + "00 00 #{pt(x)} " + "00 00 #{pt(y)} " + "00 00 #{pt(z)} "
    end

    def tail
      tail3D = root["Tail3D"]
      x, y, z = coord_3d(tail3D)
      "08 02 0c 00 " + "00 00 #{pt(x)} " + "00 00 #{pt(y)} " + "00 00 #{pt(z)} "
    end

    def coord_3d(input)
      return input.split(" ").map(&:to_i)
    end

    def prop_1
       "13 00 04 00 ac 00 00 00 04 02 10 00 00 00 a7 00 \
        00 00 9c 00 00 00 a9 00 00 00 9d 00 0a 00 02 00 \
        01 00 00 0a 02 00 01 00 02 0a 02 00 02 00 20 0a \
        02 00 e8 03 00 00 21 80 ac 00 00 00 04 02 10 00 \
        c1 c6 a6 00 83 8d 9b 00 55 55 a9 00 aa aa 9d 00 \
        0a 00 02 00 01 00 37 0a 02 00 01 00 2f 0a 02 00 \
        01 00 35 0a 02 00 02 00 20 0a 02 00 e8 03 30 0a \
        02 00 6b 03 31 0a 02 00 fa 00 "
    end

    def prop_2
       "0d 02 0c 00 00 80 ea 00 00 80 fb 00 00 00 00 00 \
        0e 02 0c 00 6e bc ec 00 00 80 fb 00 00 00 00 00 \
        0f 02 0c 00 00 80 ea 00 6e bc fd 00 00 00 00 00 "
    end
  end

  class CdxStr < CdxBasic
    def content
      has_text = root.children.children[0].present?
      has_text ? start + id + position_1 + position_2 + prop + context + ending : ""
    end

    private
    def start
      "06 80 "
    end

    def position_1
      x, y = root["p"].split(" ").map(&:to_i)
      "00 02 08 00 " + "00 00 #{pt(y)} " + "00 00 #{pt(x)} " + "04 02 10 00 "
    end

    def position_2
      x, y = root["p"].split(" ").map(&:to_i)
      "11 f1 d6 00 " + "00 00 #{pt(x)} " + "00 00 #{pt(y)} " + "80 c4 b2 00 "
    end

    def prop
       "0a 00 02 00 01 00 10 00 38 00 00 00 43 68 65 6d \
        69 63 61 6c 20 49 6e 74 65 72 70 72 65 74 61 74 \
        69 6f 6e 20 69 73 20 6e 6f 74 20 70 6f 73 73 69 \
        62 6c 65 20 66 6f 72 20 74 68 69 73 20 6c 61 62 \
        65 6c 07 07 02 00 00 00 02 07 02 00 00 00 00 07 "
    end

    def context
      target = root.children.children[0].content
      text_hex = target.chars.map do |char|
        "%02X" % char.ord
      end.join(" ") + " "
      text_count(target) + text_hex
    end

    def text_count(target)
      count_hex = "#{"%04X" % (target.length + 12)}"
      text_count = little_endian(count_hex) + "01 00 00 00 14 00 00 00 f0 00 00 00 "
    end
  end

  module CdxStatic
    def self.init
       "56 6A 43 44 30 31 30 30 04 03 02 01 00 00 00 00 \
        00 00 00 00 00 00 00 00 00 00 00 00 03 00 0E 00 \
        00 00 43 68 65 6D 44 72 61 77 20 37 2E 30 08 00 \
        0A 00 00 00 74 65 73 74 2E 63 64 78 00 03 32 00 \
        08 00 FF FF FF FF FF FF 00 00 00 00 00 00 FF FF \
        00 00 00 00 FF FF FF FF 00 00 00 00 FF FF 00 00 \
        00 00 FF FF FF FF 00 00 00 00 FF FF FF FF 00 00 \
        FF FF 01 09 08 00 00 40 EC 00 00 C0 EA 00 02 09 \
        08 00 00 40 FD 01 00 00 25 02 02 08 10 00 00 00 \
        24 00 00 00 24 00 00 00 24 00 00 00 24 00 3A 04 \
        01 00 01 3B 04 01 00 00 3C 04 01 00 00 0C 06 01 \
        00 01 0D 06 01 00 00 06 07 02 00 00 00 07 07 02 \
        00 01 00 03 08 04 00 00 00 78 00 05 08 04 00 00 \
        00 1E 00 06 08 04 00 00 00 04 00 07 08 04 00 00 \
        00 01 00 08 08 04 00 00 00 02 00 09 08 04 00 33 \
        B3 02 00 0C 08 01 00 00 0D 08 00 00 23 08 01 00 \
        05 04 08 02 00 78 00 0A 08 08 00 03 00 60 00 C8 \
        00 03 00 0B 08 08 00 04 00 00 00 F0 00 03 00 00 \
        08 78 00 00 03 00 00 02 58 02 58 00 00 00 00 18 \
        F5 13 19 FF 9B FF 94 19 63 13 80 03 67 05 28 03 \
        FC 00 02 00 00 02 58 02 58 00 00 00 00 18 F5 13 \
        19 00 01 00 64 00 64 00 00 00 01 00 01 01 01 00 \
        00 00 01 27 0F 00 01 00 01 00 00 00 00 00 00 00 \
        00 00 00 00 00 00 02 00 19 01 90 00 00 00 00 00 \
        60 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00 \
        00 00 00 00 00 00 00 00 00 00 00 04 02 10 00 00 \
        C0 96 00 C2 D7 74 00 2B 0C AF 00 3D 28 B4 00 00 \
        01 24 00 00 00 02 00 03 00 E4 04 05 00 41 72 69 \
        61 6C 04 00 E4 04 0F 00 54 69 6D 65 73 20 4E 65 \
        77 20 52 6F 6D 61 6E "
    end

    def self.page
       "01 80 01 00 00 00 04 02 10 \
        00 00 c0 96 00 c2 d7 74 00 2b 0c af 00 3d 28 b4 \
        00 0f 08 02 00 01 00 10 08 02 00 01 00 16 08 04 \
        00 00 00 24 00 18 08 04 00 00 00 24 00 19 08 00 \
        00 "
    end

    def self.fragment
       "03 80 08 00 00 00 04 02 10 00 00 40 98 00 c2 \
        57 76 00 2b 8c ad 00 3d a8 b2 00 "
    end

    def self.ending
      "00 00 "
    end
  end
end
