// This code is taken from https://github.com/sipa/bech32/tree/bdc264f84014c234e908d72026b7b780122be11f/ref/javascript
// Copyright (c) 2017 Pieter Wuille
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
class Bech32 {
  /**
   * @param {SerialBuffer} values
   * @returns {number}
   */
  static polymod(values) {
    let chk = 1;
    
    for (let p = 0; p < values.length; ++p) {
      const top = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ values[p];
      for (let i = 0; i < 5; ++i) {
        if ((top >> i) & 1) {
          chk ^= Bech32.GENERATOR[i];
        }
      }
    }
    return chk;
  };
  
  /**
   * @param {string} hrp
   * @returns {SerialBuffer}
   */
  static hrpExpand(hrp) {
    const ret = [];
    let p;
    for (p = 0; p < hrp.length; ++p) {
      ret.push(hrp.charCodeAt(p) >> 5);
    }
    ret.push(0);
    for (p = 0; p < hrp.length; ++p) {
      ret.push(hrp.charCodeAt(p) & 31);
    }
    return SerialBuffer.from(ret);
  };

  /**
   * @param {string} hrp
   * @param {SerialBuffer} data
   * @returns {boolean}
   */
  static verifyChecksum(hrp, data) {
    // return Bech32.polymod(Buffer.concat([Bech32.hrpExpand(hrp), data])) === Bech32.ENCODING;
    return Bech32.polymod(SerialBuffer.concat([Bech32.hrpExpand(hrp), data])) === Bech32.ENCODING;
  }
  
  /**
   * @param {string} hrp
   * @param {SerialBuffer} data
   * @returns {SerialBuffer}
   */
  static createChecksum(hrp, data) {
    const values = SerialBuffer.concat([Bech32.hrpExpand(hrp), data, SerialBuffer.from([0, 0, 0, 0, 0, 0])]);
    // const values = Buffer.concat([Buffer.from(Bech32.hrpExpand(hrp)), data, Buffer.from([0, 0, 0, 0, 0, 0])]);

    const mod = Bech32.polymod(values) ^ Bech32.ENCODING;
    const ret = [];
    for (let p = 0; p < 6; ++p) {
      ret.push((mod >> (5 * (5 - p))) & 31);
    }
    return SerialBuffer.from(ret);
  }
  
  /**
   * @param {string} hrp
   * @param {SerialBuffer} data
   * @returns {string}
   */
  static bech32Encode(hrp, data) {
    const combined = SerialBuffer.concat([data, Bech32.createChecksum(hrp, data)]);
    let ret = hrp + '1';
    
    for (let p = 0; p < combined.length; ++p) {
      ret += Bech32.CHARSET.charAt(combined[p]);
    }

    return ret;
  };
  
  /**
   * @param {string} bechString
   * @returns {Object|null}
   */
  static bech32Decode(bechString) {
    let p;
    let hasLower = false;
    let hasUpper = false;
    for (p = 0; p < bechString.length; ++p) {
      if (bechString.charCodeAt(p) < 33 || bechString.charCodeAt(p) > 126) {
        return null;
      }
      if (bechString.charCodeAt(p) >= 97 && bechString.charCodeAt(p) <= 122) {
        hasLower = true;
      }
      if (bechString.charCodeAt(p) >= 65 && bechString.charCodeAt(p) <= 90) {
        hasUpper = true;
      }
    }
    if (hasLower && hasUpper) {
      return null;
    }
    bechString = bechString.toLowerCase();
    const pos = bechString.lastIndexOf('1');
    if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) {
      return null;
    }
    const hrp = bechString.substring(0, pos);
    const data = [];
    for (p = pos + 1; p < bechString.length; ++p) {
      const d = Bech32.CHARSET.indexOf(bechString.charAt(p));
      if (d === -1) {
        return null;
      }
      data.push(d);
    }
  
    if (!Bech32.verifyChecksum(hrp, SerialBuffer.from(data))) {
      return null;
    }
  
    return { hrp, data: SerialBuffer.from(data.slice(0, data.length - 6)) };
  };

  /**
   * convertBits
   *
   * groups buffers of a certain width to buffers of the desired width.
   *
   * For example, converts byte buffers to buffers of maximum 5 bit numbers,
   * padding those numbers as necessary. Necessary for encoding addresses as bech32 ones.
   *
   * @param {SerialBuffer} data
   * @param {number} fromWidth
   * @param {number} toWidth
   * @param {boolean} pad
   * @returns {SerialBuffer|null}
   */
  static convertBits(data, fromWidth, toWidth, pad = true) {
    let acc = 0;
    let bits = 0;
    const ret = [];
    const maxv = (1 << toWidth) - 1;
    
    for (let p = 0; p < data.length; ++p) {
      const value = data[p];
      if (value < 0 || value >> fromWidth !== 0) {
        return null;
      }
      acc = (acc << fromWidth) | value;
      bits += fromWidth;
      while (bits >= toWidth) {
        bits -= toWidth;
        ret.push((acc >> bits) & maxv);
      }
    }

    if (pad) {
      if (bits > 0) {
        ret.push((acc << (toWidth - bits)) & maxv);
      }
    } else if (bits >= fromWidth || (acc << (toWidth - bits)) & maxv) {
      return null;
    }

    return SerialBuffer.from(ret);
  };

  /**
   *
   * bech32Encodes a canonical 20-byte address as a bech32 address.
   *
   * The expected format is bc1<address><checksum> where address and checksum
   * are the result of bech32 encoding a Buffer containing the address bytes.
   *
   * @param {SerialBuffer} 20 byte canonical address
   * @returns {string} 38 char bech32 bech32Encoded Feechain address
   */
  static toBech32(address, useHRP = Bech32.HRP) {
    const addrBz = Bech32.convertBits(SerialBuffer.from(address), 8, 5);

    if (addrBz === null) {
      throw new Error('Could not convert byte Buffer to 5-bit Buffer');
    }
    const version = 0; // first byte version same as bitcoin
    return Bech32.bech32Encode(useHRP, SerialBuffer.concat([SerialBuffer.from([version]), addrBz]));
  };

  /**
   * fromBech32Address
   *
   * @param {string} address - a valid bech32 address
   * @returns {SerialBuffer} a canonical 20-byte address
   */
  static fromBech32(address, useHRP = Bech32.HRP) {
    const res = Bech32.bech32Decode(address);

    if (res === null) {
      throw new Error('Invalid bech32 address');
    }

    const { hrp, data } = res;

    if (hrp !== useHRP) {
      throw new Error(`Expected hrp to be ${useHRP} but got ${hrp}`);
    }

    const buf = Bech32.convertBits(data.slice(1), 5, 8, false);

    if (buf === null) {
      throw new Error('Could not convert buffer to bytes');
    }
    
    return new SerialBuffer(buf);
  };

  /**
   *
   * @param {string} raw 
   * @returns {boolean}
   */
  static isBech32Address(raw) {
    return !!raw.match(/^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39}/);
  };
}

Bech32.ENCODING = 1; // bech32: 1, bech32m: 0x2bc830a3
Bech32.HRP = 'bc';
Bech32.CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
Bech32.GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
Class.register(Bech32);
