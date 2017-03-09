var canvas = document.getElementById('atascii');
var context = canvas.getContext('2d');


// 30 characters per second and 1 chunk should emulate 300bps.
// 288 cps and 5 chunks emulates 14.4kbps

var cps = 288;
var chunks = 80;
var delay = 0; //1000/(cps/chunks);
var before;


// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, delay);
          };
})();

function disableSmoothing(ctx) {
    ctx['mozImageSmoothingEnabled'] = false;    /* Firefox */
    ctx['oImageSmoothingEnabled'] = false;      /* Opera */
    ctx['webkitImageSmoothingEnabled'] = false; /* Safari */
    ctx['msImageSmoothingEnabled'] = false;     /* IE */
    ctx['imageSmoothingEnabled'] = false;       /* standard */
}

// EGA screen is 640 x 350
var cols = 80;
var rows = 25;

var charW = 8;
var charH = 14;

canvas.width = cols * charW;
canvas.height = rows * charH;
context.clearRect(0, 0, canvas.width, canvas.height);
context.fillStyle = '#000000';
context.fillRect( 0, 0, canvas.width, canvas.height );

// Diagnostic stuff
var overlay = document.getElementById('canvas-overlay');
overlay.style.width = (cols * charW).toString() +'px';
overlay.style.height = (rows * charH).toString() +'px';
var stream;
var diagnosticMode = false;
var fullScreenMode = false;


//resize(canvas);
// document.getElementById('atascii').style.background = '#000';

// Globals
var screen;
var cursor = {'x':0,'y':0};


// LOAD AND PARSE ALL THE BORLAND FONTS
var loadFontFile = function (filePath, done) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () { return done(this.response) }
	xhr.open("GET", filePath, true);
	xhr.setRequestHeader('Content-Type', 'application/octet-stream');
	xhr.responseType = "arraybuffer";
	xhr.send();
}
var fontUrls = [
	null,
	'fonts/01-TRIP.CHR',
	'fonts/02-LITT.CHR',
	'fonts/03-SANS.CHR',
	'fonts/04-GOTH.CHR',
	'fonts/05-SCRI.CHR',
	'fonts/06-SIMP.CHR',
	'fonts/07-TSCR.CHR',
	'fonts/08-LCOM.CHR',
	'fonts/09-EURO.CHR',
	'fonts/0A-BOLD.CHR'
];
var fonts = [];

// Load and parse each of the 10 fonts
fontUrls.forEach(function (url, i) {
	if (url) {
		loadFontFile(url, function (response) {
			fonts[i] = convertFont( response );
			// When arrays are same length, we're done load font files.
			// Now it's time to do ANOTHER asynchronous load: the img.
			if (fonts.length === fontUrls.length ) {
				var img = new Image();
				// if you don't wait for onload, then nothing happens.
				img.onload = function () {
					var atasciifont = new Sprite(img, 16, 16);
					screen = new Screen(cols, rows, atasciifont);
					screen.initialize();
					screen.draw();
					var fs = document.getElementById('fileSelector');
					fs.style.display = 'block';
				}
				img.src = 'http://breakintochat.com/collections/atascii/fontsets/atari-8bit-blue.png';
			}
		});
	}
	else {
		fonts[i] = null;
	}
});


document.getElementById('fileSelector').onchange = function() {
	var elem = (typeof this.selectedIndex === "undefined" ? window.event.srcElement : this);
	var value = elem.value || elem.options[elem.selectedIndex].value;
	// Stop any running animations
	if (typeof screen === 'object') {
		screen.stop();
	}
	loadFileFromUrl( value );
}

document.getElementById('speed').onchange = function() {
	var elem = (typeof this.selectedIndex === "undefined" ? window.event.srcElement : this);
	var value = elem.value || elem.options[elem.selectedIndex].value;

	switch ( parseInt(value) ) {
		default:
			cps = 30;
			chunks = 1;
			break;
		case 600:
			cps = 60;
			chunks = 1;
			break;
		case 1200:
			cps = 60;
			chunks = 2;
			break;
		case 2400:
			cps = 120;
			chunks = 2;
			break;
		case 4800:
			cps = 160;
			chunks = 3;
			break;
		case 9600:
			cps = 240;
			chunks = 4;
			break;
		case 14400:
			cps = 288;
			chunks = 5;
			break;
	}
	delay = 1000/(cps/chunks);

	//console.log('speed:\t' + value + 'cps:\t' + cps + 'chunks:\t' + chunks + 'delay:\t' + delay);

}



document.getElementById('diagnostic').onclick = function() {
	if (this.checked) { diagnosticMode = true; }
	else { diagnosticMode = false; }

	var diags = document.getElementsByClassName("diagnostic");
	for (var i=0; i < diags.length; i++) {
		if ( diagnosticMode ) {
			diags.item(i).style.display = 'block';
		}
		else {
			diags.item(i).style.display = 'none';
		}
	}
}

document.getElementById('full-screen').onclick = function() {
	if (this.checked) { fullScreenMode = true; }
	else { fullScreenMode = false; }

	var container = document.getElementById('canvas-container');
	if ( fullScreenMode ) {
		resize(container);
		container.classList.add('fullscreen');
		if ( container.webkitRequestFullscreen ) {
			container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
			document.addEventListener('webkitfullscreenchange', exitHandler, false);
		}
		else if ( container.mozRequestFullScreen ) {
			container.mozRequestFullScreen();
			document.addEventListener('mozfullscreenchange', exitHandler, false);
		}
		else if ( container.msRequestFullscreen ) {
			container.msRequestFullscreen();
			document.addEventListener('MSFullscreenChange', exitHandler, false);
		}
		else if ( container.requestFullscreen ) {
			container.requestFullscreen();
			document.addEventListener('fullscreenchange', exitHandler, false);
		}
	}
	else {

		if ( document.webkitExitFullscreen ) {
			document.webkitExitFullscreen();
		}
		else if ( document.mozCancelFullScreen ) {
			document.mozCancelFullScreen();
		}
		else if ( document.msExitFullscreen ) {
			document.msExitFullscreen();
		}
		else if ( document.exitFullscreen ) {
			document.exitFullscreen();
		}
		container.setAttribute('style', '-ms-transform: scale(1,1); -webkit-transform: scale3d(1,1,1); -moz-transform: scale(1,1); -o-transform: scale(1,1); transform: scale(1,1);');
		container.classList.remove('fullscreen');
	}
}

function exitHandler() {
	var state = document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement;
	var container = document.getElementById('canvas-container');
	if ( !state ) {
		container.setAttribute('style', '-ms-transform-origin: left top; -webkit-transform-origin: left top; -moz-transform-origin: left top; -o-transform-origin: left top; transform-origin: left top; -ms-transform: scale(1,1); -webkit-transform: scale3d(1,1,1); -moz-transform: scale(1,1); -o-transform: scale(1,1); transform: scale(1,1);');
		container.classList.remove('fullscreen');
		document.getElementById('full-screen').checked = false;
	}
}


