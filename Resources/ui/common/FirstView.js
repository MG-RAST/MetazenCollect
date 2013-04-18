//FirstView Component Constructor
function FirstView() {
	//create object instance, a parasitic subclass of Observable
	var self = Ti.UI.createView();
	
	//label using localization-ready strings from <app dir>/i18n/en/strings.xml
	var label = Ti.UI.createLabel({
		color:'#000000',
		text:String.format(L('welcome'),'Metazen'),
		top: 10,
		height:'auto',
		width:'auto'
	});
	self.add(label);
	
	//Add behavior for UI
	label.addEventListener('click', function(e) {
		alert(e.source.text);
	});
	
	var url = "http://api.metagenomics.anl.gov/api2.cgi/metagenome/mgm4440026.3?verbosity=full";
 	var client = Ti.Network.createHTTPClient({
     	// function called when the response data is available
     	onload : function(e) {
     		var mg = JSON.parse(this.responseText);
       	 	alert('You loaded the metagenome '+mg.name);
	    },
		// function called when an error occurs, including a timeout
     	onerror : function(e) {
        	Ti.API.debug(e.error);
         	alert('error');
     	},
     	timeout : 5000  // in milliseconds
	 });
	
	var button = Ti.UI.createButton({
		title: 'get data',
		top: 50,
		width: 'auto',
		height: 50
	});
	self.add(button);
		
	button.addEventListener('click', function(e) {
		// Prepare the connection.
 		client.open("GET", url);
 		// Send the request.
 		client.send();
	});
	
	var cameraButton = Ti.UI.createButton({ title: 'take picture' });
	self.add(cameraButton);
	cameraButton.addEventListener('click', function(e){
		Ti.Media.showCamera({
			mediaTypes: [ Ti.Media.MEDIA_TYPE_PHOTO ],
			saveToPhotoGallery: true,
			success: function(e){
				var imageView = Titanium.UI.createImageView({
					image: e.media,
					//width: 300,
					height: 300,
					top: 120
				});
				self.add(imageView);
			},
			error: function(e){
				alert(JSON.stringify(e));
			},
			cancel: function(e){
				alert('Photo cancelled.')
			} });
	});
	
	return self;
}

module.exports = FirstView;
