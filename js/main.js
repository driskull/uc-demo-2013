define([
    "dojo/ready", 
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/connect",
    "dojo/_base/array",
    "esri/arcgis/utils",
    "esri/IdentityManager",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-construct",
    "esri/toolbars/draw",
    "esri/layers/GraphicsLayer",
    "esri/graphic",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "esri/request",
    "dojo/json",
    "dojo/dom-style",
    "dojo/number",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "esri/symbols/PictureMarkerSymbol",
    "dojo/query",
    "esri/geometry/Point",
    "esri/geometry/webMercatorUtils",
    "esri/SpatialReference",
    "esri/InfoTemplate"
],
function(
    ready, 
    declare,  
    lang,
    connect,
    array,
    arcgisUtils,
    IdentityManager,
    on, dom, domConstruct, Draw, GraphicsLayer, Graphic, SimpleFillSymbol, SimpleLineSymbol, Color, esriRequest, JSON, domStyle,
    number,
    BorderContainer, ContentPane,
    PictureMarkerSymbol,
    query,
    Point,
    webMercatorUtils,
    SpatialReference,
    InfoTemplate
) {


    return declare("", null, {
        config: {},
        constructor: function(config) {
    
            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information. 
            this.config = config;

            ready(lang.hitch(this, function() {
                
                
                var bc = new BorderContainer({}, dom.byId('bc'));
            
                // create a ContentPane as the left pane in the BorderContainer
                var cp1 = new ContentPane({
                    region: "top"
                }, dom.byId('cptop'));
                bc.addChild(cp1);
            
                // create a ContentPane as the center pane in the BorderContainer
                var cp2 = new ContentPane({
                    region: "center",
                }, dom.byId('cpcenter'));
                bc.addChild(cp2);
                
                bc.startup();
                
                
                this._createWebMap();
            }));
        },
        // get population chart data
        queryData: function(geometry) {
            var _self = this;
            
            // http://cholula.esri.com:6080/arcgis/rest/services/World/MapServer/exts/BAServer/Geoenrichment/enrich
            // http://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich
            esriRequest({
                url: 'http://cholula.esri.com:6080/arcgis/rest/services/World/MapServer/exts/BAServer/Geoenrichment/enrich',
                content: {
                    "studyareas": JSON.stringify([{
                        "geometry": {
                            "rings": geometry.rings,
                            "spatialReference": {
                                "wkid": geometry.spatialReference.wkid
                            }
                        },
                        "attributes": {
                            "id": "1",
                            "name": "optional polygon area name"
                        }
                    }]),
                    "f": "json",
                    "returnGeometry": false,
                    "usedata": JSON.stringify({
                        "sourcecountry": "US"
                    }),
                    "datacollections": JSON.stringify(["KeyUSFacts", "Age"]),
                    "insr": JSON.stringify({
                        "wkid": geometry.spatialReference.wkid
                    }),
                    "outsr": JSON.stringify({
                        "wkid": geometry.spatialReference.wkid
                    })
                },
                timeout: 20000,
                handleAs: "json",
                callbackParamName: "callback",
                load: function(data) {
                    var featureSet = data.results[0].value.FeatureSet[0];
                    _self.showData(featureSet);
                }
            });
        },
        showData: function(fs){

            var attributes = fs.features[0].attributes;
            
            console.log(attributes);
            
            var node;
            
            var AVGVAL_CY = number.format(attributes.AVGVAL_CY);
            node = dom.byId('AVGVAL_CY');
            if(node){
                node.innerHTML = '<h2>$' + AVGVAL_CY + '</h2><p>2013 Average Home value</p>';
            }
            
            var TOTPOP_CY = number.format(attributes.TOTPOP_CY);
            node = dom.byId('TOTPOP_CY');
            if(node){
                node.innerHTML = '<h2>' + TOTPOP_CY + '</h2><p>2013 Total Population</p>';
            }
            
            var TOTHH_CY = number.format(attributes.TOTHH_CY);
            node = dom.byId('TOTHH_CY');
            if(node){
                node.innerHTML = '<h2>' + TOTHH_CY + '</h2><p>2013 Total Households</p>';
            }
            
            var AVGHINC_CY = number.format(attributes.AVGHINC_CY);
            node = dom.byId('AVGHINC_CY');
            if(node){
                node.innerHTML = '<h2>$' + AVGHINC_CY + '</h2><p>2013 Average Household Income</p>';
            }
            
            domStyle.set(dom.byId('geoData'), 'display', 'block');
            
            

            
            var chartCats = ["0-4", "5-9", "10-14", "15-19", "20-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75-84", "85+"];
            var chartData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            var i;
            // create series objects
            if (fs.fields) {
                for (i = 0; i < fs.fields.length; i++) {
                    if (fs.fields[i].name === 'MALE0') {
                        chartData[0] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE5') {
                        chartData[1] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE10') {
                        chartData[2] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE15') {
                        chartData[3] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE20') {
                        chartData[4] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE25') {
                        chartData[5] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE30') {
                        chartData[5] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE35') {
                        chartData[6] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE40') {
                        chartData[6] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE45') {
                        chartData[7] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE50') {
                        chartData[7] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE55') {
                        chartData[8] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE60') {
                        chartData[8] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE65') {
                        chartData[9] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE70') {
                        chartData[9] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE75') {
                        chartData[10] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE80') {
                        chartData[10] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'MALE85') {
                        chartData[11] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM0') {
                        chartData[0] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM5') {
                        chartData[1] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM10') {
                        chartData[2] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM15') {
                        chartData[3] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM20') {
                        chartData[4] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM25') {
                        chartData[5] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM30') {
                        chartData[5] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM35') {
                        chartData[6] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM40') {
                        chartData[6] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM45') {
                        chartData[7] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM50') {
                        chartData[7] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM55') {
                        chartData[8] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM60') {
                        chartData[8] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM65') {
                        chartData[9] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM70') {
                        chartData[9] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM75') {
                        chartData[10] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM80') {
                        chartData[10] += fs.features[0].attributes[fs.fields[i].name];
                    }
                    if (fs.fields[i].name === 'FEM85') {
                        chartData[11] += fs.features[0].attributes[fs.fields[i].name];
                    }
                }
            }
            
            
            var data = {
            	labels : chartCats,
            	datasets : [
            		{
            			fillColor : "rgba(220,220,220,0.5)",
            			strokeColor : "rgba(220,220,220,1)",
            			data : chartData
            		}
            	]
            };
            
            
            var options = {
    				
            	//Boolean - If we show the scale above the chart data			
            	scaleOverlay : false,
            	
            	//Boolean - If we want to override with a hard coded scale
            	scaleOverride : false,
            	
            	//** Required if scaleOverride is true **
            	//Number - The number of steps in a hard coded scale
            	scaleSteps : null,
            	//Number - The value jump in the hard coded scale
            	scaleStepWidth : null,
            	//Number - The scale starting value
            	scaleStartValue : null,
            
            	//String - Colour of the scale line	
            	scaleLineColor : "rgba(255,255,255,.1)",
            	
            	//Number - Pixel width of the scale line	
            	scaleLineWidth : 1,
            
            	//Boolean - Whether to show labels on the scale	
            	scaleShowLabels : false,
            	
            	//Interpolated JS string - can access value
            	scaleLabel : "<%=value%>",
            	
            	//String - Scale label font declaration for the scale label
            	scaleFontFamily : "'Arial'",
            	
            	//Number - Scale label font size in pixels	
            	scaleFontSize : 16,
            	
            	//String - Scale label font weight style	
            	scaleFontStyle : "bold",
            	
            	//String - Scale label font colour	
            	scaleFontColor : "#fff",	
            	
            	///Boolean - Whether grid lines are shown across the chart
            	scaleShowGridLines : true,
            	
            	//String - Colour of the grid lines
            	scaleGridLineColor : "rgba(255,255,255,.05)",
            	
            	//Number - Width of the grid lines
            	scaleGridLineWidth : 1,	
            
            	//Boolean - If there is a stroke on each bar	
            	barShowStroke : true,
            	
            	//Number - Pixel width of the bar stroke	
            	barStrokeWidth : 2,
            	
            	//Number - Spacing between each of the X value sets
            	barValueSpacing : 5,
            	
            	//Number - Spacing between data sets within X values
            	barDatasetSpacing : 1,
            	
            	//Boolean - Whether to animate the chart
            	animation : true,
            
            	//Number - Number of animation steps
            	animationSteps : 60,
            	
            	//String - Animation easing effect
            	animationEasing : "easeOutQuart",
            
            	//Function - Fires when the animation is complete
            	onAnimationComplete : null
            	
            };
            var ctx = document.getElementById("ageChart").getContext("2d");
            var myNewChart = new Chart(ctx).Bar(data, options);
        },
        clearDraw: function() {
            var _self = this;
            if(_self._graphicsLayer){
                _self._graphicsLayer.clear();   
            }
            _self._toolbar.deactivate()
            domStyle.set(dom.byId('geoData'), 'display', 'none');
        },
        // add drawed geometry to map
        addToMap: function(geometry) {
            var _self = this;
            if (_self._graphicsLayer) {
                _self.clearDraw();
            } else {
                _self._graphicsLayer = new GraphicsLayer();
                _self.map.addLayer(_self._graphicsLayer);
            }
            if (geometry) {
                _self._toolbar.deactivate();
                var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]));
                var graphic = new Graphic(geometry, symbol);
                _self._graphicsLayer.add(graphic);
                _self.queryData(geometry);
            }
        },
        // create drawing toolbar
        createToolbar: function() {
            var _self = this;
            _self._toolbar = new Draw(_self.map);
            connect.connect(_self._toolbar, "onDrawEnd", function(geometry) {
                _self.addToMap(geometry);
            });
        },
        toggleDraw: function() {
            var _self = this;
            _self._toolbar.activate(Draw.POLYGON);
            domStyle.set(dom.byId('clearButton'), 'display', 'block');
        },
        placeDrawButton: function() {
            var _self = this;
            var html = '<div class="draw" id="draw"><div id="drawButton">Draw Impact Area</div><div id="clearButton" style="display:none;">Clear Impact Area</div></div>';
            domConstruct.place(html, dom.byId('drawContainer'));
            // on toggle clicks
            on(dom.byId("drawContainer"), "#drawButton:click", function() {
                _self.toggleDraw();
            });
            // on toggle clicks
            on(dom.byId("drawContainer"), "#clearButton:click", function() {
                _self.clearDraw();
                domStyle.set(dom.byId('clearButton'), 'display', 'none');
            });
            _self.createToolbar();
        },
        
        
            
          //create a map based on the input web map id
          _createWebMap: function(){
            var _self = this;
            arcgisUtils.createMap(this.config.webmap, "mapDiv",{
                mapOptions: {
                    //Optionally define additional map config here for example you can 
                    //turn the slider off, display info windows, disable wraparound 180, slider position and more. 
                },
                bingMapsKey: this.config.bingmapskey
            }).then(lang.hitch(this, function(response){
                //Once the map is created we get access to the response which provides important info 
                //such as the map, operational layers, popup info and more. This object will also contain
                //any custom options you defined for the template. In this example that is the 'theme' property.
                //Here' we'll use it to update the application to match the specified color theme.  
                //console.log(this.config);

                this.map = response.map;
                
                
                
                
                esriRequest({
                    url: "http://www.digitalglobe.com/firstlookrss/events.rss",
                    timeout: 20000,
                    handleAs: "xml",
                    load: function(xml) {
                        
                        var items = query("item", xml);
                        array.forEach(items, function(item, index){
                            
                            var attributes = {};
                            
                            var image = query('image', item)[0].firstChild.nodeValue;
                            var georss = query('*|point', item)[0].firstChild.nodeValue;
                            //var news_url = query('news_url', item)[0].firstChild.nodeValue;
                            //var active = query('active', item)[0].firstChild.nodeValue;
                            var title  = query('title', item)[0].firstChild.nodeValue;
                            var description = query('description', item)[0].firstChild.nodeValue;
                            //var categories = query('categories', item)[0].firstChild.nodeValue;
                            //var eventDate = query('eventDate', item)[0].firstChild.nodeValue;
                            //var firstWatch_url = query('firstWatch_url', item)[0].firstChild.nodeValue;
                            

                            
                            
                            if(georss){
                                var split = georss.split(" ");
                                var y = parseFloat(split[0]);
                                var x = parseFloat(split[1]);
                                var pt = new Point(x,y, new SpatialReference({ wkid: 4326 }));
                                
                                var geometry = webMercatorUtils.geographicToWebMercator(pt);
                                
                                console.log(geometry);
                            }


                            var symbol = new PictureMarkerSymbol(image, 32, 32);
                            
                            var infoTemplate = new InfoTemplate("Attributes", "${*}");
                            
                            var graphic = new Graphic(geometry, symbol, attributes, infoTemplate);
                            
                            
    
                            
                     
                            _self.map.graphics.add(graphic);
                            
                            
                        
                        });
                        
                    }
                });
                

                                
                
                if(this.map.loaded){
                    this.placeDrawButton(); 
                }
                else{
                    on(this.map, "load", function(){
                        this.placeDrawButton(); 
                    });   
                }

            }), lang.hitch(this, function(error){
                //an error occurred - notify the user. In this example we pull the string from the 
                //resource.js file located in the nls folder because we've set the application up 
                //for localization. If you don't need to support mulitple languages you can hardcode the 
                //strings here and comment out the call in index.html to get the localization strings. 
                if(this.config && this.config.i18n){
                    alert(this.config.i18n.map.error + ": " + error.message);
                }else{
                    alert("Unable to create map: " + error.message);
                }

            }));

          }
    });
});