<html>
<head></head>
<body>
	<select id="fileSelector">
		<option value="" selected="true" disabled="disabled">Choose a file</option>
		<?php
			function getFileList($dir, $recurse=false) {
				$retval = array();

				// add trailing slash if missing
				if(substr($dir, -1) != "/") $dir .= "/";

				// open pointer to directory and read list of files
				$d = @dir($dir) or die("getFileList: Failed opening directory $dir for reading");
				while(false !== ($entry = $d->read())) {
					// skip hidden files
					if($entry[0] == ".") continue;
					if(is_dir("$dir$entry")) {
						$retval[] = array(
							"name" => "$dir$entry/",
							"type" => filetype("$dir$entry"),
							"size" => 0,
							"lastmod" => filemtime("$dir$entry")
						);
						if($recurse && is_readable("$dir$entry/")) {
							$retval = array_merge($retval, getFileList("$dir$entry/", true));
						}
					} elseif(is_readable("$dir$entry")) {
						$retval[] = array(
							"name" => "$dir$entry",
							"size" => filesize("$dir$entry"),
							"lastmod" => filemtime("$dir$entry")
						);
					}
				}
				$d->close();

				return $retval;
			}

			$files = getFileList("../fonts", true);
			foreach( $files as $file ){
				$filename = $file['name'];
				if ($filename != '.' && $filename != '..' && substr($filename, -1) != '/' ) {
					echo '<option value="' . $filename . '">' . str_replace('../fonts/','',$filename) . '</option>';
				}
			}
		?>
	</select>



<div id="font-container"></div>

<script>

document.getElementById('fileSelector').onchange = function() {
	var elem = (typeof this.selectedIndex === "undefined" ? window.event.srcElement : this);
	var value = elem.value || elem.options[elem.selectedIndex].value;
	loadFileFromUrl( value );
}



function createContext(width, height, charNum) {
    var canvas = document.createElement('canvas');
	canvas.setAttribute('id', 'char'+charNum);
	document.body.appendChild(canvas);
    canvas.width = width;
    canvas.height = height;
    canvas.style.marginBottom = '5px';
	var context = canvas.getContext("2d");
	context.transform(1, 0, 0, -1, 0, canvas.height)
	context = canvas.getContext("2d");
	context.fillStyle = 'rgb(200,200,200)';
	context.rect( 0, 0, width, height );
	context.fill();
    return context;
}


/** @param {string=} message */
function assert(condition, message) {
    message = message || "Assertion failed";
    if (!condition) {
        alert(message);
        throw message;
    }
}


function decToBinStr( byte1 ) {
	var bits1 = Number(byte1).toString(2);
	bits1 = '00000000'.substr(bits1.length) + bits1;
	return bits1;
}

// I'm sure there's a better way to convert one's complement binary strings
// into decimal numbers than what I'm doing below. But it's working for now.
// Adapted from: Code Golf, http://codegolf.stackexchange.com/a/30371
function signedBinToDec(bits1) {
	// First bit signifies positive or negative
	var sign = bits1[0];
	// Remaining bits are the number
	var val = bits1.slice(1);
	// If negative, then need to flip all the bits to get one's complement
	if (sign == '1') { val = val.replace(/./g,x=>x^1); }
	// Convert binary string to decimal
	var num = parseInt(val,2);
	// If it should be negative, make negative
	if (sign == '1') { num *= -1 }
	return num;
}


/** @constructor */
// JoshReader obj allows us to seek over the arrayBuffer
function JoshReader(arrayBuffer)
{
    assert(arrayBuffer instanceof ArrayBuffer);
    this.pos = 0;
    this.data = new DataView(arrayBuffer);
}

JoshReader.prototype = {
    seek: function(pos) {
        assert(pos >=0 && pos <= this.data.byteLength);
        var oldPos = this.pos;
        this.pos = pos;
        return oldPos;
    },

    tell: function() {
        return this.pos;
    },

    getUint8: function() {
        assert(this.pos < this.data.byteLength);
        return this.data.getUint8(this.pos++);
    },

    getUint16: function() {
        assert(this.pos < this.data.byteLength);
        var ret = this.data.getUint16(this.pos,true);
		this.pos += 2;
		return ret;
    },

    getUint32: function() {
        assert(this.pos < this.data.byteLength);
        var ret = this.data.getUint32(this.pos,true);
		this.pos += 4;
		return ret;
    },

    getInt16: function() {
        assert(this.pos < this.data.byteLength);
        var ret = this.data.getInt16(this.pos,true);
		this.pos += 2;
		return ret;
    }, 

    getInt32: function() {
        assert(this.pos < this.data.byteLength);
        var ret = this.data.getInt32(this.pos,true);
		this.pos += 4;
		return ret;
    }, 

    getFword: function() {
        return this.getInt16();
    },

    get2Dot14: function() {
        return this.getInt16() / (1 << 14);
    },

    getFixed: function() {
        return this.getInt32() / (1 << 16);
    },

    getString: function(length) {
        var result = "";
        for(var i = 0; i < length; i++) {
            result += String.fromCharCode(this.getUint8());
        }
        return result;
    }
};





