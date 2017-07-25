// ==UserScript==
// @name         8Muses Downloader
// @namespace    https://github.com/Kayla355
// @version      0.1
// @description  Download comics from 8muses.com
// @author       Kayla355
// @match        https://www.8muses.com/comix/album/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @icon         https://www.8muses.com/favicon.ico
// @require      https://cdn.jsdelivr.net/jszip/3.1.3/jszip.min.js
// @require      https://cdn.jsdelivr.net/filesaver.js/1.3.3/FileSaver.min.js
// ==/UserScript==
var progress = {
	current: 0,
	items: 0
};

(function() {
    'use strict';
	init();
})();

function init() {
	var imagebox = document.querySelector('.gallery .image-box:not(.image-a)');
    if(imagebox) {
		var isImageAlbum = !!imagebox.href.match(/comix\/picture\//i);
		if(isImageAlbum) {
			createElements('single');
		} else {
			createElements('multi');
		}
	} else {
		setTimeout(init, 100);
	}
}

function createElements(type) {
	if(!type) type = 'single';
	var downloadText = (type == "multi") ? 'Download All':'Download';
	var div = document.createElement('div');
			div.className += 'download show-tablet show-desktop block';
			div.style = "background-color: #3a4050; margin-right: -20px; margin-left: 21px;";
	var a = document.createElement('a');
			a.href = "#";
			a.style = "color: #fff; text-decoration: none; padding: 15px 20px 15px 10px;";
			a.innerHTML = '<i class="fa fa-arrow-down icon-inline" style="color: #242730;"></i>'+ downloadText;
			a.onclick = (type == "multi") ? downloadAll:downloadComic;
	var bar = document.createElement('div');
			bar.innerHTML = `<div class="loading-bar" style="position: absolute; right: 0px; top: 50px; background-color: aliceblue; display: none;">
				<center class="value" style="position: absolute; left: 0px; right: 0px; color: #242730;">0%</center>
				<div class="progressbar" style="width: 0%; height:20px; background-color: #b1c6ff;"></div>
			</div>`;
	div.append(a);
	document.querySelector('#top-menu > div.top-menu-right').append(div);
	bar.querySelector('.loading-bar').style.width = document.querySelector('#top-menu > div.top-menu-right .download').clientWidth+'px';
	document.querySelector('#content').append(bar);
}

function updateProgressbar(status, hide) {
	status = (typeof status === "string") ? status:status+'%';
	if(hide) {
		document.querySelector('.loading-bar').style.display = 'none';
	} else {
		document.querySelector('.loading-bar').style.display = '';
		document.querySelector('.loading-bar .value').innerText = status;
		document.querySelector('.loading-bar .progressbar').style.width = status;
	}
}

function downloadComic(container) {
	var imageContainers = (container.length) ? container:document.querySelectorAll('.gallery .image-box:not(.image-a)');
	var images = [];
	var doneLength = 0;
	var isImageAlbum = !!imageContainers[0].attributes.href.value.match(/comix\/picture\//i);

	if(!container.length) updateProgressbar(0);
	if(isImageAlbum) progress.items += imageContainers.length;

	for(var i=0; i < imageContainers.length; i++) {
		images.push({href: location.protocol +'//'+ location.hostname + imageContainers[i].attributes.href.value});

		getPage(i, images[i], function(j, object) {
			images[j].path = object.path;
			images[j].name = object.name;
			images[j].imageHref = object.imageHref;
			images[j].blob = object.blob;
			doneLength++;

			if(!container.length) {
				updateProgressbar(Math.round((doneLength/imageContainers.length)*100));
			} else if(isImageAlbum) {
				progress.current++;
				updateProgressbar(Math.round((progress.current/progress.items)*100));
			}

			if(doneLength >= imageContainers.length) generateZip(images);
		})
	}
}

function downloadAll(container) {
	var itemContainers = (container.length) ? container:document.querySelectorAll('.gallery .image-box:not(.image-a)');
	var items = [];
	var doneLength = 0;

	if(!container.length) updateProgressbar(0);

	for(var i=0; i < itemContainers.length; i++) {
		let href = location.protocol +'//'+ location.hostname + itemContainers[i].attributes.href.value;
		getImageAlbum(href, function(albumContainer) {
			var imagebox = albumContainer.querySelectorAll('.gallery .image-box:not(.image-a)');
			var isImageAlbum = !!imagebox[0].attributes.href.value.match(/comix\/picture\//i);

			if(isImageAlbum) {
				downloadComic(imagebox);
			} else {
				downloadAll(imagebox);
			}
		})
	}
}

function getImageAlbum(url, callback) {
	var xhr = new XMLHttpRequest();
			xhr.open('GET', url);
			xhr.onload = function(e) {
				var container = document.implementation.createHTMLDocument().documentElement;
      	container.innerHTML = xhr.responseText;
				callback(container);
			};
			xhr.send();
}

function getPage(i, image, callback) {
	var object = {};
	var xhr = new XMLHttpRequest();
			xhr.open('GET', image.href);
			// xhr.responseType = 'blob';
			xhr.onload = function(e) {
				var container = document.implementation.createHTMLDocument().documentElement;
      	container.innerHTML = xhr.responseText;
      	
      	object.path = image.href.match(/^.*?[0-9]+\/(.*\/).*$/)[1]; // including author
      	// object.path = image.href.match(/^.*?[0-9]+\/.*?\/(.*\/).*$/)[1]; 		// no author
      	object.name = container.querySelector('.top-menu-breadcrumb li:last-of-type').innerText.trim();
      	object.imageHref = 'https://cdn.ampproject.org/i/s/www.8muses.com' + container.querySelector('#imageDir').value + container.querySelector('#imageName').value;

      	getImageAsBlob(object.imageHref, function(blob) {
      		if(!blob) return;
      		object.blob = blob;
      		callback(i, object);
      	})
			};
			xhr.send();
}

function getImageAsBlob(url, callback) {
	GM_xmlhttpRequest({
	    url: url,
	    method: 'GET',
	    responseType: 'blob',
	    onload: function(xhr) {
	        var blob = xhr.response;

	        callback(blob);
	        
	    }
	});

	// Non-GM CORS xhr request.
	// var xhr = new XMLHttpRequest();
	// 		xhr.open('GET', 'https://cors-anywhere.herokuapp.com/'+object.imageHref);
	// 		xhr.responseType = 'blob';
	// 		xhr.onload = function(e) {
	// 			var blob = xhr.response;
	//			callback(blob);
	// 		}
	// xhr.send();
}

function generateZip(images) {
	var zip = new JSZip();
	for(var i=0; i < images.length; i++) {
		zip.file(images[i].name, images[i].blob);
	}

	// Blob
  zip.generateAsync({type:"blob"}).then(function (blob) {
  	var filename = getFileName(images[0].path);
  	if(progress.current === progress.items) updateProgressbar('Done!');
    saveAs(blob, filename+'.zip');
  }, function (err) {
      console.error('Error saving zip: ' +err);
  });
}

function getFileName(pathname) {
	var pathArray = pathname.replace(/\/$/, '').split('/');
	var filename = "";

	for(var i=0; i<pathArray.length; i++) {
		let partialName;

		if(i === 0)	partialName = '['+ pathArray[i] +']';
		if(i === 1) partialName = pathArray[i];
		if(i >= 2) partialName = ' - '+ pathArray[i];

		filename += partialName;
	}

	return filename;
}
