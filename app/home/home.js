/***********************************************************
* Developer: Minhas Kamal (minhaskamal024@gmail.com)       *
* Website: https://github.com/MinhasKamal/DownGit          *
* License: MIT License                                     *
***********************************************************/

'use strict';

var homeModule = angular.module('homeModule', [
	'ngRoute',
]);

homeModule.config([
	'$routeProvider',

	function ($routeProvider) {
		$routeProvider
			.when('/home', {
				templateUrl: 'app/home/home.html',
				controller: [
				'$scope',
				'$routeParams',
				'$location',
				'toastr',
				'homeService',

				function($scope, $routeParams, $location, toastr, homeService){
					$scope.downUrl="";
					$scope.url="";
					$scope.isProcessing={val: false};
					$scope.downloadedFiles={val: 0};
					$scope.totalFiles={val: 0};

					var templateUrl = "github.com";
					var downloadUrlPrefix = "https://minhaskamal.github.io/DownGit/#/home?url=";

					if($routeParams.url){
						$scope.url=$routeParams.url;
					}

					if($scope.url.match(templateUrl)){
						var progress = {isProcessing: $scope.isProcessing,
										downloadedFiles: $scope.downloadedFiles,
										totalFiles: $scope.totalFiles};
						homeService.downloadZippedFiles($scope.url, progress);
					}else if($scope.url!=""){
						toastr.warning("Invalid URL",{iconClass: 'toast-down'});
					}

					$scope.createDownLink = function(){
						$scope.downUrl="";

						if(!$scope.url){
							return;
						}

						if($scope.url.match(templateUrl)){
							$scope.downUrl = downloadUrlPrefix + $scope.url;
						}else if($scope.url!=""){
							toastr.warning("Invalid URL",{iconClass: 'toast-down'});
						}
					};

				}],
			});
	}
]);

homeModule.factory('homeService', [
	'$http',
	'$q',
	
	function ($http, $q) {
		var urlPrefix = "";
		var urlPostfix = "";

		var resolveUrl = function(url){
			var repoPath = new URL(url).pathname;
			var splitPath = repoPath.split("/", 5);

			var resolvedUrl = {};
			resolvedUrl.author = splitPath[1];
			resolvedUrl.repository = splitPath[2];
			resolvedUrl.branch = splitPath[4];
			resolvedUrl.directoryPath = repoPath.split(resolvedUrl.branch+"/", 2)[1];

			return resolvedUrl;
		}

		var downloadDir = function(resolvedUrl, progress){
			progress.isProcessing.val=true;
			urlPrefix = "https://api.github.com/repos/"+resolvedUrl.author+
				"/"+resolvedUrl.repository+"/contents/";
			urlPostfix = "?ref="+resolvedUrl.branch;

			var dirPaths = [];
			var files = [];
			var requestedPromises = [];

			dirPaths.push(resolvedUrl.directoryPath);
			mapFileAndDirectory(dirPaths, files, requestedPromises, progress, resolvedUrl);
		}

		var mapFileAndDirectory = function(dirPaths, files, requestedPromises, progress, resolvedUrl){
			$http.get(urlPrefix+dirPaths.pop()+urlPostfix).then(function (response){
				for (var i=response.data.length-1; i>=0; i--){
					if(response.data[i].type=="dir"){
						dirPaths.push(response.data[i].path);
					}else{
						getFile(response.data[i].path, response.data[i].download_url,
							files, requestedPromises, progress);
					}
				}

				if(dirPaths.length<=0){
					downloadFiles(files, requestedPromises, progress, resolvedUrl);
				}else{
					mapFileAndDirectory(dirPaths, files, requestedPromises, progress, resolvedUrl);
				}
			});
		}

		var downloadFiles = function(files, requestedPromises, progress, resolvedUrl){
			var dirSplits = resolvedUrl.directoryPath.split("/");
			var downloadFileName = decodeURI(dirSplits[dirSplits.length-1]);

			var zip = new JSZip();
			$q.all(requestedPromises).then(function(data) {
				for(var i=files.length-1; i>=0; i--){
					zip.file(downloadFileName+"/"+files[i].path.split(downloadFileName+"/")[1],
						files[i].data);
				}

				progress.isProcessing.val=false;
				zip.generateAsync({type:"blob"}).then(function(content) {
					saveAs(content, downloadFileName+".zip");
				});
			});
		}

		var getFile = function (path, url, files, requestedPromises, progress) {
			var promise = $http.get(url, {responseType: "arraybuffer"}).then(function (file){
				files.push({path:path, data:file.data});
				progress.downloadedFiles.val = files.length;
			}, function(error){
				console.log(error);
			});
			requestedPromises.push(promise);
			progress.totalFiles.val = requestedPromises.length;
		}

		return {
			downloadZippedFiles: function(url, progress){
				var resolvedUrl = resolveUrl(url);

				if(!resolvedUrl.directoryPath || resolvedUrl.directoryPath==""){
					if(!resolvedUrl.branch || resolvedUrl.branch==""){
						resolvedUrl.branch="master";
					}

					var downloadUrl = "https://github.com/"+resolvedUrl.author+"/"+
						resolvedUrl.repository+"/archive/"+resolvedUrl.branch+".zip";
					
					window.location = downloadUrl;
				}else {
					downloadDir(resolvedUrl, progress);	
				}
			},
		};
	}
]);