document.onkeydown = function(e) {
	// P: "Print screen" (create IMG element for saving screen caps)_
	if ( e.keyCode == 80 ) {
		if (typeof screen === 'object') {
			var imgUrl = canvas.toDataURL("image/png");
			var img = document.getElementById('capture');
			img.src = imgUrl;
		}
	}
	// ESC: stop
	else if ( e.keyCode == 27 ) {
		if (typeof screen === 'object') {
			screen.stop();
		}
	}

	if (diagnosticMode) {
		// LEFT: step backward one frame using diagnostic
		if ( e.keyCode == 37 ) {
			if (typeof screen === 'object') {
				diagnosticRender( -1 );
			}
		}
		// RIGHT: step forward one frame using diagnostic
		else if ( e.keyCode == 39 ) {
			if (typeof screen === 'object') {
				diagnosticRender( 1 );
			}
		}
	}
}

function resize(element) {
	var scale = {x: 1, y: 1};
	scale.x = (window.innerWidth) / element.offsetWidth;
	scale.y = (window.innerHeight) / element.offsetHeight;
	if (scale.x < 1 || scale.y < 1) {
		scale = '1, 1';
	} else if (scale.x < scale.y) {
		scale = scale.x + ', ' + scale.x;
	} else {
		scale = scale.y + ', ' + scale.y;
	}
	element.setAttribute('style', '-ms-transform: scale(' + scale + '); -webkit-transform: scale3d(' + scale + ', 1); -moz-transform: scale(' + scale + '); -o-transform: scale(' + scale + '); transform: scale(' + scale + ');');
}



// Function is called when server-side dropdown onChange
function loadFileFromUrl( url ) {
	var oReq = new XMLHttpRequest();
	oReq.onload = function(e) {
		// Stop any animations that are playing now.
		screen.stop();
		// Get the data from the response.
		var result = oReq.response;
		// convert result ArrayBuffer to Uint8Array
		var byteArray = new Uint8Array(result);
		// Change Uint8Array to normal array, clone it, store it in Stream obj
		stream = new Stream( [].slice.call(byteArray) );
		// reset globals
		var cursor = {'x':0,'y':0};
		screen.initialize();
		screen.draw();
		// temporary shim until I port the RIP code to screen object
		context.clearRect(0,0,canvas.width,canvas.height);
		context.fillStyle = '#000000';
		context.fillRect( 0, 0, canvas.width, canvas.height );
		// Send array to our renderer
		requestAnimFrame( render );
	}
	var randomh=Math.random();
	oReq.open("GET", url + '?x=' + randomh);
	oReq.setRequestHeader('Content-Type', 'application/octet-stream');
	oReq.responseType = "arraybuffer";
	oReq.send();
}




// Function is called when file selector fires onChange 
function parseFile( files ) {
	var numFiles = files.length;
	for (var i = 0, numFiles = files.length; i < numFiles; i++) {
		var file = files[i];
		var fSize = file.size;
		var fType = file.type;
		var fName = file.name;
	}
	var reader = new FileReader();
	reader.onload = function(e) {
		var result = e.target.result;
		// convert data to ascii codes.
		result = result.split('');
		for (var i=0; i<result.length; i++) {
			result[i] = result[i].charCodeAt(0);
		}
		stream = new Stream( result );
		// reset globals
		var cursor = {'x':0,'y':0};
		screen.initialize();
		screen.draw();
		// Send array to our renderer
		requestAnimFrame( render );
	};
	reader.readAsBinaryString(file);
}


function Stream(data) {
	this.data = data;
	this.index = 0;
}

Stream.prototype = {
	getLength: function() {
		return this.data.length;
	},
	getIndex: function() {
		return this.index;
	},
	getData: function() {
		return this.data[ this.index ];
	},
	increment: function(amt) {
		this.index += amt;
	}
}

function Screen(width, height, sprite) {
	this.width = width;
	this.height = height;
	this.sprite = sprite;
	this.spriteWidth = sprite.width;
	this.spriteHeight = sprite.height;
	this.canvasWidth = this.width * this.spriteWidth;
	this.canvasHeight = this.height * this.spriteHeight;
	this.data = [];
	this.prevData = [];
	this.updates = [];
	this.isPlaying = false;
}


// EVENTUALLY GOING TO PORT THE RIP COMMANDS INTO THIS SCREEN OBJECT
// right now it's still an atascii screen setup

Screen.prototype = {
	play: function() {
		this.isPlaying = true;
	},
	stop: function() {
		this.isPlaying = false;
	},
	clearScreen: function() {
		context.clearRect(0,0,this.canvasWidth,this.canvasHeight);
		for (var y=0; y<this.height; y++) {
			this.data[y] = [];
			for (var x=0; x<this.width; x++) {
				//this.data[y][x] = Math.floor(Math.random() * (255 - 1 + 1) + 1);
				this.data[y][x] = 32;
			}
		}
	},
	initialize: function() {
		this.clearScreen();
		if ( this.prevData.length == 0 ) {
			// Make a copy of the screen data
			this.prevData = this.data.map(function(arr) {
				return arr.slice();
			});
		}
		this.play();
	},
	randomize: function() {
		for (var y=0; y<this.height; y++) {
			this.data[y] = [];
			for (var x=0; x<this.width; x++) {
				this.data[y][x] = Math.floor(Math.random() * (255 - 1 + 1) + 1);
			}
		}
	},
	getData: function(x,y) {
		return this.data[y][x]
	},
	setData: function(x,y,data) {
		if ( typeof this.data[y] === 'undefined' || typeof this.data[y][x] === 'undefined' ) {
			throw("ERROR: Screen.setData() invalid coordinates: " + x + "," + y);
		}
		this.data[y][x] = data;
	},
	scrollUp: function( amt ) {
		// Iterate over each line and replace it with 
		// the data from the next line
		for (var y=0; y < this.height; y++) {
			for (var x=0; x < this.width; x++ ) {
				// Check if we're within threshold amt
				if ( y < ( this.height - amt) ) {
					var theChar = this.getData( x, y + amt );
					this.setData( x, y, theChar );
				}
				// if not, then this is the bottom. Fill with empty space.
				else {
					this.setData( x, y, 32 );
				}
			}
		}
		this.draw();
	},
	shiftUp: function( y, amt ) {
		// Iterate over each line and replace it with 
		// the data from the next line
		for ( y; y < this.height; y++) {
			for (var x=0; x < this.width; x++ ) {
				// Check if we're within threshold amt
				if ( y < ( this.height - amt) ) {
					var theChar = this.getData( x, y + amt );
					this.setData( x, y, theChar );
				}
				// if not, then this is the bottom. Fill with empty space.
				else {
					this.setData( x, y, 32 );
				}
			}
		}
		this.draw();
	},
	shiftDown: function( y, amt ) {
		var z = this.height - 1;
		// Iterate over each line and replace it with 
		// the data from the next line
		for ( y; z > y; z--) {
			for (var x=0; x < this.width; x++ ) {
				var theChar = this.getData( x, z - amt );
				this.setData( x, z, theChar );
			}
		}
		this.draw();
	},
	shiftLeft: function( x, y, amt ) {
		for ( x; x < this.width; x++ ) {
			// Check if we're within threshold amt
			if ( x < ( this.width - amt) ) {
				var theChar = this.getData( x + amt, y );
				this.setData( x, y, theChar );
			}
			// if not, then this is end of line. Fill with empty space.
			else {
				this.setData( x, y, 32 );
			}
		}
		this.draw();
	},
	shiftRight: function( x, y, amt ) {
		var z = this.width - 1;
		for ( x; z > x; z-- ) {
			var theChar = this.getData( z - amt, y );
			this.setData( z, y, theChar );
		}
		this.setData( x, y, 32 );
		this.draw();
	},
	clearLine: function( y ) {
		for (var x=0; x<this.width; x++) {
			this.setData( x, y, 32 );
		}
		this.draw();
	},
	isLineBlank: function( y ) {
		var lineBlank = true;
		// Iterate over all columns, looking for any character other than space
		for (var x=0; x<this.width; x++) {
			if ( this.getData( x, y ) != 32 ) {
				lineBlank = false;
			}
		}
		return lineBlank;
	},

	draw: function() {
		//context.clearRect(x,y,this.width,this.height);
		for (var y=0; y<this.height; y++) {
			for (var x=0; x<this.width; x++) {
				// if we're in diagnostic mode, repaint everything.
				// Otherwise, only repaint if character changed from last paint
				if ( this.data[y][x] && this.prevData[y][x] ) {
					if ( this.data[y][x] != this.prevData[y][x] || diagnosticMode ) {
						this.sprite.draw( this.data[y][x], x*this.spriteWidth, y*this.spriteHeight );
					}
				}
			}
		}
		// Make a copy of the screen data after drawing
		this.prevData = this.data.map(function(arr) {
			return arr.slice();
		});

	},
	drawCursor: function(x,y) {
		thisX = x*this.spriteWidth;
		thisY = y*this.spriteHeight;
		context.fillStyle = 'rgba(225,225,0,0.5)';
		context.fillRect(thisX,thisY,this.spriteWidth,this.spriteHeight);
	},
	log: function() {
		var str = '';
		for (var y=0; y<this.height; y++) {
			for (var x=0; x<this.width; x++) {
				str += this.data[y][x];
			}
			str += '\r\n';
		}
 		console.log(str);
	}
};


