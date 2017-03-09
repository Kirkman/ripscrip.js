<!doctype html>
<meta charset="UTF-8">
<html>
<head>
	<title>RIPscrip viewer</title>
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css" />
	<link rel="stylesheet" href="style.css" />
	<style>
/* 
		canvas {
		  image-rendering: optimizeSpeed;
		  image-rendering: -moz-crisp-edges;
		  image-rendering: -webkit-optimize-contrast;
		  image-rendering: -o-crisp-edges;
		  image-rendering: pixelated;
		  -ms-interpolation-mode: nearest-neighbor;
		}
 */
	</style>
</head>

<body>
	<section id="main">
	<h1>RIPscrip viewer</h1>
	<p>This is an experimental RIP graphics viewer which uses the HTML5 &lt;canvas&gt; element and Javascript.</p>

	<!--
	<h3>Upload a RIP file</h3>
	<input type="file" id="fileSelector" onchange="parseFile(this.files)">
	-->
	<h3>Choose a RIP file</h3>
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

			$files = getFileList("./files", true);
			foreach( $files as $file ){
				$filename = $file['name'];
				if ($filename != '.' && $filename != '..' && substr($filename, -1) != '/' ) {
					echo '<option value="' . $filename . '">' . str_replace('./files/','',$filename) . '</option>';
				}
			}
		?>
	</select>

	<br/><input type="checkbox" id="full-screen" name="full-screen" value="true">
	<label for="full-screen"> Full-screen mode</label>
	<br/><input type="checkbox" id="diagnostic" name="diagnostic" value="true">
	<label for="diagnostic"> Diagnostic mode</label>
	<br/>
	<select id="speed" style="display:none;">
		<option value="300" selected="true">300 bps</option>
		<option value="600">600 bps</option>
		<option value="1200">1200 bps</option>
		<option value="2400">2400 bps</option>
		<option value="4800">4800 bps</option>
		<option value="9600">9600 bps</option>
		<option value="14400">14400 bps</option>
	</select>

	<div id="canvas-container">
		<canvas id="atascii" class="container"></canvas>
		<div id="canvas-overlay" class="diagnostic"></div>
		<div id="x-axis" class="diagnostic"></div>
		<div id="y-axis" class="diagnostic"></div>
	</div>
	</section>

	<section id="screen-captures">
		<img id="capture" crossOrigin="anonymous" />
	</section>

	<canvas id="fillPattern" class="container"></canvas>
	<canvas id="strokePattern" class="container"></canvas>

	<section id="background-info" style="display:none;">
	<h3>What is RIP?</h3>
	<p></p>
	<p>Here are a few places to learn more about RIPscrip:</p>
	<ul>
		<li></li>
	</ul>
	</section>

	<!-- polyfill for add ellipse() and a few other canvas-related things -->
	<script src="canvasv5.js"></script>
	<script src="borland.js"></script>
	<script src="ripscrip.js?4"></script>

</body>
</html>