function ShowBgiFile(arrayBuffer) {
	// INFORMATION ON PARSING BORLAND CHR FONTS CAME FROM:
	// * The file `fdv_bgi.h` in the GRX graphics library
	// * The file `main.c` in the chrcvt package in the cc65 C compiler
	//    - https://github.com/SvenMichaelKlose/cc65g/blob/master/src/chrcvt/main.c
	// * FileFormat.info: 
	//    - http://www.fileformat.info/format/borland-chr/corion.htm
	// * Post in Delphi Groups:
	//    - http://www.delphigroups.info/2/03/13720.html

	var f = new JoshReader(arrayBuffer);

	// This is the ASCII copyright message
	var ch, msg;
	while ( ch != 26 ) {
		ch = f.getUint8();
		msg += String.fromCharCode(ch);
	}
	console.log(msg);


	// FONT **FILE** HEADER

	// GR_int16u header_size  PACKED; /* Version 2.0 Header Format */
	// char      font_name[4] PACKED; /* Font Internal Name */
	// GR_int16u font_size    PACKED; /* file size in bytes */
	// GR_int8u  font_major   PACKED; /* Driver Version Information */
	// GR_int8u  font_minor   PACKED;
	// GR_int8u  bgi_major    PACKED; /* BGI Revision Information */
	// GR_int8u  bgi_minor    PACKED;

	var header_size = f.getUint16();
	var font_name = f.getString(4);
	var font_size = f.getUint16();
	var font_major = f.getUint8();
	var font_minor = f.getUint8();
	var bgi_major = f.getUint8();
	var bgi_minor = f.getUint8();

	console.log( 'header_size' + '\t' + header_size );
	console.log( 'font_name' + '\t' + font_name );
	console.log( 'font_size' + '\t' + font_size );
	console.log( 'font_major' + '\t' + font_major );
	console.log( 'font_minor' + '\t' + font_minor );
	console.log( 'bgi_major' + '\t' + bgi_major );
	console.log( 'bgi_minor' + '\t' + bgi_minor );

	// Seek to the FONT header (usually at position 128) and 
	// make sure it contains the signature byte: ascii 43 or '+' 

	console.log( '----------------------' );
	console.log( 'Seeking to position ' + header_size );
	f.seek( header_size );

	// FONT **FONT** HEADER
	
	// char       sig          PACKED; /* SIGNATURE byte */
	// GR_int16u  nchrs        PACKED; /* number of characters in file */
	// char       unused1      PACKED; /* Currently Undefined */
	// GR_int8u   firstch      PACKED; /* ascii value of first character in file */
	// GR_int16u  cdefs        PACKED; /* offset to char stroke definitions */
	// GR_int8u   scan_flag    PACKED; /* (!= 0) -> set is scanable */
	// char       org_to_cap   PACKED; /* Height from origin to top of capital */
	// char       org_to_base  PACKED; /* Height from origin to baseline */
	// char       org_to_dec   PACKED; /* Height from origin to bot of descender */
	// char       unused2[5]   PACKED; /* Currently undefined */

	var sig = f.getUint8();
	assert( sig == 43 );
	var nchrs = f.getUint16();
	var unused1 = f.getString(1);
	var firstch = f.getUint8();
	var cdefs = f.getUint16();
	var scan_flag = f.getUint8();		// All these fonts have scan_flag set to 0
	var org_to_cap = f.getUint8();
	var org_to_base = f.getUint8();
	var org_to_dec = f.getUint8();		// This number is signed, so need to convert.
	org_to_dec =  signedBinToDec( decToBinStr( org_to_dec ) );
	var unused2 = f.getString(5);


	console.log( 'sig' + '\t' + sig );
	console.log( 'nchrs' + '\t' + nchrs );
	console.log( 'unused1' + '\t' + unused1 );
	console.log( 'firstch' + '\t' + firstch );
	console.log( 'cdefs' + '\t' + cdefs );
	console.log( 'scan_flag' + '\t' + scan_flag );
	console.log( 'org_to_cap' + '\t' + org_to_cap );
	console.log( 'org_to_base' + '\t' + org_to_base );
	console.log( 'org_to_dec' + '\t' + org_to_dec );

	console.log( 'unused2' + '\t' + unused2 );



	// TABLES

	// The Delphi Groups post indicates these tables are tied to 96h.
	// But that is definitely wrong. The Borland doc and FileFormat info say 90h.
	// 90h      Table of offsets to individual character definitions (one word each)
	// 90h+2n   Table of character widths (one byte each) 
	// 90h+3n   Start of character definitions 

	// NOTES:  h means hex.  n = numchar.  90h = 144.   96h = 150.
	// Also, (90h + 3*numchars) usually equals (cdefs + header_size).

	// Compile list of offsets to individual character definitions
	var offsets = []
	for (var n=0; n<nchrs; n++) {
		offsets.push( f.getUint16() );
	}

	// Compile list of individual character widths
	var widths = []
	for (var n=0; n<nchrs; n++) {
		widths.push( f.getUint8() );
	}




	// CHARACTER DEFINITIONS

	// Character definitions consist of a series of words. Each word contains
	// a two-bit opcode and an (x,y) coordinate:
	
	// Byte 1          7   6   5   4   3   2   1   0     bit #
	//                op1  <seven bit signed X coord>
	// 
	// Byte 2          7   6   5   4   3   2   1   0     bit #
	//                op2  <seven bit signed Y coord>
	//
	// Opcodes:
	// op1=0  op2=0  End of character definition.
	// op1=1  op2=0  Move the pointer to (x,y)
	// op1=1  op2=1  Draw from current pointer to (x,y)
	// op1=0  op2=1  Scan. (I haven't been able to figure out what this is for)

	// After experimenting, I found the seven-bit signed integer is signed
	// using ONE'S COMPLEMENT form -- NOT two's complement.


	// As noted above, character definitions begin at 90h + 3*n. 90h = 144.
 	var chardefs = 3*nchrs + 144;
	var xVals = [];
	var yVals = [];
	for (var n=0; n<nchrs; n++) {
		//console.log( offsets[n] + chardefs );
		//console.log( 'CHAR: ' + String.fromCharCode(n+firstch) );
		var charW = widths[n];
		var charH = Math.abs( org_to_cap ) + Math.abs( org_to_dec );
		var scale = 1;

		// Create a new canvas and context for this character.
		// Also, give it an ID corresponding to its ASCII value
		// which is firstch + n.
		var context = createContext( charW*scale, charH*scale, n+firstch );
		context.beginPath();
		context.strokeStyle = 'rgb(0,0,0)';
		context.fillStyle = 'rgb(0,0,0)';
	
		// Seek to the position where this character begins
		f.seek( chardefs + offsets[n] );

		// Create a variable to keep track of number of bytes in this definition
		var b=0;
		// Keep iterating over bytes until we reach the next character definition.
		// Each iteration will grab TWO bytes to make one word.
	  	while ( (b*2)+offsets[n] < offsets[n+1] ) {
			// These values are SIGNED 7-bit integers, so need to convert them.

			// Convert the bytes into binary strings
			bits1 = decToBinStr( f.getUint8() );
			bits2 = decToBinStr( f.getUint8() );

			// Last 7 bits are the signed int. Convert back to decimal.
			var x = signedBinToDec( bits1.slice(1) );
			var y = signedBinToDec( bits2.slice(1) );

			// PARSE OPCODE BITS
			var cmd = '';
			if ( bits1[0] == 0 && bits2[0] == 0 ) {
				cmd = 'END OF CHARACTER';
			}
			else if ( bits1[0] == 1 && bits2[0] == 0 ) {
				cmd = 'MOVE POINTER TO (' + x + ',' + y + ')' ;
				context.beginPath();
				context.moveTo(x*scale+1,y*scale);
			}
			else if ( bits1[0] == 0 && bits2[0] == 1 ) {
				cmd = 'SCAN (' + x + ',' + y + ')';
				// BOLD.CHR is only font with SVC commands. What do they do?
			}
			else if ( bits1[0] == 1 && bits2[0] == 1 ) {
				cmd = 'DRAW FROM CURRENT TO TO (' + x + ',' + y + ')' ;
				context.lineTo(x*scale+1,y*scale);
				context.stroke();
				if (n == 3) {
					console.log(x,y);
				}
			}
			// Track X and Y values for font

			if (xVals.indexOf(x) === -1) { xVals.push(x); }
			if (yVals.indexOf(y) === -1) { yVals.push(y); }
			// Increment the byte counter
			b++;
		}
	}
	console.log(xVals);
	console.log(yVals);
	console.log('Y MIN:' + Math.min.apply(null, yVals) );
	console.log('Y MAX:' + Math.max.apply(null, yVals) );
	 

}





function loadFileFromUrl( url ) {
	var oReq = new XMLHttpRequest();
	oReq.onload = function(e) {
		// Get the data from the response.
		var result = oReq.response;
		// convert result ArrayBuffer to Uint8Array
		ShowBgiFile( result );
	}
	var randomh=Math.random();
	oReq.open("GET", url + '?x=' + randomh);
	oReq.setRequestHeader('Content-Type', 'application/octet-stream');
	oReq.responseType = "arraybuffer";
	oReq.send();
}






</script>
</body>