function Sprite(img, width, height) {
	this.img = img;
	this.width = width;
	this.height = height;
}
Sprite.prototype = {
	draw: function(position, x, y) {
		context.drawImage(
			this.img,
			position * this.width,
			0,
			this.width,
			this.height,
			x, 
			y,
			this.width,
			this.height
		);
	}
};

function diagnosticRender( direction ) {
	stream.increment( direction );

	// call the draw routine
	parseChar( stream.getData() );
}

function render( now ) {
	// call the draw routine
	if ( !before ) {
		before = now;
	}
	var delta = now - before;

	// if sufficient time passed since last draw, draw next char
	if ( delta > delay ) {
		//console.log('NOW: ' + now + ' | BEFORE: ' + before + ' | ELAPSED: ' + (now-before) );
		for (var i=0; i<chunks; i++) {
			if ( stream.getIndex() < stream.getLength() ) {
				parseChar( stream.getData() );
				stream.increment(1);
			}
		}
 		//before = now - (delta % delay);
 		before = now;
	}
	// if stream hasn't run out, and nobody has pushed Stop,
	// then continue requesting animation
	if ( ( stream.getIndex() < stream.getLength() ) && screen.isPlaying) {
		requestAnimFrame( render );
	}
}








var Place = [1, 36, 1296, 46656, 1679616];
var Seq = ('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');

var ErrorCode; //INTEGER
var GrDriver, GrMode; //INTEGER
var f; //TEXT
var ccol; //INTEGER
var charCode; //CHAR
var Clipboard; //POINTER
var LLL = 0; //INTEGER
var command = ''; //STRING
var ripLine = false, bslash = false; //BOOLEAN


function WriteString( SSS, CP ) {
	console.log( SSS + ' | ' + String.fromCharCode( SSS ) );
}


function convert (SS) {
	// Convert the base36-encoded stuff back into actual integers
	// 	console.log('ss: ' + SS + ' | conv: ' + parseInt( SS, 36) );
	return parseInt( SS, 36);
}


var fontStyle = 1;
var fontDirection = 0;
var fontSize = 1;

// Values from Wikipedia table here: https://upload.wikimedia.org/wikipedia/commons/d/df/EGA_Table.PNG
var masterPalette = [
	'#000000',
	'#0000AA',
	'#00AA00',
	'#00AAAA',
	'#AA0000',
	'#AA00AA',
	'#AAAA00',
	'#AAAAAA',
	'#000055',
	'#0000FF',
	'#00AA55',
	'#00AAFF',
	'#AA0055',
	'#AA00FF',
	'#AAAA55',
	'#AAAAFF',
	'#005500',
	'#0055AA',
	'#00FF00',
	'#00FFAA',
	'#AA5500',
	'#AA55AA',
	'#AAFF00',
	'#AAFFAA',
	'#005555',
	'#0055FF',
	'#00FF55',
	'#00FFFF',
	'#AA5555',
	'#AA55FF',
	'#AAFF55',
	'#AAFFFF',
	'#550000',
	'#5500AA',
	'#55AA00',
	'#55AAAA',
	'#FF0000',
	'#FF00AA',
	'#FFAA00',
	'#FFAAAA',
	'#550055',
	'#5500FF',
	'#55AA55',
	'#55AAFF',
	'#FF0055',
	'#FF00FF',
	'#FFAA55',
	'#FFAAFF',
	'#555500',
	'#5555AA',
	'#55FF00',
	'#55FFAA',
	'#FF5500',
	'#FF55AA',
	'#FFFF00',
	'#FFFFAA',
	'#555555',
	'#5555FF',
	'#55FF55',
	'#55FFFF',
	'#FF5555',
	'#FF55FF',
	'#FFFF55',
	'#FFFFFF'
];

// Pointers to the colors in the master palette
// These are the default values.
var currentPalette = [0,1,2,3,4,5,20,7,56,57,58,59,60,61,62,63];
var bgColor;
var fillColor;
var strokeColor;
var strokeThick = 1;
var strokeUserPattern = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

