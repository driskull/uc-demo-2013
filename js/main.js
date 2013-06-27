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
    "dojo/dom-class",
    "dojo/number",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "esri/symbols/PictureMarkerSymbol",
    "dojo/query",
    "esri/geometry/Point",
    "esri/geometry/webMercatorUtils",
    "esri/SpatialReference",
    "esri/InfoTemplate",
    "esri/dijit/Geocoder",
    "esri/dijit/Bookmarks",
    "dojo/keys"
],
function (
    ready,
    declare,
    lang,
    connect,
    array,
    arcgisUtils,
    IdentityManager,
    on, dom, domConstruct, Draw, GraphicsLayer, Graphic, SimpleFillSymbol, SimpleLineSymbol, Color, esriRequest, JSON, domStyle, domClass,
    number,
    BorderContainer, ContentPane,
    PictureMarkerSymbol,
    query,
    Point,
    webMercatorUtils,
    SpatialReference,
    InfoTemplate,
    Geocoder,
    Bookmarks,
    keys
) {
    return declare("", null, {
        config: {},
        constructor: function (config) {

            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information. 
            this.config = config;

            ready(lang.hitch(this, function () {


                var bc = new BorderContainer({}, dom.byId('bc'));

                // create a ContentPane as the left pane in the BorderContainer
                var cp1 = new ContentPane({
                    region: "top"
                }, dom.byId('cptop'));
                bc.addChild(cp1);

                // create a ContentPane as the center pane in the BorderContainer
                var cp2 = new ContentPane({
                    region: "center"
                }, dom.byId('cpcenter'));
                bc.addChild(cp2);

                bc.startup();


                this._createWebMap();
            }));
        },
        _hideLoading: function(){
            domStyle.set(dom.byId('loading'), 'display', 'none');
        },
        _showLoading: function(){
            domStyle.set(dom.byId('loading'), 'display', 'block');
        },
        // get data
        queryData: function (geometry) {
            var _self = this;
            _self._showLoading();
            // http://cholula.esri.com:6080/arcgis/rest/services/World/MapServer/exts/BAServer/Geoenrichment/enrich
            // http://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich
            esriRequest({
                url: 'http://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich',
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
                    "datacollections": JSON.stringify(["KeyUSFacts"]),
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
                load: function (data) {
                    var featureSet = data.results[0].value.FeatureSet[0];
                    _self.showData(featureSet);
                    _self._hideLoading();
                },
                error: function(error){
                    _self._hideLoading();
                }
            });
        },
        showData: function (fs) {

            var attributes = fs.features[0].attributes;

            var node;

            var AVGVAL_CY = number.format(attributes.AVGVAL_CY);
            node = dom.byId('AVGVAL_CY');
            if (node) {
                node.innerHTML = '<h2>$' + AVGVAL_CY + '</h2><p>2013 Average Home value</p>';
            }

            var TOTPOP_CY = number.format(attributes.TOTPOP_CY);
            node = dom.byId('TOTPOP_CY');
            if (node) {
                node.innerHTML = '<h2>' + TOTPOP_CY + '</h2><p>2013 Total Population</p>';
            }

            var TOTHH_CY = number.format(attributes.TOTHH_CY);
            node = dom.byId('TOTHH_CY');
            if (node) {
                node.innerHTML = '<h2>' + TOTHH_CY + '</h2><p>2013 Total Households</p>';
            }

            var totalHomeValue = number.format(attributes.AVGVAL_CY * attributes.TOTHH_CY);
            node = dom.byId('totalHomeValue');
            if (node) {
                node.innerHTML = '<h2>$' + totalHomeValue + '</h2><p>Total Home Value</p>';
            }

            
            domStyle.set(dom.byId('geoData'), 'display', 'block');

        },
        clearDraw: function () {
            var _self = this;
            if (_self._graphicsLayer) {
                _self._graphicsLayer.clear();
            }
        },
        // add drawed geometry to map
        addToMap: function (geometry) {
            var _self = this;
            _self._toolbar.deactivate();
            if (_self._graphicsLayer) {
                _self.clearDraw();
            } else {
                _self._graphicsLayer = new GraphicsLayer();
                _self.map.addLayer(_self._graphicsLayer);
            }
            if (geometry) {
                var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]));
                var graphic = new Graphic(geometry, symbol);
                _self._graphicsLayer.add(graphic);
                _self.queryData(geometry);
            }
            domStyle.set(dom.byId('clearButton'), 'display', 'block');
        },
        // create drawing toolbar
        createToolbar: function () {
            var _self = this;
            _self._toolbar = new Draw(_self.map);
            connect.connect(_self._toolbar, "onDrawEnd", function (geometry) {
                _self.addToMap(geometry);
            });
        },
        toggleDraw: function () {
            var _self = this;
            _self._toolbar.activate(Draw.POLYGON);
        },
        placeDrawButton: function () {
            var _self = this;
            var html = '<div class="draw" id="draw"><div id="drawButton">Draw Impact Area</div><div id="clearButton" style="display:none;">Clear Impact Area</div></div>';
            domConstruct.place(html, dom.byId('drawContainer'));
            // on toggle clicks
            on(dom.byId("drawContainer"), "#drawButton:click", function () {
                _self.toggleDraw();
            });
            // on toggle clicks
            on(dom.byId("drawContainer"), "#clearButton:click", function () {
                _self.clearDraw();
                domStyle.set(dom.byId('clearButton'), 'display', 'none');
                domStyle.set(dom.byId('geoData'), 'display', 'none');
            });
            _self.createToolbar();
            on(document, "keyup", function (evt) {
                if (evt.keyCode === keys.ESCAPE) {
                    _self._toolbar.deactivate();
                }
            });

        },
        _toggleBMList: function(){
            var _self = this;
            var node = dom.byId('bookmarks');
            var btn = dom.byId('bmToggle');
            var display = domStyle.get(node, 'display');
            if(display === 'block'){
                domStyle.set(node, 'display', 'none');
                domClass.remove(btn, 'open');
            }
            else{
                domStyle.set(node, 'display', 'block');
                domClass.add(btn, 'open');
            }
        },
        //create a map based on the input web map id
        _createWebMap: function () {
            var _self = this;
            arcgisUtils.createMap(this.config.webmap, "mapDiv", {
                mapOptions: {
                    //Optionally define additional map config here for example you can 
                    //turn the slider off, display info windows, disable wraparound 180, slider position and more. 
                },
                bingMapsKey: this.config.bingmapskey
            }).then(lang.hitch(this, function (response) {
                //Once the map is created we get access to the response which provides important info 
                //such as the map, operational layers, popup info and more. This object will also contain
                //any custom options you defined for the template. In this example that is the 'theme' property.
                //Here' we'll use it to update the application to match the specified color theme.  
                //console.log(this.config);

                this.map = response.map;

                console.log(response);

                var geocoder = new Geocoder({
                    map: this.map
                }, dom.byId("geocoder"));
                geocoder.startup();
                
                var bm = new Bookmarks({
                    map: this.map,
                    bookmarks: response.itemInfo.itemData.bookmarks
                }, dom.byId("bookmarks"));

                
                on(window, "resize", function(){
                   _self.map.resize(); 
                });
                
                on(dom.byId('bmToggle'), 'click', function(){
                    _self._toggleBMList();
                });

                esriRequest({
                    url: "http://www.digitalglobe.com/firstlookrss/events.rss",
                    handleAs: "xml"
                }).then(function (xml) {

                    
                    
                    
                    var items = query("item", xml);
                    array.forEach(items, function (item) {
                        var attributes = {};

                        var imageVal, image = query('image', item);
                        if (image && image[0] && image[0].firstChild) {
                            imageVal = image[0].firstChild.nodeValue;
                            attributes.image = imageVal;
                        }

                        var georssVal, georss = query('*|point', item);
                        if (georss && georss[0] && georss[0].firstChild) {
                            georssVal = georss[0].firstChild.nodeValue;
                        }
                        

                        var news_urlVal, news_url = query('news_url', item);
                        if (news_url && news_url[0] && news_url[0].firstChild) {
                            news_urlVal = news_url[0].firstChild.nodeValue;
                            attributes.news_url = news_urlVal;
                        }

                        var activeVal, active = query('active', item);
                        if (active && active[0] && active[0].firstChild) {
                            activeVal = active[0].firstChild.nodeValue;
                            attributes.active = activeVal;
                        }

                        var titleVal, title = query('title', item);
                        if (title && title[0] && title[0].firstChild) {
                            titleVal = title[0].firstChild.nodeValue;
                            attributes.title = titleVal;
                        }

                        var descriptionVal, description = query('description', item);
                        if (description && description[0] && description[0].firstChild) {
                            descriptionVal = description[0].firstChild.nodeValue;
                            attributes.description = descriptionVal;
                        }

                        var categoriesVal, categories = query('categories', item);
                        if (categories && categories[0] && categories[0].firstChild) {
                            categoriesVal = categories[0].firstChild.nodeValue;
                            attributes.categories = categoriesVal;
                        }


                        var eventDateVal, eventDate = query('eventDate', item);
                        if (eventDate && eventDate[0] && eventDate[0].firstChild) {
                            eventDateVal = eventDate[0].firstChild.nodeValue;
                            attributes.eventDate = eventDateVal;
                        }
                    


                        var geometry, pt;
                        if (georssVal) {
                            var split = georssVal.split(" ");
                            var y = parseFloat(split[0]);
                            var x = parseFloat(split[1]);
                            if(x && y){
                                pt = new Point(x, y, new SpatialReference({
                                    wkid: 4326
                                }));   
                            }
                            if (pt) {
                                geometry = webMercatorUtils.geographicToWebMercator(pt);
                            }
                        }

                        if (geometry) {
                            var symbol;
                            if(imageVal){
                                symbol = new PictureMarkerSymbol(imageVal, 32, 32);
                            }
                            else{
                                symbol = new PictureMarkerSymbol('http://utility.arcgis.com/sharing/rss?image=true', 18.75, 22.5);
                            }
                            var html = '';
                            html += '<p><strong><a href="${news_url}" target="_blank">${title}</a></strong></p>';
                            html += '<img width="100" height="75" src="${image}" />';
                            html += '<p>${description}</p>';
                            html += '<ul>';
                            html += '<li>${categories}</li>';
                            html += '<li>${eventDate}</li>';
                            html += '</ul>';

                            var infoTemplate = new InfoTemplate("${title}", html);

                            var graphic = new Graphic(geometry, symbol, attributes, infoTemplate);
                            if(graphic){
                                _self.map.graphics.add(graphic);   
                            }
                        }




                    });

                });




                if (this.map.loaded) {
                    this.placeDrawButton();
                } else {
                    on(this.map, "load", function () {
                        this.placeDrawButton();
                    });
                }

            }), lang.hitch(this, function (error) {
                //an error occurred - notify the user. In this example we pull the string from the 
                //resource.js file located in the nls folder because we've set the application up 
                //for localization. If you don't need to support mulitple languages you can hardcode the 
                //strings here and comment out the call in index.html to get the localization strings. 
                if (this.config && this.config.i18n) {
                    alert(this.config.i18n.map.error + ": " + error.message);
                } else {
                    alert("Unable to create map: " + error.message);
                }

            }));

        }
    });
});