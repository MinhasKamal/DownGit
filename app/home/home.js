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
						var parameter = {url: $routeParams.url,
										fileName: $routeParams.fileName,
										rootDirectory: $routeParams.rootDirectory};
						var progress = {isProcessing: $scope.isProcessing,
										downloadedFiles: $scope.downloadedFiles,
										totalFiles: $scope.totalFiles};
						homeService.downloadZippedFiles(parameter, progress);
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
		var repoInfo = {};
		var downloadFileName = "";
		var rootDirectoryName = "";

		var resolveUrl = function(url){
			var repoPath = new URL(url).pathname;
			var splitPath = repoPath.split("/");

			var resolvedUrl = {};
			resolvedUrl.author = splitPath[1];
			resolvedUrl.repository = splitPath[2];
			resolvedUrl.branch = splitPath[4];
			resolvedUrl.rootFolderName = splitPath[splitPath.length-1];
			resolvedUrl.directoryPath = repoPath.substring(repoPath.indexOf(splitPath[4])+splitPath[4].length+1);
			resolvedUrl.urlPrefix = "https://api.github.com/repos/"+resolvedUrl.author+
					"/"+resolvedUrl.repository+"/contents/";
			resolvedUrl.urlPostfix = "?ref="+resolvedUrl.branch;

			return resolvedUrl;
		}

		var downloadDir = function(progress){
			progress.isProcessing.val=true;

			var dirPaths = [];
			var files = [];
			var requestedPromises = [];
			
			if(!downloadFileName || downloadFileName==""){
				downloadFileName = repoInfo.rootFolderName;
			}
			if(rootDirectoryName=="false"){
				rootDirectoryName = "";
			}else if(!rootDirectoryName || rootDirectoryName=="" || rootDirectoryName=="true"){
				rootDirectoryName = repoInfo.rootFolderName+"/";
			}else{
				rootDirectoryName = rootDirectoryName+"/";
			}

			dirPaths.push(repoInfo.directoryPath);
			mapFileAndDirectory(dirPaths, files, requestedPromises, progress);
		}

		var mapFileAndDirectory = function(dirPaths, files, requestedPromises, progress){
			$http.get(repoInfo.urlPrefix+dirPaths.pop()+repoInfo.urlPostfix).then(function (response){
				for (var i=response.data.length-1; i>=0; i--){
					if(response.data[i].type=="dir"){
						dirPaths.push(response.data[i].path);
					}else{
						getFile(response.data[i].path, response.data[i].download_url,
							files, requestedPromises, progress);
					}
				}

				if(dirPaths.length<=0){
					downloadFiles(files, requestedPromises, progress);
				}else{
					mapFileAndDirectory(dirPaths, files, requestedPromises, progress);
				}
			});
		}

		var downloadFiles = function(files, requestedPromises, progress){
			var zip = new JSZip();
			$q.all(requestedPromises).then(function(data) {
				for(var i=files.length-1; i>=0; i--){
					zip.file(rootDirectoryName+files[i].path.substring(repoInfo.directoryPath.length+1),
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
			downloadZippedFiles: function(parameter, progress){
				var resolvedUrl = resolveUrl(parameter.url);

				if(!resolvedUrl.directoryPath || resolvedUrl.directoryPath==""){
					if(!resolvedUrl.branch || resolvedUrl.branch==""){
						resolvedUrl.branch="master";
					}

					var downloadUrl = "https://github.com/"+resolvedUrl.author+"/"+
						resolvedUrl.repository+"/archive/"+resolvedUrl.branch+".zip";
					
					window.location = downloadUrl;
				}else {
					downloadFileName = parameter.fileName;
					rootDirectoryName = parameter.rootDirectory;
					repoInfo = resolvedUrl;
					downloadDir(progress);
				}
			},
		};
	}
]);