var fillPatternArrays = [
	[
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0]
	],
	[
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1]
	],
	[
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[1,1,1,1,1,1,1,1],
		[1,1,1,1,1,1,1,1],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0]
	],
	[
		[0,0,0,0,0,0,0,1],
		[0,0,0,0,0,0,1,0],
		[0,0,0,0,0,1,0,0],
		[0,0,0,0,1,0,0,0],
		[0,0,0,1,0,0,0,0],
		[0,0,1,0,0,0,0,0],
		[0,1,0,0,0,0,0,0],
		[1,0,0,0,0,0,0,0]
	],
	[
		[1,1,1,0,0,0,0,0],
		[1,1,0,0,0,0,0,1],
		[1,0,0,0,0,0,1,1],
		[0,0,0,0,0,1,1,1],
		[0,0,0,0,1,1,1,0],
		[0,0,0,1,1,1,0,0],
		[0,0,1,1,1,0,0,0],
		[0,1,1,1,0,0,0,0]
	],
	[
		[1,1,1,1,0,0,0,0],
		[0,1,1,1,1,0,0,0],
		[0,0,1,1,1,1,0,0],
		[0,0,0,1,1,1,1,0],
		[0,0,0,0,1,1,1,1],
		[1,0,0,0,0,1,1,1],
		[1,1,0,0,0,0,1,1],
		[1,1,1,0,0,0,0,1]
	],
	[
		[1,0,1,0,0,1,0,1],
		[1,1,0,1,0,0,1,0],
		[0,1,1,0,1,0,0,1],
		[1,0,1,1,0,1,0,0],
		[0,1,0,1,1,0,1,0],
		[0,0,1,0,1,1,0,1],
		[1,0,0,1,0,1,1,0],
		[0,1,0,0,1,0,1,1],
	],
	[
		[1,1,1,1,1,1,1,1],
		[1,0,0,0,1,0,0,0],
		[1,0,0,0,1,0,0,0],
		[1,0,0,0,1,0,0,0],
		[1,1,1,1,1,1,1,1],
		[1,0,0,0,1,0,0,0],
		[1,0,0,0,1,0,0,0],
		[1,0,0,0,1,0,0,0]
	],
	[
		[1,0,0,0,0,0,0,1],
		[0,1,0,0,0,0,1,0],
		[0,0,1,0,0,1,0,0],
		[0,0,0,1,1,0,0,0],
		[0,0,0,1,1,0,0,0],
		[0,0,1,0,0,1,0,0],
		[0,1,0,0,0,0,1,0],
		[1,0,0,0,0,0,0,1]
	],
	[
		[1,1,0,0,1,1,0,0],
		[0,0,1,1,0,0,1,1],
		[1,1,0,0,1,1,0,0],
		[0,0,1,1,0,0,1,1],
		[1,1,0,0,1,1,0,0],
		[0,0,1,1,0,0,1,1],
		[1,1,0,0,1,1,0,0],
		[0,0,1,1,0,0,1,1],
	],
	[
		[1,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,1,0,0,0],
		[0,0,0,0,0,0,0,0],
		[1,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,1,0,0,0],
		[0,0,0,0,0,0,0,0]
	],
	[
		[1,0,0,0,1,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,1,0,0,0,1,0],
		[0,0,0,0,0,0,0,0],
		[1,0,0,0,1,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,1,0,0,0,1,0],
		[0,0,0,0,0,0,0,0],
	],
	[ // this is a 13th option that I found in PabloDraw
		[1,0,1,0,1,0,1,0],
		[0,1,0,1,0,1,0,1],
		[1,0,1,0,1,0,1,0],
		[0,1,0,1,0,1,0,1],
		[1,0,1,0,1,0,1,0],
		[0,1,0,1,0,1,0,1],
		[1,0,1,0,1,0,1,0],
		[0,1,0,1,0,1,0,1]
	]

];
var strokePatternArrays = [
	[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	[0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1],
	[0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1],
	[0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1]
];

var fillPatternCanvas = document.getElementById('fillPattern');
fillPatternCanvas.width = 8;
fillPatternCanvas.height = 8;
var fillPatternContext = fillPatternCanvas.getContext('2d');

// var strokePatternCanvas = document.getElementById('strokePattern');
// strokePatternCanvas.width = 16;
// strokePatternCanvas.height = 1;
// var strokePatternContext = strokePatternCanvas.getContext('2d');

// disableSmoothing( context );
// disableSmoothing( strokePatternContext );
// disableSmoothing( fillPatternContext );


function makeDashes ( pattern ) {
	console.log('makeDashes|',pattern);
	var dashes = {}
	dashes['array'] = [];
	dashes['offset'] = null;
	var ones = 0;
	var zeroes = 0;
	var pl = pattern.length;

	// If there are no 1s in the pattern, don't bother parsing
	if ( pattern.indexOf( 1 ) < 0 ) {
		return dashes;
	}

	for (var p=0; p<pl; p++) {
		if (pattern[p] == 0) {
			zeroes++;
		}
		else if (pattern[p] == 1) {
			ones++;
		}
		if (p>0 && pattern[p] == 1 && pattern[p-1] == 0) {
			if (dashes['array'].length == 0) {
				dashes['offset'] = zeroes;
			}
			else {
				dashes['array'].push( zeroes );
			}
			zeroes = 0;
		}
		else if (p>0 && pattern[p] == 0 && pattern[p-1] == 1 ) {
			dashes['array'].push( ones );
			ones = 0;
		}
		if ( p==(pl-1) && zeroes) {
			dashes['array'].push( zeroes );
		}
		else if ( p==(pl-1) && ones) {
			dashes['array'].push( ones );
		}

	}
// 	console.log(dashes);
	return dashes
}




// placeholders
function resetWindows() {
	console.log('resetWindows|');
}
function setWriteMode ( p1 ) {
	console.log('SetWriteMode|',p1);
}
function clearViewport() {
	console.log('clearViewport|');
}
function setViewport ( p1, p2, p3, p4, p5 ) {
	console.log('setViewport|',p1, p2, p3, p4, p5);
}
function setColor ( p1 ) {
	console.log('setColor|',p1);
	console.log('(PALETTE)|',currentPalette);
	strokeColor = masterPalette[ currentPalette[p1] ];
	// Seems like we need this if-then to avoid
	// black outlines on polygons that don't need them
	// But something's still not right. If I add this code,
	// then lines are missing from the blocktronix rip
	// And some marks are also missing from Denmark.
	// The problem is still probably in the way
	// stroke patterns and colors are interacting in my code.
// 	if (strokeColor > 0 ) {
// 		context.strokeStyle = strokeColor;
// 	}
// 	else {
// 		context.strokeStyle = 'rgba(0,0,0,0)';
// 	}

	// Set the global stroke color variable first
	context.strokeStyle = strokeColor;

	// Use the applyLineStyle function to make sure we
	// get the interaction between stroke style and color
	// correct.
	applyLineStyle();

	console.log('   stroke-color: ', strokeColor);
	console.log('   stroke-style: ', context.strokeStyle);
}

function setLineStyle ( style, user_pattern, thick ) {
	console.log('setLineStyle|', style, user_pattern, thick );

	var patternArray;
	if ( style < 4 ) {
		patternArray = strokePatternArrays[style];
	}
	else {
		if (user_pattern == 0 ) {
			patternArray = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
		}
		else {
			// Convert user_pattern to Binary string
			// Then convert to array of 16 ints, so I can iterate
			patternArray = user_pattern.toString(2).split('').map(Number);
		}
	}
	console.log(patternArray);

	// Store values in global variables
	strokeThick = thick;
	strokeUserPattern = patternArray;

	// Apply the styles to the HTML5 canvas context
	applyLineStyle();
}


function applyLineStyle() {
	console.log('applyLineStyle|' );

	var dashes = makeDashes( strokeUserPattern );
	console.log(dashes);
	console.log(strokeColor);

	// Right now this is a big kludge. Basically if there are no dashes,
	// then I make the stroke invisible.
	//
	// SIDENOTE:
	// In the past, I also made stroke invisible if the strokecolor was set
	// to the background color AND if the stroke width was less than 3.
	//
	// After looking at the Valhalla RIP, It seems like maybe instead
	// of making the stroke invisible here, I should do that in the dPoly function.
	// END SIDENOTE
	if ( dashes['array'].length < 1 ) {
		context.strokeStyle = 'rgba(0,0,0,0)';
	}
	// If there are dashes, use the foreground color
	else {
		context.strokeStyle = strokeColor;
	}

	// If there are dashes then set the LineDash style
	if ( dashes['array'].length > 1) {
		context.setLineDash( dashes['array'] );
	}
	// Otherwise reset to solid by passing an empty array to SetLineDash
	else {
		context.setLineDash( [] );
	}

	// Set the DashOffset if necessary
	if ( dashes['offset'] != null ) {
		context.lineDashOffset = dashes['offset'];
	}
	// Set thickness and linejoin
	context.lineWidth = strokeThick;
	context.lineJoin = 'bevel';
}

function setUserPattern( c1, c2, c3, c4, c5, c6, c7, c8, col ) {
	var patternLines = [c1, c2, c3, c4, c5, c6, c7, c8];
	var patternArray = [];
	console.log('setUserPattern|', c1, c2, c3, c4, c5, c6, c7, c8);
 	fillColor = masterPalette[ currentPalette[col] ];
	fillPatternContext.clearRect(0, 0, 8, 8);

	// Each of the cX parameters represents a bit pattern for one line
	// of the entire eight-line pattern. We need to convert each param
	// into a binary string, then into an array.
	for (var p=0; p<patternLines.length; p++) {
		var binaryString = patternLines[p].toString(2);
		if (binaryString.length == 7 ) {
			binaryString = '0' + binaryString;
		}
		patternArray.push( binaryString.split('').map(Number) );
	}
	console.log(patternArray);

	for (var y=0; y<patternArray.length; y++) {
		for (var x=0; x<patternArray[y].length; x++) {
			if ( patternArray[y][x] == 1 ) {
				fillPatternContext.fillStyle = fillColor;
			}
			else {
				fillPatternContext.fillStyle = masterPalette[ currentPalette[0] ];
			}
			fillPatternContext.fillRect(x,y,1,1);
		}
	}
	var pattern = context.createPattern(fillPatternCanvas, 'repeat');
 	context.fillStyle = pattern;
}


function setFillStyle ( p1, p2 ) {
	// p1 = pattern
	// p2 = color
	console.log('setFillStyle|',p1, p2);
 	fillColor = masterPalette[ currentPalette[p2] ];

	fillPatternContext.clearRect(0, 0, 8, 8);

	// populate the pattern canvas with the user's chosen pattern

	// what to do about patterns set for 12 or higher?
	// Looks like PabloDraw has a 13th pattern that is not in the 1.54 set.
	// Not sure if this is from later versions of RIP.

	var patternArray = fillPatternArrays[p1];
	for (var y=0; y<patternArray.length; y++) {
		for (var x=0; x<patternArray[y].length; x++) {
			if ( patternArray[y][x] == 1 ) {
				fillPatternContext.fillStyle = fillColor;
			}
			else {
				fillPatternContext.fillStyle = masterPalette[ currentPalette[0] ];
			}
			fillPatternContext.fillRect(x,y,1,1);
		}
	}
	var pattern = context.createPattern(fillPatternCanvas, 'repeat');
 	context.fillStyle = pattern;
}



function displayRipText( msg, theFont, context, mx, my, scale ) {
	console.log( 'displayRipText| color: ' + strokeColor);
	var scale = scale/4;
	for (var m=0; m<msg.length; m++) {
		var theChar = theFont.getCharByName( msg[m] );
		var charW = theChar.getWidth();

		context.setLineDash( [] );
		context.lineJoin = 'bevel';
		context.strokeStyle = strokeColor;
		context.lineWidth = 1;
		context.beginPath();

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
	// Reset the current draw colors, line patterns, etc.
	applyLineStyle();
}





// ---------------------------------------------------------------------
// RIP_FONT_STYLE
// ---------------------------------------------------------------------
//          Function:  Select current font style, orientation and size
//             Level:  0
//           Command:  Y
//         Arguments:  font:2, direction:2, size:2, res:2
//            Format:  !|Y <font> <direction> <size> <res>
//           Example:  !|Y01000400
//   Uses Draw Color:  NO
// Uses Line Pattern:  NO
//   Uses Line Thick:  NO
//   Uses Fill Color:  NO
// Uses Fill Pattern:  NO
//   Uses Write Mode:  NO
//   Uses Font Sizes:  YES
//     Uses Viewport:  NO                                                > v1.54
// 
// This command sets the font, direction and size for RIP_TEXT commands.
// 
//      Font   Description of Font
//      ---------------------------------------------
//      00     Default 8x8 font            Bit-Mapped
//      01     Triplex Font                Scalable
//      02     Small Font                  Scalable
//      03     Sans Serif Font             Scalable
//      04     Gothic [Old English] Font   Scalable
//      05     Script Font                 Scalable
//      06     Simplex Font                Scalable
//      07     Triplex Script Font         Scalable
//      08     Complex Font                Scalable
//      09     European Font               Scalable
//      0A     Bold Font                   Scalable
// 
// For the Direction parameter, use 00 to indicate horizontal and 01 for
// vertical.
// 
// For the Size parameter, use 01 for the normal default size, 02 for x2
// magnification, 03 for x3 magnification, ... , and 0A for x10
// magnification.
// 
// NOTE:  The Default font is bit-mapped and looks best when drawn in
//        size 1.  In sizes greater than one, the individual pixels are
//        enlarged, giving a jagged look.  This may not be the desired
//        effect.  The fonts 1 - 4 are smooth scalable vector fonts.



function setTextStyle ( p1, p2, p3, p4 ) {
	console.log('setTextStyle|',p1, p2, p3, p4);
	// Update global font variables with new values
	fontStyle = p1;
	fontDirection = p2;
	fontSize = p3;
	console.log('fontStyle: ' + p1 + ' | fontDir: ' + p2 + ' | fontSize: ' + p3 + ' | Reserved: ' + p4);
}

// ---------------------------------------------------------------------
// RIP_TEXT_XY
// ---------------------------------------------------------------------
//          Function:  Draw text in current font/color at specific spot
//             Level:  0
//           Command:  @
//         Arguments:  x:2, y:2 and text-string
//            Format:  !|@ <x> <y> <text-string>
//           Example:  !|@0011hello world
//   Uses Draw Color:  YES
// Uses Line Pattern:  NO
//   Uses Line Thick:  NO
//   Uses Fill Color:  NO
// Uses Fill Pattern:  NO
//   Uses Write Mode:  YES
//   Uses Font Sizes:  YES
//     Uses Viewport:  YES                                               > v1.54
// 
// This command is an efficient combination of RIP_MOVE and RIP_TEXT.
// The text is drawn at the specified location according to the same
// settings as apply to RIP_TEXT (see above).
// 
// The current drawing position is set immediately to the right of the
// drawn text.  Subsequent Line, Circle or other such commands will not
// affect this position.  This provides a means so that you can quickly
// do another RIP_TEXT command (presumably in another color) at a later
// time and have the text show up immediately after the previous text.

function outTextXY ( mx, my, msg ) {
	console.log('outTextXY|', mx, my, msg);
	// Haven't yet implemented the default 8x8 font.
	if (fontStyle) {
		displayRipText( msg, fonts[fontStyle], context, mx, my, fontSize );
	}
}




// temporary global variables while I try to sort out this flood fill algorithm
var visited = [];
var num_flood_calls = 0;


// REWRITE THIS TO USE H,S,L ?  Check the hue?

function colorsAreSimilar( first, second ) {
	var r0 = first[0];
	var g0 = first[1];
	var b0 = first[2];
	var r1 = second[0];
	var g1 = second[1];
	var b1 = second[2];

	// // color sizes
	// var c0 = Math.sqrt( r0*r0 + g0*g0 + b0*b0 );
	// var c1 = Math.sqrt( r1*r1 + g1*g1 + b1*b1 );

	// // distance between normalized colors
	// var dist = Math.sqrt((r0*c1-r1*c0)^2 + (g0*c1-g1*c0)^2 + (b0*c1-b1*c0)^2) / (c0*c1);
	// console.log(c0, c1, dist);

	var rmean = ( r0 + r1 ) / 2;
	var r = r0 - r1;
	var g = g0 - g1;
	var b = b0 - b1;

    var dist = Math.sqrt((((512+rmean)*r*r)>>8) + 4*g*g + (((767-rmean)*b*b)>>8));
	// console.log( first, second, dist );

	if ( dist < 300 ) {
		return true;
	}
	return false;
}

function rgbaToRgb( pixel ) {
	var pd = pixel.data;
	var rgb = [];
	// assumes a black background, which is probably a bad assumption.
	var bg = [0,0,0];
	rgb[0] = ((1 - pd[3]/255) * bg[0]/255) + (pd[3]/255 * pd[0]/255) * 255;
	rgb[1] = ((1 - pd[3]/255) * bg[1]/255) + (pd[3]/255 * pd[1]/255) * 255;
	rgb[2] = ((1 - pd[3]/255) * bg[2]/255) + (pd[3]/255 * pd[2]/255) * 255;
	return rgb;
}

function floodFill ( x, y, border_color ) {
// 	console.log('floodFill|', x, y, border_color );
	var slug = x + ',' + y;
// 	console.log('VISITED:', visited );
// 	console.log( 'fillColor ' + fillColor + ' | strokeColor ' + strokeColor + ' | border_color ' + border_color );
	if ( visited.indexOf( slug ) == -1 ) {
		visited.push( slug );
	}
	num_flood_calls++;

	var pixel = context.getImageData(x,y,1,1);
	var pixel_rgb = [ pixel.data[0], pixel.data[1], pixel.data[2] ];
	var border_rgb = hexToRgb( masterPalette[ currentPalette[border_color] ] );
	var fill_rgb = hexToRgb( fillColor );

// 	console.log( 'COMPARISON: pixel_rgb ' + pixel_rgb + ' | border_rgb ' + border_rgb );
	if (num_flood_calls == 3261 || num_flood_calls == 3262 || num_flood_calls == 3263 || num_flood_calls == 3264 || num_flood_calls == 3265 || num_flood_calls == 3266 || num_flood_calls == 3267 ) {
		console.log( num_flood_calls, pixel.data );
	}

	// Fill (over write) all pixels that are not the border color

	// PROBLEMS:
	// * Canvas strokes are antialiased, which creates big problems
	//   for my simple algorithm, which was meant for jaggy, solid-color lines.
	// * I can't just do a simple "if pixel rgb = border rgb" comparison
	// * Adding some wiggle room (colorsAreSimilar function) helps a tiny bit
	//   but doesn't solve the problem.
	if ( !colorsAreSimilar( pixel_rgb, border_rgb ) ) {
		// write the new color
		var new_pixel = context.createImageData(1,1);
		// Right now just trying to floodfill a solid color.
		// In future will rework this to fill using the
		// current fillstyle pattern.
		var new_rgb = hexToRgb( fillColor );
		new_pixel.data[0]   = new_rgb[0];
		new_pixel.data[1]   = new_rgb[1];
		new_pixel.data[2]   = new_rgb[2];
		new_pixel.data[3]   = 255;
		context.putImageData( new_pixel, x, y );

		var neighbors = [
			[ x-1, y,  ],
			[ x+1, y,  ],
			[ x,   y-1 ],
			[ x,   y+1 ]
		];

		for (var n=0; n<neighbors.length; n++ ) {
			var nslug = neighbors[n][0] + ',' + neighbors[n][1];
			if (
				num_flood_calls < Infinity &&
				visited.indexOf( nslug ) == -1 &&
				neighbors[n][0] > -1 &&
				neighbors[n][1] > -1 &&
				neighbors[n][0] < canvas.width &&
				neighbors[n][1] < canvas.height
			) {
				floodFill( neighbors[n][0], neighbors[n][1], border_color );
			}
		}
    }
}

function strokeRepeatedly() {
	var repeat;
	if (strokeThick==1) {
		repeat = 200;
	}
	else {
		repeat = 200;
	}
	for (var rr=0;rr<repeat;rr++) {
		context.stroke();
	}
}

function fillRepeatedly() {
	var repeat = 200;
	for (var rr=0;rr<repeat;rr++) {
		context.fill();
	}
}



// - - - - - - - - - - - - - - - - - - -
//
// LINES AND EMPTY SHAPES
//
// - - - - - - - - - - - - - - - - - - -

function circle ( xCenter, yCenter, radius ) {
	console.log('circle|', xCenter, yCenter, radius );
	// If I draw a circle in Pablo, it is actually sort of flat.
	// Probably has to do with aspect ratio. So we may need
	// to do some sort of yRadius calculation to emulate.
	// In Pablo a filled circle with xRadius 135 has a yRadius of 105
	// So that would be a difference of 0.7777777778.
	var yRadius = parseInt (radius * 0.7777777778);
	ellipse ( xCenter, yCenter, 0, 360, radius, yRadius );
}

	// RIP_OVAL  or  RIP_OVAL_ARC
function ellipse ( xCenter, yCenter, startAngle, endAngle, xRadius, yRadius ) {
	console.log('ellipse|', xCenter, yCenter, startAngle, endAngle, xRadius, yRadius );
	context.beginPath();
	//x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise
	context.ellipse(xCenter, yCenter, xRadius, yRadius, 0, (startAngle*-1)*Math.PI/180, (endAngle*-1)*Math.PI/180,true);
	context.stroke();
	// strokeRepeatedly();
}

// RIP_ARC
function arc ( xCenter, yCenter, startAngle, endAngle, radius ) {
	console.log('arc|',  xCenter, yCenter, startAngle, endAngle, radius );
	context.beginPath();
	//x,y,r,sAngle,eAngle,counterclockwise
	// We make the angles negative because RIP uses counterclockwise angles
	// while HTML5 uses clockwise angles.
	context.arc(xCenter, yCenter, radius, (startAngle*-1)*Math.PI/180, (endAngle*-1)*Math.PI/180,true);
	context.stroke();
	// strokeRepeatedly();
}

function drawBezierCurve ( x1,y1,x2,y2,x3,y3,x4,y4,count ) {
	console.log('drawBezierCurve|', x1,y1,x2,y2,x3,y3,x4,y4,count );
	// The COUNT variable determines how many line "segments"
	// should be used to render the curve. Since HTML5 spec doesn't
	// have anything comparable, I will ignore it for now.
	context.beginPath();
	context.moveTo( x1, y1 );
	context.bezierCurveTo( x2, y2, x3, y3, x4, y4 );
	context.stroke();
	// strokeRepeatedly();
}

function line ( x0, y0, x1, y1 ) {
	console.log('line|', x0, y0, x1, y1 );
// 	console.log('   stroke-color: ', strokeColor );
// 	console.log('   stroke-style: ', context.strokeStyle );
// 	console.log('   line-dash-offset: ', context.lineDashOffset );
// 	console.log('   line-width: ', context.lineWidth );
// 	console.log('   line-dash: ', context.getLineDash() );
	// if ( strokeThick == 1 && (x0==x1 || y0==y1) ) {
	// 	x0 += 0.5;
	// 	y0 += 0.5;
	// 	x1 += 0.5;
	// 	y1 += 0.5;
	// }
	context.beginPath();
	context.moveTo(x0,y0);
	context.lineTo(x1,y1);
	context.stroke();
	// strokeRepeatedly();
}
function rectangle ( x0, y0, x1, y1 ) {
	console.log('rectangle|', x0, y0, x1, y1 );
	console.log('strokeThick: ' + strokeThick);
	// if (strokeThick == 1) {
	// 	x0 += 0.5;
	// 	y0 += 0.5;
	// 	x1 += 0.5;
	// 	y1 += 0.5;
	// }
	var width = x1-x0;
	var height = y1-y0;
	context.beginPath();
	// x,y = upper left corner
	context.rect( x0, y0, width, height );
	context.stroke();
	// strokeRepeatedly();
}

function dPoly ( isFilled, isPoly, nPoints, command ) {
	console.log('dPoly|', isFilled, isPoly, nPoints, command );
	rawNums = command.match(/.{2}/g);
	// convert command from base36
	var newNums = [];
	for ( p=0; p<rawNums.length; p++ ) {
		var newNum = convert( rawNums[p] );
		newNums.push( newNum );
	}
	// reshape to 2d array
	var points = [];
	while (newNums.length) {
		points.push(newNums.splice(0,2));
	}

	context.beginPath();
	context.moveTo( points[0][0], points[0][1] );
	for (p=1; p<points.length; p++ ) {
		context.lineTo( points[p][0], points[p][1] );
	}
	// FILLED POLYGON IS THE ONLY SHAPE THAT NEEDS CLOSEPATH()
	if (isFilled) {
		context.closePath();
		context.fill();
		// fillRepeatedly()
		// If this is a FILLED polygon and the stroke is set to the background color,
		// then we don't want to actually draw the stroke.
		if ( strokeColor != masterPalette[ currentPalette[0] ] ) {
			//strokeRepeatedly();
			context.stroke();
		}
	}
	else {
		//strokeRepeatedly();
		context.stroke();
	}
}

// - - - - - - - - - - - - - - - - - - - 
//
// FILLED SHAPES
//
// - - - - - - - - - - - - - - - - - - - 

function bar ( x0, y0, x1, y1 ) {
	console.log('bar|', x0, y0, x1, y1 );
	var width = x1-x0;
	var height = y1-y0;
	context.beginPath();
	// x,y = upper left corner
	context.rect( x0, y0, width, height );
	context.fill();
	// fillRepeatedly()
}
function fillEllipse ( xCenter, yCenter, xRadius, yRadius ) {
	console.log('fillEllipse|', xCenter, yCenter, xRadius, yRadius);
	context.beginPath();
	//x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise
	context.ellipse(xCenter, yCenter, xRadius, yRadius, 0, 0, 2 * Math.PI);
	context.fill();
	// fillRepeatedly()
	context.stroke();
	// strokeRepeatedly();
}

// RIP_PIE_SLICE
function pieSlice ( xCenter, yCenter, startAngle, endAngle, radius ) {
	console.log('pieSlice|', xCenter, yCenter, startAngle, endAngle, radius );
	context.beginPath();
 	context.moveTo(xCenter, yCenter);
	context.arc(xCenter, yCenter, radius, (startAngle*-1)*Math.PI/180, (endAngle*-1)*Math.PI/180,true);
 	context.lineTo(xCenter, yCenter);
	context.fill();
	// fillRepeatedly()

	// RIP 1.54 says "The Line Pattern feature does not apply to this command."
	// So, probably need to revisit this. Also check against RIP 2.00.
	// Pablo seems to draw no stroke on the curve, but DOES stroke the straight
	// lines connecting to the center point.

	context.stroke();
	// strokeRepeatedly();
}

//RIP_OVAL_PIE_SLICE
function sector ( xCenter, yCenter, startAngle, endAngle, xRadius, yRadius ) {
	console.log('sector|', xCenter, yCenter, startAngle, endAngle, xRadius, yRadius);
	context.beginPath();
 	context.moveTo(xCenter, yCenter);
	//x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise
	context.ellipse(xCenter, yCenter, xRadius, yRadius, 0, (startAngle*-1)*Math.PI/180, (endAngle*-1)*Math.PI/180, true);
 	context.lineTo(xCenter, yCenter);
	context.fill();
	// fillRepeatedly()
	// RIP 1.54 says "The Line Pattern feature does not apply to this command."
	// So, probably need to revisit this. Also check against RIP 2.00.
	// Pablo seems to draw no stroke on the curve, but DOES stroke the straight
	// lines connecting to the center point.

	context.stroke();
	// strokeRepeatedly();
}

function hexToRgb( hex ) {
// 	console.log( 'hexToRgb|', hex);
	hex = hex.replace('#','');
	r = parseInt(hex.substring(0,2), 16);
	g = parseInt(hex.substring(2,4), 16);
	b = parseInt(hex.substring(4,6), 16);
	return [r,g,b];
}

// should probably rewrite this so I can make use of it in floodFill().
function putPixel ( x, y ) {
	console.log('putPixel|', x, y );
	var pixel = context.createImageData(1,1);
	var color = hexToRgb( strokeColor );
	pixel.data[0]   = color[0];
	pixel.data[1]   = color[1];
	pixel.data[2]   = color[2];
	pixel.data[3]   = 255;
	context.putImageData( pixel, x, y );
}
function setOnePalette ( c, color ) {
	console.log('setOnePalette|',c, color);
	currentPalette[c] = color;
	console.log('(PALETTE)|',currentPalette);
}
function setAllPalette ( colors ) {
	colors = colors.match(/.{2}/g);
	console.log('setAllPalette|',colors);
	for (var c=0; c<colors.length; c++) {
		currentPalette[c] = convert(colors[c]);
	}
	console.log('(PALETTE)|',currentPalette);
}

function getImage ( x0, y0, x1, y1, res ) {
	console.log('getImage|', x0, y0, x1, y1, res );
	sw = x1-x0;
	sh = y1-y0;
	if (sw && sh ) {
		clipboard = context.getImageData( x0, y0, sw, sh );
	}
}
function putImage ( x, y, mode, res ) {
	console.log('putImage|', x, y, mode, res );
	if ( clipboard && mode == 0 ) {
		context.putImageData( clipboard, x, y );
	}
}
function loadIcon ( p1, p2, p3, p4, p5 ) {
	console.log('loadIcon|',p1, p2, p3, p4, p5);
}
function scrollGraph ( p1, p2, p3, p4, p5 ) {
	console.log('scrollGraph|',p1, p2, p3, p4, p5);
}



function parseCommand ( command ) {
	console.log( command );

	if (command == '*') { resetWindows(); };
	if (command.charAt(0) == 'W') {
		setWriteMode (
			convert ( command.substr(1,2) )
		);
	};
	if (command.charAt(0) == 'S') {
		setFillStyle (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) )
		);
	}
	if (command.charAt(0) == 'E') { clearViewport(); };
	if (command.charAt(0) == 'v') {
		setViewport (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) ), ClipOn
		);
	}

	if (command.charAt(0) == 'c' ) {
		setColor (
			convert ( command.substr(1,2) )
		);
	}
	if (command.charAt(0) == '@') {
		outTextXY (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			command.substr(5,command.length-5)
		);
	}
	if (command.charAt(0) == 'Y') {
		setTextStyle (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) )
		);
	}
	if (command.charAt(0) == 's') { 
		setUserPattern(
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) ),
			convert ( command.substr(9,2) ),
			convert ( command.substr(11,2) ),
			convert ( command.substr(13,2) ),
			convert ( command.substr(15,2) ),
			convert ( command.substr(17,2) )
		);
	};
	if (command.charAt(0) == 'Q') {
		setAllPalette(
			command.slice(1)
		);
	};
	if ( command.charAt(0) == 'F' ) {
		visited = [];
		num_flood_calls = 0;
// 		screen.stop();
		console.log( 
			'FLOOD FILL',
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) )
		);
		// Not working well enough yet
