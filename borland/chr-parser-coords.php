<html>
<head></head>
<body>
	<h3>Borland CHR fonts</h3>
	<p>Write a message below, choose a font, then click the "Render" button.</p>
	<textarea id="message" style="width:100%; height: 80px; display: block; margin: 1rem 0px;"></textarea>
	<select id="fileSelector">
		<option value="" selected="true" disabled="disabled">Choose a font</option>
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
					// skip if not .CHR
					if( substr($entry, -4) != ".CHR") continue;
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

	<label for="scale">Scale</label>
	<input id="scale" type="number" min="1" max="10" step="1" value ="1"/>

	<button id="render" style="margin: 1rem 0px; padding: 0.5rem; display: block;">Render</button>



<div id="font-container"></div>

<script>

document.getElementById('render').onclick = function() {
	var fileSelector = document.getElementById('fileSelector');
	var elem = (typeof fileSelector.selectedIndex === "undefined" ? window.event.srcElement : fileSelector);
	var value = elem.value || elem.options[elem.selectedIndex].value;
	loadFontFromUrl( value );
}


function Font() {
	this.chars = [];
	this.index = 0;
	this.header_size = 0;
	this.font_name = '';
	this.font_size = 0;
	this.font_major = 0;
	this.font_minor = 0;
	this.bgi_major = 0;
	this.bgi_minor = 0;
	this.sig = 0;
	this.nchrs = 0;
	this.unused1 = '';
	this.firstch = 0;
	this.cdefs = 0;
	this.scan_flag = 0;
	this.org_to_cap = 0;
	this.org_to_base = 0;
	this.org_to_dec = 0;
	this.unused2 = '';
	this.x_max = 0;
	this.x_min = 0;
	this.y_max = 0;
	this.y_min = 0;
}

Font.prototype = {
	getLength: function() {
		return this.chars.length;
	},
	getIndex: function() {
		return this.index;
	},
	getChar: function() {
		return this.chars[ this.index ];
	},
	getCharByIndex: function(c) {
		return this.chars[ c ];
	},
	getCharByName: function(name) {
		var cl = this.getLength();
		for (var c=0; c<cl; c++) {
			var theChar = this.getCharByIndex(c);
			if ( theChar.getName() == name ) {
				return theChar;
			}
		}
	},
	getCharByAscii: function() {
	},
	increment: function(amt) {
		this.index += amt;
	}
}


function Char() {
	this.char_name = null;
	this.ascii_value = null;
	this.cmds = [];
	this.index = 0;
	this.defined_width = 0;
	this.x_max = 0;
	this.x_min = 0;
	this.y_max = 0;
	this.y_min = 0;
}
Char.prototype = {
	getLength: function() {
		return this.cmds.length;
	},
	getWidth: function() {
		return this.defined_width;
	},
	getIndex: function() {
		return this.index;
	},
	getAscii: function() {
		return this.ascii_value;
	},
	getName: function() {
		return this.char_name;
	},
	getCmdByIndex: function(c) {
		return this.cmds[ c ];
	},
	getCmd: function() {
		return this.cmds[ this.index ];
	},
	increment: function(amt) {
		this.index += amt;
	}
}

function Cmd() {
	this.x = null;
	this.y = null;
	this.cmd = null;
}
Cmd.prototype = {
	getX: function() {
		return this.x;
	},
	getY: function() {
		return this.y;
	},
	getCmd: function() {
		return this.cmd;
	}
}


function createContext(width, height, id ) {
    var canvas = document.createElement('canvas');
	canvas.setAttribute('id', id);
	document.body.appendChild(canvas);
    canvas.width = width;
    canvas.height = height;
    canvas.style.margin = '5px';
	var context = canvas.getContext('2d');
	// This transform accounts for negative Y-coordinates.
	// But I can also recalculate the coordinates myself in the preview function
	//context.transform(1, 0, 0, -1, 0, canvas.height)
	//context = canvas.getContext('2d');
	context.fillStyle = 'rgb(200,200,200)';
	context.rect( 0, 0, width, height );
	context.fill();
    return context;
}


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





