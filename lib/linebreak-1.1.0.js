/**
 * Three libraries combined into one file. All are MIT licensed. IIFEs and some glue code to inline classes.trie
 * included.
 *
 * - tiny-inflate 1.0.3. MIT License. Copyright (c) 2015-present Devon Govett
 * - unicode-trie 2.0.0. MIT License. Copyright 2018
 * - linebreak 1.1.0. MIT License. Copyright (c) 2014-present Devon Govett
 *
 * Full licenses are positioned ahead of the combined code.
 */

window.LineBreaker = ( () => {
  /*
tiny-inflate
https://github.com/foliojs/tiny-inflate

MIT License

Copyright (c) 2015-present Devon Govett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

   */
/****** START tiny-inflate/index.js ******/
  const inflate = ( () => {
    var TINF_OK = 0;
    var TINF_DATA_ERROR = -3;

    function Tree() {
      this.table = new Uint16Array(16);   /* table of code length counts */
      this.trans = new Uint16Array(288);  /* code -> symbol translation table */
    }

    function Data(source, dest) {
      this.source = source;
      this.sourceIndex = 0;
      this.tag = 0;
      this.bitcount = 0;

      this.dest = dest;
      this.destLen = 0;

      this.ltree = new Tree();  /* dynamic length/symbol tree */
      this.dtree = new Tree();  /* dynamic distance tree */
    }

    /* --------------------------------------------------- *
     * -- uninitialized global data (static structures) -- *
     * --------------------------------------------------- */

    var sltree = new Tree();
    var sdtree = new Tree();

    /* extra bits and base tables for length codes */
    var length_bits = new Uint8Array(30);
    var length_base = new Uint16Array(30);

    /* extra bits and base tables for distance codes */
    var dist_bits = new Uint8Array(30);
    var dist_base = new Uint16Array(30);

    /* special ordering of code length codes */
    var clcidx = new Uint8Array([
      16, 17, 18, 0, 8, 7, 9, 6,
      10, 5, 11, 4, 12, 3, 13, 2,
      14, 1, 15
    ]);

    /* used by tinf_decode_trees, avoids allocations every call */
    var code_tree = new Tree();
    var lengths = new Uint8Array(288 + 32);

    /* ----------------------- *
     * -- utility functions -- *
     * ----------------------- */

    /* build extra bits and base tables */
    function tinf_build_bits_base(bits, base, delta, first) {
      var i, sum;

      /* build bits table */
      for (i = 0; i < delta; ++i) bits[i] = 0;
      for (i = 0; i < 30 - delta; ++i) bits[i + delta] = i / delta | 0;

      /* build base table */
      for (sum = first, i = 0; i < 30; ++i) {
        base[i] = sum;
        sum += 1 << bits[i];
      }
    }

    /* build the fixed huffman trees */
    function tinf_build_fixed_trees(lt, dt) {
      var i;

      /* build fixed length tree */
      for (i = 0; i < 7; ++i) lt.table[i] = 0;

      lt.table[7] = 24;
      lt.table[8] = 152;
      lt.table[9] = 112;

      for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
      for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
      for (i = 0; i < 8; ++i) lt.trans[24 + 144 + i] = 280 + i;
      for (i = 0; i < 112; ++i) lt.trans[24 + 144 + 8 + i] = 144 + i;

      /* build fixed distance tree */
      for (i = 0; i < 5; ++i) dt.table[i] = 0;

      dt.table[5] = 32;

      for (i = 0; i < 32; ++i) dt.trans[i] = i;
    }

    /* given an array of code lengths, build a tree */
    var offs = new Uint16Array(16);

    function tinf_build_tree(t, lengths, off, num) {
      var i, sum;

      /* clear code length count table */
      for (i = 0; i < 16; ++i) t.table[i] = 0;

      /* scan symbol lengths, and sum code length counts */
      for (i = 0; i < num; ++i) t.table[lengths[off + i]]++;

      t.table[0] = 0;

      /* compute offset table for distribution sort */
      for (sum = 0, i = 0; i < 16; ++i) {
        offs[i] = sum;
        sum += t.table[i];
      }

      /* create code->symbol translation table (symbols sorted by code) */
      for (i = 0; i < num; ++i) {
        if (lengths[off + i]) t.trans[offs[lengths[off + i]]++] = i;
      }
    }

    /* ---------------------- *
     * -- decode functions -- *
     * ---------------------- */

    /* get one bit from source stream */
    function tinf_getbit(d) {
      /* check if tag is empty */
      if (!d.bitcount--) {
        /* load next tag */
        d.tag = d.source[d.sourceIndex++];
        d.bitcount = 7;
      }

      /* shift bit out of tag */
      var bit = d.tag & 1;
      d.tag >>>= 1;

      return bit;
    }

    /* read a num bit value from a stream and add base */
    function tinf_read_bits(d, num, base) {
      if (!num)
        return base;

      while (d.bitcount < 24) {
        d.tag |= d.source[d.sourceIndex++] << d.bitcount;
        d.bitcount += 8;
      }

      var val = d.tag & (0xffff >>> (16 - num));
      d.tag >>>= num;
      d.bitcount -= num;
      return val + base;
    }

    /* given a data stream and a tree, decode a symbol */
    function tinf_decode_symbol(d, t) {
      while (d.bitcount < 24) {
        d.tag |= d.source[d.sourceIndex++] << d.bitcount;
        d.bitcount += 8;
      }

      var sum = 0, cur = 0, len = 0;
      var tag = d.tag;

      /* get more bits while code value is above sum */
      do {
        cur = 2 * cur + (tag & 1);
        tag >>>= 1;
        ++len;

        sum += t.table[len];
        cur -= t.table[len];
      } while (cur >= 0);

      d.tag = tag;
      d.bitcount -= len;

      return t.trans[sum + cur];
    }

    /* given a data stream, decode dynamic trees from it */
    function tinf_decode_trees(d, lt, dt) {
      var hlit, hdist, hclen;
      var i, num, length;

      /* get 5 bits HLIT (257-286) */
      hlit = tinf_read_bits(d, 5, 257);

      /* get 5 bits HDIST (1-32) */
      hdist = tinf_read_bits(d, 5, 1);

      /* get 4 bits HCLEN (4-19) */
      hclen = tinf_read_bits(d, 4, 4);

      for (i = 0; i < 19; ++i) lengths[i] = 0;

      /* read code lengths for code length alphabet */
      for (i = 0; i < hclen; ++i) {
        /* get 3 bits code length (0-7) */
        var clen = tinf_read_bits(d, 3, 0);
        lengths[clcidx[i]] = clen;
      }

      /* build code length tree */
      tinf_build_tree(code_tree, lengths, 0, 19);

      /* decode code lengths for the dynamic trees */
      for (num = 0; num < hlit + hdist;) {
        var sym = tinf_decode_symbol(d, code_tree);

        switch (sym) {
          case 16:
            /* copy previous code length 3-6 times (read 2 bits) */
            var prev = lengths[num - 1];
            for (length = tinf_read_bits(d, 2, 3); length; --length) {
              lengths[num++] = prev;
            }
            break;
          case 17:
            /* repeat code length 0 for 3-10 times (read 3 bits) */
            for (length = tinf_read_bits(d, 3, 3); length; --length) {
              lengths[num++] = 0;
            }
            break;
          case 18:
            /* repeat code length 0 for 11-138 times (read 7 bits) */
            for (length = tinf_read_bits(d, 7, 11); length; --length) {
              lengths[num++] = 0;
            }
            break;
          default:
            /* values 0-15 represent the actual code lengths */
            lengths[num++] = sym;
            break;
        }
      }

      /* build dynamic trees */
      tinf_build_tree(lt, lengths, 0, hlit);
      tinf_build_tree(dt, lengths, hlit, hdist);
    }

    /* ----------------------------- *
     * -- block inflate functions -- *
     * ----------------------------- */

    /* given a stream and two trees, inflate a block of data */
    function tinf_inflate_block_data(d, lt, dt) {
      while (1) {
        var sym = tinf_decode_symbol(d, lt);

        /* check for end of block */
        if (sym === 256) {
          return TINF_OK;
        }

        if (sym < 256) {
          d.dest[d.destLen++] = sym;
        } else {
          var length, dist, offs;
          var i;

          sym -= 257;

          /* possibly get more bits from length code */
          length = tinf_read_bits(d, length_bits[sym], length_base[sym]);

          dist = tinf_decode_symbol(d, dt);

          /* possibly get more bits from distance code */
          offs = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);

          /* copy match */
          for (i = offs; i < offs + length; ++i) {
            d.dest[d.destLen++] = d.dest[i];
          }
        }
      }
    }

    /* inflate an uncompressed block of data */
    function tinf_inflate_uncompressed_block(d) {
      var length, invlength;
      var i;

      /* unread from bitbuffer */
      while (d.bitcount > 8) {
        d.sourceIndex--;
        d.bitcount -= 8;
      }

      /* get length */
      length = d.source[d.sourceIndex + 1];
      length = 256 * length + d.source[d.sourceIndex];

      /* get one's complement of length */
      invlength = d.source[d.sourceIndex + 3];
      invlength = 256 * invlength + d.source[d.sourceIndex + 2];

      /* check length */
      if (length !== (~invlength & 0x0000ffff))
        return TINF_DATA_ERROR;

      d.sourceIndex += 4;

      /* copy block */
      for (i = length; i; --i)
        d.dest[d.destLen++] = d.source[d.sourceIndex++];

      /* make sure we start next block on a byte boundary */
      d.bitcount = 0;

      return TINF_OK;
    }

    /* inflate stream from source to dest */
    function tinf_uncompress(source, dest) {
      var d = new Data(source, dest);
      var bfinal, btype, res;

      do {
        /* read final block flag */
        bfinal = tinf_getbit(d);

        /* read block type (2 bits) */
        btype = tinf_read_bits(d, 2, 0);

        /* decompress block */
        switch (btype) {
          case 0:
            /* decompress uncompressed block */
            res = tinf_inflate_uncompressed_block(d);
            break;
          case 1:
            /* decompress block with fixed huffman trees */
            res = tinf_inflate_block_data(d, sltree, sdtree);
            break;
          case 2:
            /* decompress block with dynamic huffman trees */
            tinf_decode_trees(d, d.ltree, d.dtree);
            res = tinf_inflate_block_data(d, d.ltree, d.dtree);
            break;
          default:
            res = TINF_DATA_ERROR;
        }

        if (res !== TINF_OK)
          throw new Error('Data error');

      } while (!bfinal);

      if (d.destLen < d.dest.length) {
        if (typeof d.dest.slice === 'function')
          return d.dest.slice(0, d.destLen);
        else
          return d.dest.subarray(0, d.destLen);
      }

      return d.dest;
    }

    /* -------------------- *
     * -- initialization -- *
     * -------------------- */

    /* build fixed huffman trees */
    tinf_build_fixed_trees(sltree, sdtree);

    /* build extra bits and base tables */
    tinf_build_bits_base(length_bits, length_base, 4, 3);
    tinf_build_bits_base(dist_bits, dist_base, 2, 1);

    /* fix a special case */
    length_bits[28] = 0;
    length_base[28] = 258;
/****** END tiny-inflate/index.js ******/

    return tinf_uncompress;
  } )();

  /*
unicode-trie
https://github.com/foliojs/unicode-trie

Copyright 2018

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  */

  /****** START unicode-trie/swap.js ******/
  const swap32LE = ( () => {
    const isBigEndian = (new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x12);

    const swap = (b, n, m) => {
      let i = b[n];
      b[n] = b[m];
      b[m] = i;
    };

    const swap32 = array => {
      const len = array.length;
      for (let i = 0; i < len; i += 4) {
        swap(array, i, i + 3);
        swap(array, i + 1, i + 2);
      }
    };

    const swap32LE = array => {
      if (isBigEndian) {
        swap32(array);
      }
    };

    return swap32LE;
  } )();
  /****** END unicode-trie/swap.js ******/

  /****** START unicode-trie/index.js ******/
  const UnicodeTrie = ( () => {

    // Shift size for getting the index-1 table offset.
    const SHIFT_1 = 6 + 5;

    // Shift size for getting the index-2 table offset.
    const SHIFT_2 = 5;

    // Difference between the two shift sizes,
    // for getting an index-1 offset from an index-2 offset. 6=11-5
    const SHIFT_1_2 = SHIFT_1 - SHIFT_2;

    // Number of index-1 entries for the BMP. 32=0x20
    // This part of the index-1 table is omitted from the serialized form.
    const OMITTED_BMP_INDEX_1_LENGTH = 0x10000 >> SHIFT_1;

    // Number of entries in an index-2 block. 64=0x40
    const INDEX_2_BLOCK_LENGTH = 1 << SHIFT_1_2;

    // Mask for getting the lower bits for the in-index-2-block offset. */
    const INDEX_2_MASK = INDEX_2_BLOCK_LENGTH - 1;

    // Shift size for shifting left the index array values.
    // Increases possible data size with 16-bit index values at the cost
    // of compactability.
    // This requires data blocks to be aligned by DATA_GRANULARITY.
    const INDEX_SHIFT = 2;

    // Number of entries in a data block. 32=0x20
    const DATA_BLOCK_LENGTH = 1 << SHIFT_2;

    // Mask for getting the lower bits for the in-data-block offset.
    const DATA_MASK = DATA_BLOCK_LENGTH - 1;

    // The part of the index-2 table for U+D800..U+DBFF stores values for
    // lead surrogate code _units_ not code _points_.
    // Values for lead surrogate code _points_ are indexed with this portion of the table.
    // Length=32=0x20=0x400>>SHIFT_2. (There are 1024=0x400 lead surrogates.)
    const LSCP_INDEX_2_OFFSET = 0x10000 >> SHIFT_2;
    const LSCP_INDEX_2_LENGTH = 0x400 >> SHIFT_2;

    // Count the lengths of both BMP pieces. 2080=0x820
    const INDEX_2_BMP_LENGTH = LSCP_INDEX_2_OFFSET + LSCP_INDEX_2_LENGTH;

    // The 2-byte UTF-8 version of the index-2 table follows at offset 2080=0x820.
    // Length 32=0x20 for lead bytes C0..DF, regardless of SHIFT_2.
    const UTF8_2B_INDEX_2_OFFSET = INDEX_2_BMP_LENGTH;
    const UTF8_2B_INDEX_2_LENGTH = 0x800 >> 6;  // U+0800 is the first code point after 2-byte UTF-8

    // The index-1 table, only used for supplementary code points, at offset 2112=0x840.
    // Variable length, for code points up to highStart, where the last single-value range starts.
    // Maximum length 512=0x200=0x100000>>SHIFT_1.
    // (For 0x100000 supplementary code points U+10000..U+10ffff.)
    //
    // The part of the index-2 table for supplementary code points starts
    // after this index-1 table.
    //
    // Both the index-1 table and the following part of the index-2 table
    // are omitted completely if there is only BMP data.
    const INDEX_1_OFFSET = UTF8_2B_INDEX_2_OFFSET + UTF8_2B_INDEX_2_LENGTH;

    // The alignment size of a data block. Also the granularity for compaction.
    const DATA_GRANULARITY = 1 << INDEX_SHIFT;

    class UnicodeTrie {
      constructor(data) {
        const isBuffer = (typeof data.readUInt32BE === 'function') && (typeof data.slice === 'function');

        if (isBuffer || data instanceof Uint8Array) {
          // read binary format
          let uncompressedLength;
          if (isBuffer) {
            this.highStart = data.readUInt32LE(0);
            this.errorValue = data.readUInt32LE(4);
            uncompressedLength = data.readUInt32LE(8);
            data = data.slice(12);
          } else {
            const view = new DataView(data.buffer);
            this.highStart = view.getUint32(0, true);
            this.errorValue = view.getUint32(4, true);
            uncompressedLength = view.getUint32(8, true);
            data = data.subarray(12);
          }

          // double inflate the actual trie data
          data = inflate(data, new Uint8Array(uncompressedLength));
          data = inflate(data, new Uint8Array(uncompressedLength));

          // swap bytes from little-endian
          swap32LE(data);

          this.data = new Uint32Array(data.buffer);

        } else {
          // pre-parsed data
          ({ data: this.data, highStart: this.highStart, errorValue: this.errorValue } = data);
        }
      }

      get(codePoint) {
        let index;
        if ((codePoint < 0) || (codePoint > 0x10ffff)) {
          return this.errorValue;
        }

        if ((codePoint < 0xd800) || ((codePoint > 0xdbff) && (codePoint <= 0xffff))) {
          // Ordinary BMP code point, excluding leading surrogates.
          // BMP uses a single level lookup.  BMP index starts at offset 0 in the index.
          // data is stored in the index array itself.
          index = (this.data[codePoint >> SHIFT_2] << INDEX_SHIFT) + (codePoint & DATA_MASK);
          return this.data[index];
        }

        if (codePoint <= 0xffff) {
          // Lead Surrogate Code Point.  A Separate index section is stored for
          // lead surrogate code units and code points.
          //   The main index has the code unit data.
          //   For this function, we need the code point data.
          index = (this.data[LSCP_INDEX_2_OFFSET + ((codePoint - 0xd800) >> SHIFT_2)] << INDEX_SHIFT) + (codePoint & DATA_MASK);
          return this.data[index];
        }

        if (codePoint < this.highStart) {
          // Supplemental code point, use two-level lookup.
          index = this.data[(INDEX_1_OFFSET - OMITTED_BMP_INDEX_1_LENGTH) + (codePoint >> SHIFT_1)];
          index = this.data[index + ((codePoint >> SHIFT_2) & INDEX_2_MASK)];
          index = (index << INDEX_SHIFT) + (codePoint & DATA_MASK);
          return this.data[index];
        }

        return this.data[this.data.length - DATA_GRANULARITY];
      }
    }
    /****** END unicode-trie/index.js ******/

    return UnicodeTrie;
  } )();

  /*
linebreak
https://github.com/foliojs/linebreak

MIT License

Copyright (c) 2014-present Devon Govett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
   */

  // Some glue to avoid the file read, and get it into a proper Uint8Array desired by UnicodeTrie
  /****** START linebreak/src/classes.trie ******/
  const base64Data = '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';
  /****** END linebreak/src/classes.trie ******/

  // Custom conversion code
  const toTypedArray = base64 => {
    const binary = window.atob( base64 );
    const result = new Uint8Array( binary.length );
    for ( var i = 0; i < binary.length; i++ ) {
      result[ i ] = binary.charCodeAt( i );
    }
    return result;
  }

  const data = toTypedArray( base64Data );
  // line from linebreak/src/linebreaker.js
  const classTrie = new UnicodeTrie( data );

  /****** START linebreak/src/classes.js ******/
  // The following break classes are handled by the pair table
  const OP = 0;   // Opening punctuation
  const CL = 1;   // Closing punctuation
  const CP = 2;   // Closing parenthesis
  const QU = 3;   // Ambiguous quotation
  const GL = 4;   // Glue
  const NS = 5;   // Non-starters
  const EX = 6;   // Exclamation/Interrogation
  const SY = 7;   // Symbols allowing break after
  const IS = 8;   // Infix separator
  const PR = 9;   // Prefix
  const PO = 10;  // Postfix
  const NU = 11;  // Numeric
  const AL = 12;  // Alphabetic
  const HL = 13;  // Hebrew Letter
  const ID = 14;  // Ideographic
  const IN = 15;  // Inseparable characters
  const HY = 16;  // Hyphen
  const BA = 17;  // Break after
  const BB = 18;  // Break before
  const B2 = 19;  // Break on either side (but not pair)
  const ZW = 20;  // Zero-width space
  const CM = 21;  // Combining marks
  const WJ = 22;  // Word joiner
  const H2 = 23;  // Hangul LV
  const H3 = 24;  // Hangul LVT
  const JL = 25;  // Hangul L Jamo
  const JV = 26;  // Hangul V Jamo
  const JT = 27;  // Hangul T Jamo
  const RI = 28;  // Regional Indicator
  const EB = 29;  // Emoji Base
  const EM = 30;  // Emoji Modifier
  const ZWJ = 31; // Zero Width Joiner
  const CB = 32;  // Contingent break

  // The following break classes are not handled by the pair table
  const AI = 33;  // Ambiguous (Alphabetic or Ideograph)
  const BK = 34;  // Break (mandatory)
  const CJ = 35;  // Conditional Japanese Starter
  const CR = 36;  // Carriage return
  const LF = 37;  // Line feed
  const NL = 38;  // Next line
  const SA = 39;  // South-East Asian
  const SG = 40;  // Surrogates
  const SP = 41;  // Space
  const XX = 42;  // Unknown

  const DI_BRK = 0; // Direct break opportunity
  const IN_BRK = 1; // Indirect break opportunity
  const CI_BRK = 2; // Indirect break opportunity for combining marks
  const CP_BRK = 3; // Prohibited break for combining marks
  const PR_BRK = 4; // Prohibited break
  /****** END linebreak/src/classes.js ******/

  /****** START linebreak/src/pairs.js ******/
  // Based on example pair table from https://www.unicode.org/reports/tr14/tr14-37.html#Table2
  // - ZWJ special processing for LB8a of Revision 41
  // - CB manually added as per Rule LB20
  // - CL, CP, NS, SY, IS, PR, PO, HY, BA, B2 and RI manually adjusted as per LB22 of Revision 45
  const pairTable = [
    //OP   , CL    , CP    , QU    , GL    , NS    , EX    , SY    , IS    , PR    , PO    , NU    , AL    , HL    , ID    , IN    , HY    , BA    , BB    , B2    , ZW    , CM    , WJ    , H2    , H3    , JL    , JV    , JT    , RI    , EB    , EM    , ZWJ   , CB
    [PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, CP_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK], // OP
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // CL
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // CP
    [PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK], // QU
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK], // GL
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // NS
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // EX
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // SY
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // IS
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK], // PR
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // PO
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // NU
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // AL
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // HL
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // ID
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // IN
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, DI_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // HY
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, DI_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // BA
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK], // BB
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, PR_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // B2
    [DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], // ZW
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // CM
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK], // WJ
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // H2
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // H3
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // JL
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // JV
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // JT
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // RI
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK], // EB
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // EM
    [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], // ZWJ
    [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, DI_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK]  // CB
  ];
  /****** END linebreak/src/pairs.js ******/

  /****** START linebreak/src/linebreaker.js ******/
  const mapClass = function (c) {
    switch (c) {
      case AI:
        return AL;

      case SA:
      case SG:
      case XX:
        return AL;

      case CJ:
        return NS;

      default:
        return c;
    }
  };

  const mapFirst = function (c) {
    switch (c) {
      case LF:
      case NL:
        return BK;

      case SP:
        return WJ;

      default:
        return c;
    }
  };

  class Break {
    constructor(position, required = false) {
      this.position = position;
      this.required = required;
    }
  }

  class LineBreaker {
    constructor(string) {
      this.string = string;
      this.pos = 0;
      this.lastPos = 0;
      this.curClass = null;
      this.nextClass = null;
      this.LB8a = false;
      this.LB21a = false;
      this.LB30a = 0;
    }

    nextCodePoint() {
      const code = this.string.charCodeAt(this.pos++);
      const next = this.string.charCodeAt(this.pos);

      // If a surrogate pair
      if ((0xd800 <= code && code <= 0xdbff) && (0xdc00 <= next && next <= 0xdfff)) {
        this.pos++;
        return ((code - 0xd800) * 0x400) + (next - 0xdc00) + 0x10000;
      }

      return code;
    }

    nextCharClass() {
      return mapClass(classTrie.get(this.nextCodePoint()));
    }

    getSimpleBreak() {
      // handle classes not handled by the pair table
      switch (this.nextClass) {
        case SP:
          return false;

        case BK:
        case LF:
        case NL:
          this.curClass = BK;
          return false;

        case CR:
          this.curClass = CR;
          return false;
      }

      return null;
    }

    getPairTableBreak(lastClass) {
      // if not handled already, use the pair table
      let shouldBreak = false;
      switch (pairTable[this.curClass][this.nextClass]) {
        case DI_BRK: // Direct break
          shouldBreak = true;
          break;

        case IN_BRK: // possible indirect break
          shouldBreak = lastClass === SP;
          break;

        case CI_BRK:
          shouldBreak = lastClass === SP;
          if (!shouldBreak) {
            shouldBreak = false;
            return shouldBreak;
          }
          break;

        case CP_BRK: // prohibited for combining marks
          if (lastClass !== SP) {
            return shouldBreak;
          }
          break;

        case PR_BRK:
          break;
      }

      if (this.LB8a) {
        shouldBreak = false;
      }

      // Rule LB21a
      if (this.LB21a && (this.curClass === HY || this.curClass === BA)) {
        shouldBreak = false;
        this.LB21a = false;
      } else {
        this.LB21a = (this.curClass === HL);
      }

      // Rule LB30a
      if (this.curClass === RI) {
        this.LB30a++;
        if (this.LB30a == 2 && (this.nextClass === RI)) {
          shouldBreak = true;
          this.LB30a = 0;
        }
      } else {
        this.LB30a = 0;
      }

      this.curClass = this.nextClass;

      return shouldBreak;
    }

    nextBreak() {
      // get the first char if we're at the beginning of the string
      if (this.curClass == null) {
        let firstClass = this.nextCharClass();
        this.curClass = mapFirst(firstClass);
        this.nextClass = firstClass;
        this.LB8a = (firstClass === ZWJ);
        this.LB30a = 0;
      }

      while (this.pos < this.string.length) {
        this.lastPos = this.pos;
        const lastClass = this.nextClass;
        this.nextClass = this.nextCharClass();

        // explicit newline
        if ((this.curClass === BK) || ((this.curClass === CR) && (this.nextClass !== LF))) {
          this.curClass = mapFirst(mapClass(this.nextClass));
          return new Break(this.lastPos, true);
        }

        let shouldBreak = this.getSimpleBreak();

        if (shouldBreak === null) {
          shouldBreak = this.getPairTableBreak(lastClass);
        }

        // Rule LB8a
        this.LB8a = (this.nextClass === ZWJ);

        if (shouldBreak) {
          return new Break(this.lastPos);
        }
      }

      if (this.lastPos < this.string.length) {
        this.lastPos = this.string.length;
        return new Break(this.string.length);
      }

      return null;
    }
  }

  /****** END linebreak/src/linebreaker.js ******/

  return LineBreaker;
} )();