// 		floodFill (
// 			convert ( command.substr(1,2) ),
// 			convert ( command.substr(3,2) ),
// 			convert ( command.substr(5,2) )
// 		);
	}
	if ( command.charAt(0) == 'C' ) {
		circle (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) )
		);
	}
	if ( command.charAt(0) == 'B' ) {
		bar (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) )
		);
	}
	// RIP_ARC
	if ( command.charAt(0) == 'A' ) {
		arc (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) ),
			convert ( command.substr(9,2) )
		);
	}
	// RIP_PIE_SLICE
	if ( command.charAt(0) == 'I' ) {
		pieSlice (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) ),
			convert ( command.substr(9,2) )
		);
	}
	// RIP_OVAL_PIE_SLICE
	if ( command.charAt(0) == 'i' ) {
		sector (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) ),
			convert ( command.substr(9,2) ),
			convert ( command.substr(11,2) )
		);
	}
	if ( command.charAt(0) == 'L' ) {
		line (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) )
		);
	}
	if ( command.charAt(0) == 'R' ) {
		rectangle (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) )
		);
	}
	if ( command.charAt(0) == 'o' ) {
		fillEllipse (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) )
		);
	}
	// PROBABLY NEED TO FIX THIS
	// ellipse() should be used for O, but arc() might be better for oval_arc
	// RIP_OVAL  or  RIP_OVAL_ARC
	// rip_oval_arc = !|V <x> <y> <st_ang> <e_ang> <radx> <rady>
	// rip_oval     = !|O <x> <y> <st_ang> <end_ang> <x_rad> <y_rad>

	if (command.charAt(0) == 'O' || command.charAt(0) == 'V') {
		ellipse (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) ),
			convert ( command.substr(9,2) ),
			convert ( command.substr(11,2) )
		);
	}
	// RIP_POLYGON
	//   Uses Draw Color:  YES
	// Uses Line Pattern:  YES
	//   Uses Line Thick:  YES
	//   Uses Fill Color:  NO
	// Uses Fill Pattern:  NO
	if (command.charAt(0) == 'P') {
		dPoly (
			false,
			true,
			convert ( command.substr(1,2) ),
			command.slice(3)
		);
	};

	// RIP_FILL_POLYGON
	//   Uses Draw Color:  YES
	// Uses Line Pattern:  YES
	//   Uses Line Thick:  YES
	//   Uses Fill Color:  YES
	// Uses Fill Pattern:  YES
	if (command.charAt(0) == 'p') {
		dPoly (
			true,
			true,
			convert ( command.substr(1,2) ),
			command.slice(3)
		);
	};

	if ( command.charAt(0) == 'X' ) {
		putPixel (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) )
		);
	}

	if ( command.charAt(0) == 'a' ) {
		setOnePalette (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) )
		);
	}

	if ( command.charAt(0) == '=' ) {
		setLineStyle (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,4) ),
			convert ( command.substr(7,2) )
		);
	}

	// NEED TO RE-DO DPOLY
	// We need to pass the command into the function so it can parse coordinate pairs
	// RIP_POLYLINE
	//   Uses Draw Color:  YES
	// Uses Line Pattern:  YES
	//   Uses Line Thick:  YES
	//   Uses Fill Color:  NO
	// Uses Fill Pattern:  NO
	if ( command.charAt(0) == 'l' ) {
		dPoly (
			false,
			false,
			convert ( command.substr(1,2) ),
			command.slice(3)
		);
	}

	if ( command.charAt(0) == 'Z' ) {
		drawBezierCurve (
			convert ( command.substr(1,2) ),
			convert ( command.substr(3,2) ),
			convert ( command.substr(5,2) ),
			convert ( command.substr(7,2) ),
			convert ( command.substr(9,2) ),
			convert ( command.substr(11,2) ),
			convert ( command.substr(13,2) ),
			convert ( command.substr(15,2) ),
			convert ( command.substr(17,2) )
		);
	}

	if ( command.charAt(0) == '1')  { //level one commands
		if (command.charAt(1) == 'C') {
			getImage (
				convert ( command.substr(2,2) ),
				convert ( command.substr(4,2) ),
				convert ( command.substr(6,2) ),
				convert ( command.substr(8,2) ),
				convert ( command.substr(10,1) )
			);
		}
// 		if (command.charAt(1) == 'P' && clipboard != null) {
		if (command.charAt(1) == 'P' ) {
			putImage (
				convert ( command.substr(2,2) ),
				convert ( command.substr(4,2) ),
				convert ( command.substr(6,2) ),
				convert ( command.substr(8,1) )
// 				Clipboard,//Clipboard^,
			);
		}
		if (command.charAt(1) == 'I') {
			loadIcon (
				convert ( command.substr(2,2) ),
				convert ( command.substr(4,2) ),
				convert ( command.substr(6,2) ),
				convert ( command.substr(8,1) ),
				command.substr(11,command.length-11)
			);
		}
		if (command.charAt(1) == 'G') {
			scrollGraph (
				convert ( command.substr(2,2) ),
				convert ( command.substr(4,2) ),
				convert ( command.substr(6,2) ),
				convert ( command.substr(8,2) ),
				convert ( command.substr(12,2) )
			);
		}
		else {
			console.log('UNIMPLEMENTED COMMAND: ' + command);
		}
	};
};



