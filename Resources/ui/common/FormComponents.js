function FormComponents(){
	// set platform specific variables
	var buttonHeight = 35;
	if (Ti.Platform.osname === 'android') {
		buttonHeight = 50;
	}
	
	var buttonWidth = 180;
	
	var self = {
		buttonMenu: function(params){
			var buttons = {};
			var currTop = 10;
			for (i=0;i<params.length;i++){
				buttons[params[i]] = Ti.UI.createButton({
					title: params[i],
					top: currTop,
					width: buttonWidth,
					height: buttonHeight
				});
				
				currTop += buttonHeight + 10;
			}
			
			return buttons;
		},
		filterSelect: function(params){
			var listView = params.view;
			var cancel = Ti.UI.createButton({
				top: 5,
				left: 5,
			    title: 'Cancel',
			    width: 'auto',
			    height:30
			});
			cancel.addEventListener('click', function(){
				listView.getParent().remove(listView);
			})

			var filterbox = Ti.UI.createTextField({
			    width: 200,
			    top: 5,
			    left: 100,
			    height: 'auto',
			    color: '#000000',
			    backgroundColor: '#ffffff',
			    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
			});
		
			listView.add(cancel);
			listView.add(filterbox);
		
			var rows = [];
			var array = [];
			for (var i=0;i<params.items.length;i++){
				var label = Ti.UI.createLabel({
					color:'#000000',
					backgroundColor:'#ffffff',
					text: params.items[i],
					height:'auto',
					width:'auto',
				});
				var row = Titanium.UI.createTableViewRow({
					height:46
				});
				row.add(label);
				array.push(row);
				rows.push(row);
			}
		
			var tableView = Ti.UI.createTableView({
				top: 40,
				data: array,
				style:Titanium.UI.iPhone.TableViewStyle.GROUPED
			});
		
			filterbox.addEventListener('change', function(e){
				if (this.value.length) {
					var currArray = [];
					for (i=0;i<array.length;i++){
						if (array[i].children[0].text.toLowerCase().indexOf(this.value.toLowerCase())>-1) {
							currArray.push(array[i]);
						}
					}
				} else {
					currArray = array;
				}
				tableView.data = currArray;
			});
					
			listView.add(tableView);
			
			return rows;
		},
		test: function(view){
			var testView = Ti.UI.createView({
				top: 0,
				backgroundColor: '#ffffff',
				width: '100%',
				height: '100%',
				zIndex: 1
			});
		
			var label = Ti.UI.createLabel({text:'Hello World'});
		
			testView.add(label);
		
			view.add(testView);
		}
	};
	
	return self;
}

module.exports = FormComponents;