function convertFont(arrayBuffer) {
	// INFORMATION ON PARSING BORLAND CHR FONTS CAME FROM:
	// * The file `fdv_bgi.h` in the GRX graphics library
	// * The file `main.c` in the chrcvt package in the cc65 C compiler
	//    - https://github.com/SvenMichaelKlose/cc65g/blob/master/src/chrcvt/main.c
	// * FileFormat.info: 
	//    - http://www.fileformat.info/format/borland-chr/corion.htm
	// * Post in Delphi Groups:
	//    - http://www.delphigroups.info/2/03/13720.html

	var f = new JoshReader(arrayBuffer);
	var theFont = new Font();

	// This is the ASCII copyright message
	var ch, msg;
	while ( ch != 26 ) {
		ch = f.getUint8();
		msg += String.fromCharCode(ch);
	}
	console.log(msg);


	theFont.header_size = f.getUint16();
	theFont.font_name = f.getString(4);
	theFont.font_size = f.getUint16();
	theFont.font_major = f.getUint8();
	theFont.font_minor = f.getUint8();
	theFont.bgi_major = f.getUint8();
	theFont.bgi_minor = f.getUint8();

	console.log( 'header_size' + '\t' + theFont.header_size );
	console.log( 'theFont_name' + '\t' + theFont.font_name );
	console.log( 'theFont_size' + '\t' + theFont.font_size );
	console.log( 'theFont_major' + '\t' + theFont.font_major );
	console.log( 'theFont_minor' + '\t' + theFont.font_minor );
	console.log( 'bgi_major' + '\t' + theFont.bgi_major );
	console.log( 'bgi_minor' + '\t' + theFont.bgi_minor );

	// Seek to the theFont header (usually at position 128) and 
	// make sure it contains the signature byte: ascii 43 or '+' 

	console.log( '----------------------' );
	console.log( 'Seeking to position ' + theFont.header_size );
	f.seek( theFont.header_size );


	theFont.sig = f.getUint8();
	theFont.nchrs = f.getUint16();
	theFont.unused1 = f.getString(1);
	theFont.firstch = f.getUint8();
	theFont.cdefs = f.getUint16();
	theFont.scan_flag = f.getUint8();		// All these theFonts have scan_flag set to 0
	theFont.org_to_cap = f.getUint8();
	theFont.org_to_base = f.getUint8();
	theFont.org_to_dec =  signedBinToDec( decToBinStr( f.getUint8() ) );
	theFont.unused2 = f.getString(5);


	console.log( 'sig' + '\t' + theFont.sig );
	console.log( 'nchrs' + '\t' + theFont.nchrs );
	console.log( 'unused1' + '\t' + theFont.unused1 );
	console.log( 'firstch' + '\t' + theFont.firstch );
	console.log( 'cdefs' + '\t' + theFont.cdefs );
	console.log( 'scan_flag' + '\t' + theFont.scan_flag );
	console.log( 'org_to_cap' + '\t' + theFont.org_to_cap );
	console.log( 'org_to_base' + '\t' + theFont.org_to_base );
	console.log( 'org_to_dec' + '\t' + theFont.org_to_dec );
	console.log( 'unused2' + '\t' + theFont.unused2 );

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
	for (var n=0; n<theFont.nchrs; n++) {
		offsets.push( f.getUint16() );
	}

	// Compile list of individual character widths
	var widths = []
	for (var n=0; n<theFont.nchrs; n++) {
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
 	var chardefs = 3*theFont.nchrs + 144;
	var fontXVals = [];
	var fontYVals = [];
	for (var n=0; n<theFont.nchrs; n++) {
		var theChar = new Char();
		theChar.defined_width = widths[n];
		theChar.ascii_value = n + theFont.firstch;
		theChar.char_name = String.fromCharCode( n + theFont.firstch );

		var charXVals = [];
		var charYVals = [];

		// Seek to the position where this character begins
		f.seek( chardefs + offsets[n] );

		// Create a variable to keep track of number of bytes in this definition
		var b=0;
		// Keep iterating over bytes until we reach the next character definition.
		// Each iteration will grab TWO bytes to make one word.
	  	while ( (b*2)+offsets[n] < offsets[n+1] ) {
			var theCmd = new Cmd();

			// These values are SIGNED 7-bit integers, so need to convert them.
			// Convert the bytes into binary strings
			bits1 = decToBinStr( f.getUint8() );
			bits2 = decToBinStr( f.getUint8() );

			// Last 7 bits are the signed int. Convert back to decimal.
			var x = signedBinToDec( bits1.slice(1) );
			var y = signedBinToDec( bits2.slice(1) );

			// PARSE OPCODE BITS
			if ( bits1[0] == 0 && bits2[0] == 0 ) {
				theCmd.cmd = 'END';
			}
			else if ( bits1[0] == 1 && bits2[0] == 0 ) {
				theCmd.cmd = 'MOVE';
				theCmd.x = x;
				theCmd.y = y;
			}
			else if ( bits1[0] == 0 && bits2[0] == 1 ) {
				theCmd.cmd = 'SCAN';
				theCmd.x = x;
				theCmd.y = y;
			}
			else if ( bits1[0] == 1 && bits2[0] == 1 ) {
				theCmd.cmd = 'DRAW';
				theCmd.x = x;
				theCmd.y = y;
			}
			// Track X and Y values for font
			if (fontXVals.indexOf(x) === -1) { fontXVals.push(x); }
			if (fontYVals.indexOf(y) === -1) { fontYVals.push(y); }

			if (charXVals.indexOf(x) === -1) { charXVals.push(x); }
			if (charYVals.indexOf(y) === -1) { charYVals.push(y); }
			// Add command to Char obj
			theChar.cmds.push( theCmd );
			// Increment the byte counter
			b++;
		} // end while
		theChar.x_max = Math.max.apply(null, charXVals);
		theChar.x_min = Math.min.apply(null, charXVals);
		theChar.y_max = Math.max.apply(null, charYVals);
		theChar.y_min = Math.min.apply(null, charYVals);
		theFont.chars.push( theChar );		
		// log interesting stuff
		if ( theChar.ascii_value == 176 ) {
			console.log(charXVals);
			console.log('xmax: ' + theChar.x_max);
			console.log('xmin: ' + theChar.x_min);
		}
	} // end for
	theFont.x_max = Math.max.apply(null, fontXVals);
	theFont.x_min = Math.min.apply(null, fontXVals);
	theFont.y_max = Math.max.apply(null, fontYVals);
	theFont.y_min = Math.min.apply(null, fontYVals);
	return theFont;
}


function previewFont( theFont ) {
	for (var c=0; c<theFont.getLength(); c++) {
		var theChar = theFont.getCharByIndex(c);
		var charW = Math.max( theChar.x_max, theChar.defined_width );
		if ( theChar.getAscii() == 176) {
			console.log( 'HI' );
			console.log( theChar.x_max, theChar.defined_width, charW );
		}

		var charBot = Math.min( theChar.y_min, 0 );
		var charTop = theChar.y_max;
		var charH = Math.abs( charBot ) + charTop;

		var fontBot = Math.min( theFont.y_min, 0 );
		var fontTop = theFont.y_max;
		var fontH = Math.abs( fontBot ) + fontTop;


		var fontDefinedH = Math.abs( theFont.org_to_cap ) + Math.abs( theFont.org_to_dec );

		//var charH = Math.abs( theFont.org_to_cap ) + Math.abs( theFont.org_to_dec );
		var scale = 1;

		// Create a new canvas and context for this character.
		// Also, give it an ID corresponding to its ASCII value
		// which is firstch + n.
		var context = createContext( charW*scale, fontH*scale, 'char'+theChar.getAscii() );
		context.beginPath();
		context.strokeStyle = 'rgb(0,0,0)';
		context.lineWidth = 1;

		// Iterate over drawing commands
		for (var d=0; d<theChar.getLength(); d++) {
			var theCmd = theChar.getCmdByIndex(d);
			var cmd = theCmd.getCmd();
			var x = theCmd.getX();
			var y = theCmd.getY();
			y = Math.abs( y - theFont.y_max );

			if (cmd == 'END') { }
			else if (cmd == 'SCAN') { }
			else if (cmd == 'MOVE') { 
				context.beginPath();
				context.moveTo( x*scale+1, y*scale );
			}
			else if (cmd == 'DRAW') { 
				if (c == 3) {
					console.log(x,y);
				}
				context.lineTo( x*scale+1, y*scale );
				context.stroke();
				//console.log( x*scale, y*scale );
			}
		}
	}
}





function writeMessage( msg, theFont, context, mx, my, scale ) {
	for (var m=0; m<msg.length; m++) {
		var theChar = theFont.getCharByName( msg[m] );
		var charW = theChar.getWidth();

		context.beginPath();
		context.strokeStyle = 'rgb(0,0,0)';
		context.lineWidth = 1;

		// Iterate over drawing commands
		for (var d=0; d<theChar.getLength(); d++) {
			var theCmd = theChar.getCmdByIndex(d);
			var cmd = theCmd.getCmd();
			var x = theCmd.getX();
			var y = theCmd.getY();
			y = Math.abs( y - theFont.y_max );

			if (cmd == 'END') { }
			else if (cmd == 'SCAN') { }
			else if (cmd == 'MOVE') { 
				context.beginPath();
				context.moveTo( mx + (x*scale+1), my + (y*scale) );
			}
			else if (cmd == 'DRAW') { 
				context.lineTo( mx + (x*scale+1), my + (y*scale) );
				context.stroke();
			}
		}
		mx = mx + (charW*scale);
	}
}


function loadFontFromUrl( url ) {
	var oReq = new XMLHttpRequest();
	oReq.onload = function(e) {
		// Get the data from the response.
		var result = oReq.response;

		// Parse the Borland CHR font
		var font = convertFont( result );

		// Download the converted font as JSON object.
// 		function download(text, name, type) {
// 			var a = document.createElement("a");
// 			var file = new Blob([text], {type: type});
// 			a.href = URL.createObjectURL(file);
// 			a.download = name;
// 			a.click();
// 		}
// 		download(JSON.stringify(font,null,'\t'), font.font_name+'.json', 'text/plain');

		var org_to_cap = font.org_to_cap;
		var scaleElem = document.getElementById('scale');
		var scale = scaleElem.value;
		var h = (org_to_cap * scale) + (20*scale);

		// Print a preview table of all characters in the font
		//previewFont( font );

		// Write a customized message
		var ctx = createContext( 1024, h, 'msg' );
		var msgElem = document.getElementById('message');
		writeMessage( msgElem.value, font, ctx, 5, 5, scale );
	}
	var randomh=Math.random();
	oReq.open("GET", url + '?x=' + randomh);
	oReq.setRequestHeader('Content-Type', 'application/octet-stream');
	oReq.responseType = "arraybuffer";
	oReq.send();
}






</script>
</body>