function parseChar( charCode ) {
	// This is EOF, and can mark the beginning of a SAUCE record
	// Since SAUCE is 128 bytes, just skip over them and we're done.
	if ( charCode == 26 ) {
		// code tk
		stream.increment(128);
	}
	// handle CR / LF
	if ( charCode == 13 || charCode == 10 ) {
		if (bslash == true) {
			stream.increment(1);
			charCode = stream.getData();
			bslash = false;
		}
		else {
			LLL = 0; 
			stream.increment(1);
			charCode = stream.getData();
			if (ripLine == true) {
				ripLine = false 
			}
			else {
				WriteString (charCode, 15);
			}
		};
	}
	// All other characters
	else {
		LLL = LLL + 1;
		if (LLL == 1 && charCode == '!'.charCodeAt(0)) {
			ripLine = true
		}
		else {
			if (ripLine) {
				switch (charCode) {
					case '|'.charCodeAt(0) :
						if (bslash) {
							command = command + String.fromCharCode(charCode);
							bslash = false;
						}
						else if (command > '' ) {
							parseCommand (command);
							command = '';
						};
						break;
					// THIS CASE IS A JOSH ADDITION
					// Without this, the parser skips the first | delimiter after an escaped exclamation mark.
					case '!'.charCodeAt(0) :
						if (bslash) {
							command = command + String.fromCharCode(charCode);
							bslash = false;
						}
						break;
					// END JOSH ADDITION
					case '\\'.charCodeAt(0) :
						if (bslash) {
							command = command + String.fromCharCode(charCode);
							bslash = false;
						}
						else {
							bslash = true;
						}
						break;
					default:
						command = command + String.fromCharCode(charCode);
						break;
				}
			}
			else {
				WriteString (charCode, 15);
			};
		};
	};
}



